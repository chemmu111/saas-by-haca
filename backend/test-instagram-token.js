/**
 * Test script to verify Instagram Access Token
 * Run with: node test-instagram-token.js
 */

const token = 'IGAAKZCUS3XHJRBZAFMtbUlGbGJSY1dzYmlVVVY0cHFhdXMxbXhlcVVaSHR4OVJIVVZAGWloxdUlYcWN3TzFIWWNCWkpsYjN0UlhZAa2pDX0xjRkloOVFwbFk3aXdIV1pGN3JaT2h4QjBaUVJ1OU9qdG9aMHgzVTFpOW9aT2dEUUVxQQZDZD';

async function testInstagramToken() {
  try {
    console.log('🧪 Testing Instagram Access Token...\n');
    
    // First, try to get user info using Instagram Basic Display API
    console.log('📱 Attempting to get user info from token...');
    const userInfoUrl = `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${token}`;
    
    const response = await fetch(userInfoUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const userInfo = await response.json();
      console.log('✅ Token is valid!');
      console.log('📊 User Info:');
      console.log('  ID:', userInfo.id);
      console.log('  Username:', userInfo.username);
      console.log('  Account Type:', userInfo.account_type);
      console.log('  Profile URL: https://instagram.com/' + userInfo.username);
      return true;
    } else {
      const errorData = await response.json();
      console.log('❌ Token validation failed:');
      console.log('  Error:', errorData.error || errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing token:', error.message);
    return false;
  }
}

// Run the test
testInstagramToken().then(success => {
  if (success) {
    console.log('\n✅ Token test completed successfully!');
  } else {
    console.log('\n❌ Token test failed. The token may be invalid or expired.');
  }
  process.exit(success ? 0 : 1);
});

