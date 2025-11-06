import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 * Must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey() {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
  }
  
  // If key is hex string, convert to buffer
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Otherwise, derive key using PBKDF2
  const salt = Buffer.from(key.substring(0, SALT_LENGTH), 'hex');
  return crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt a token using AES-256-GCM
 * @param {string} text - Plain text token to encrypt
 * @returns {string} - Encrypted token in format: iv:authTag:encryptedData (all base64)
 */
export function encryptToken(text) {
  if (!text) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:encryptedData
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt a token using AES-256-GCM
 * @param {string} encryptedText - Encrypted token in format: iv:authTag:encryptedData
 * @returns {string} - Decrypted plain text token
 */
export function decryptToken(encryptedText) {
  if (!encryptedText) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }
    
    const [ivBase64, authTagBase64, encrypted] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Generate a secure random state token for OAuth
 * @returns {string} - Random hex string
 */
export function generateStateToken() {
  return crypto.randomBytes(32).toString('hex');
}

