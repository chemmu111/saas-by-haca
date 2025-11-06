import SocialAccount from '../models/SocialAccount.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import { exchangeCodeForToken, fetchUserProfile, refreshAccessToken } from '../utils/oauthProviders.js';

// Simple in-memory state store (for development)
// In production, use Redis
const stateStore = new Map();

/**
 * Store OAuth state temporarily
 */
export function storeState(state, userId, provider) {
  stateStore.set(`state:${state}`, { userId, provider, createdAt: Date.now() });
  
  // Auto-cleanup after 10 minutes
  setTimeout(() => {
    stateStore.delete(`state:${state}`);
  }, 10 * 60 * 1000);
}

/**
 * Retrieve and validate OAuth state
 */
export function getState(state) {
  const stored = stateStore.get(`state:${state}`);
  if (!stored) {
    return null;
  }
  
  // Check if expired (10 minutes)
  if (Date.now() - stored.createdAt > 10 * 60 * 1000) {
    stateStore.delete(`state:${state}`);
    return null;
  }
  
  // Delete after use (one-time use)
  stateStore.delete(`state:${state}`);
  return stored;
}

/**
 * Connect a social account after OAuth callback
 */
export async function connectAccount(userId, provider, code) {
  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(provider, code);
    
    // Fetch user profile
    const profile = await fetchUserProfile(provider, tokenData.accessToken);
    
    // Encrypt tokens
    const accessTokenEncrypted = encryptToken(tokenData.accessToken);
    const refreshTokenEncrypted = tokenData.refreshToken 
      ? encryptToken(tokenData.refreshToken) 
      : null;
    
    // Calculate expiration
    const expiresAt = tokenData.expiresIn 
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null;
    
    // Find or create social account
    const existingAccount = await SocialAccount.findOne({
      userId,
      provider,
      providerAccountId: profile.providerAccountId
    });
    
    if (existingAccount) {
      // Update existing account
      existingAccount.accountName = profile.accountName;
      existingAccount.accessTokenEncrypted = accessTokenEncrypted;
      existingAccount.refreshTokenEncrypted = refreshTokenEncrypted;
      existingAccount.expiresAt = expiresAt;
      existingAccount.lastSyncAt = new Date();
      existingAccount.meta = profile.meta || {};
      existingAccount.isActive = true;
      await existingAccount.save();
      
      return existingAccount;
    } else {
      // Create new account
      const socialAccount = new SocialAccount({
        userId,
        provider,
        providerAccountId: profile.providerAccountId,
        accountName: profile.accountName,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt,
        scopes: [], // Will be populated from OAuth response if available
        lastSyncAt: new Date(),
        meta: profile.meta || {}
      });
      
      await socialAccount.save();
      return socialAccount;
    }
  } catch (error) {
    console.error('Error connecting account:', error);
    throw error;
  }
}

/**
 * List user's connected accounts
 */
export async function listAccounts(userId) {
  const accounts = await SocialAccount.find({
    userId,
    isActive: true
  }).sort({ connectedAt: -1 });
  
  return accounts.map(account => ({
    _id: account._id,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    accountName: account.accountName,
    scopes: account.scopes,
    connectedAt: account.connectedAt,
    lastSyncAt: account.lastSyncAt,
    expiresAt: account.expiresAt,
    meta: account.meta,
    requiresManualSetup: account.requiresManualSetup,
    isExpired: account.expiresAt ? account.expiresAt < new Date() : false
  }));
}

/**
 * Refresh access token for an account
 */
export async function refreshAccountToken(userId, accountId) {
  const account = await SocialAccount.findOne({
    _id: accountId,
    userId,
    isActive: true
  });
  
  if (!account) {
    throw new Error('Account not found');
  }
  
  if (!account.refreshTokenEncrypted) {
    throw new Error('No refresh token available for this account');
  }
  
  try {
    // Decrypt refresh token
    const refreshToken = decryptToken(account.refreshTokenEncrypted);
    
    // Refresh token
    const tokenData = await refreshAccessToken(account.provider, refreshToken);
    
    // Encrypt new tokens
    const accessTokenEncrypted = encryptToken(tokenData.accessToken);
    const refreshTokenEncrypted = tokenData.refreshToken 
      ? encryptToken(tokenData.refreshToken)
      : account.refreshTokenEncrypted; // Keep existing if no new refresh token
    
    // Update account
    account.accessTokenEncrypted = accessTokenEncrypted;
    account.refreshTokenEncrypted = refreshTokenEncrypted;
    if (tokenData.expiresIn) {
      account.expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);
    }
    account.lastSyncAt = new Date();
    await account.save();
    
    return account;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

/**
 * Disconnect a social account
 */
export async function disconnectAccount(userId, accountId) {
  const account = await SocialAccount.findOne({
    _id: accountId,
    userId,
    isActive: true
  });
  
  if (!account) {
    throw new Error('Account not found');
  }
  
  // Mark as inactive instead of deleting (for audit trail)
  account.isActive = false;
  await account.save();
  
  // TODO: Revoke tokens via provider API if supported
  
  return account;
}

/**
 * Get decrypted access token for API calls (internal use only)
 */
export async function getDecryptedToken(userId, accountId) {
  const account = await SocialAccount.findOne({
    _id: accountId,
    userId,
    isActive: true
  });
  
  if (!account) {
    throw new Error('Account not found');
  }
  
  // Check if expired
  if (account.expiresAt && account.expiresAt < new Date()) {
    // Try to refresh if refresh token available
    if (account.refreshTokenEncrypted) {
      await refreshAccountToken(userId, accountId);
      // Reload account
      const refreshed = await SocialAccount.findById(accountId);
      return decryptToken(refreshed.accessTokenEncrypted);
    } else {
      throw new Error('Token expired and no refresh token available');
    }
  }
  
  return decryptToken(account.accessTokenEncrypted);
}

