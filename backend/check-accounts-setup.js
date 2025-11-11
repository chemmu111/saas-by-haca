#!/usr/bin/env node

/**
 * Script to check if Accounts OAuth is properly configured
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔍 Checking Accounts OAuth Configuration...\n');

const requiredVars = [
  { key: 'MONGODB_URI', name: 'MongoDB URI' },
  { key: 'JWT_SECRET', name: 'JWT Secret' },
  { key: 'OAUTH_REDIRECT_BASE', name: 'OAuth Redirect Base URL' },
  { key: 'TOKEN_ENCRYPTION_KEY', name: 'Token Encryption Key' },
];

const oauthVars = [
  { key: 'META_APP_ID', name: 'Meta App ID' },
  { key: 'META_APP_SECRET', name: 'Meta App Secret' },
  { key: 'LINKEDIN_CLIENT_ID', name: 'LinkedIn Client ID' },
  { key: 'LINKEDIN_CLIENT_SECRET', name: 'LinkedIn Client Secret' },
  { key: 'X_CLIENT_ID', name: 'X Client ID' },
  { key: 'X_CLIENT_SECRET', name: 'X Client Secret' },
];

let allGood = true;

console.log('📋 Required Variables:');
requiredVars.forEach(({ key, name }) => {
  const value = process.env[key];
  if (value) {
    const displayValue = key === 'TOKEN_ENCRYPTION_KEY' 
      ? `${value.substring(0, 10)}... (${value.length} chars)`
      : value.length > 50 
        ? `${value.substring(0, 50)}...`
        : value;
    console.log(`  ✅ ${name}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${name}: NOT SET`);
    allGood = false;
  }
});

console.log('\n🔐 OAuth Provider Variables (at least one provider should be configured):');
let hasProvider = false;
oauthVars.forEach(({ key, name }) => {
  const value = process.env[key];
  if (value) {
    console.log(`  ✅ ${name}: ${value.substring(0, 10)}...`);
    hasProvider = true;
  } else {
    console.log(`  ⚠️  ${name}: NOT SET`);
  }
});

if (!hasProvider) {
  console.log('\n⚠️  Warning: No OAuth provider is configured. You need to set at least one provider\'s credentials.');
  allGood = false;
}

console.log('\n📝 Configuration Check:');
if (allGood && hasProvider) {
  console.log('  ✅ All required variables are set!');
  console.log('\n🚀 Next steps:');
  console.log('  1. Make sure your backend server is running: npm run dev');
  console.log('  2. Visit /dashboard/clients to connect accounts');
  console.log('  3. Add redirect URIs in provider dashboards:');
  const redirectBase = process.env.OAUTH_REDIRECT_BASE || 'http://localhost:5000';
  console.log(`     - Meta: ${redirectBase}/oauth/callback/meta`);
  console.log(`     - LinkedIn: ${redirectBase}/oauth/callback/linkedin`);
  console.log(`     - X: ${redirectBase}/oauth/callback/x`);
} else {
  console.log('  ❌ Some required variables are missing!');
  console.log('\n📖 See ACCOUNTS_SETUP.md for detailed setup instructions.');
}

