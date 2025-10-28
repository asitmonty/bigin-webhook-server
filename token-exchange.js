const axios = require('axios');

// Server-Client Token Exchange Script
// ==================================
// Server-Client mode generates refresh token directly from URL

async function exchangeServerClientToken() {
  console.log('🔄 Server-Client Token Exchange');
  console.log('==============================');
  
  // Server-Client credentials
  const clientId = '1000.YGDJ730H28KEGG5PU7O9NFKY5BQWTN';
  const clientSecret = '399a8ff39ae8ca478c91b8d71466aae422d60e1e72';
  
  console.log('📋 Server-Client Credentials:');
  console.log('Client ID:', clientId);
  console.log('Client Secret:', clientSecret);
  
  console.log('\n🌐 To get Server-Client refresh token:');
  console.log('1. Go to https://api-console.zoho.com/');
  console.log('2. Select your Server-Client app');
  console.log('3. Click "Generate Refresh Token"');
  console.log('4. Provide the redirect URL when prompted');
  console.log('5. Copy the generated refresh token');
  console.log('6. Update zoho-credentials.txt with the token');
  
  console.log('\n📝 Once you have the refresh token, update:');
  console.log('zoho-credentials.txt: SERVER_CLIENT_REFRESH_TOKEN=your_token_here');
  console.log('Then run: node switch-mode.js server');
  
  // Test the refresh token if provided
  const testRefreshToken = process.argv[2];
  if (testRefreshToken && testRefreshToken !== 'YOUR_REFRESH_TOKEN_HERE') {
    console.log('\n🧪 Testing provided refresh token...');
    await testRefreshTokenValidity(testRefreshToken, clientId, clientSecret);
  }
}

async function testRefreshTokenValidity(refreshToken, clientId, clientSecret) {
  try {
    console.log('🔑 Testing refresh token validity...');
    
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    });

    const response = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (response.data.access_token) {
      console.log('✅ Refresh token is valid!');
      console.log('📥 Access token generated successfully');
      console.log('🚀 Server-Client mode is ready to use');
      
      console.log('\n📝 Update your credentials:');
      console.log(`SERVER_CLIENT_REFRESH_TOKEN=${refreshToken}`);
    }
    
  } catch (error) {
    console.error('❌ Refresh token test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n💡 Common issues:');
      console.log('- Invalid refresh token');
      console.log('- Wrong client credentials');
      console.log('- Expired refresh token');
      console.log('- Incorrect redirect URI configuration');
    }
  }
}

// Self-Client Token Exchange (for reference)
async function exchangeSelfClientCode() {
  console.log('🔄 Self-Client Token Exchange');
  console.log('=============================');
  
  const clientId = '1000.8M3XLYNUNNOYDOW877VN684JN38XMS';
  const clientSecret = 'ca6c3b8395c3c59f6e41f407fba2ffd89b6dbd6e21';
  const selfClientCode = 'YOUR_SELF_CLIENT_CODE_HERE'; // Replace with actual code
  
  if (selfClientCode === 'YOUR_SELF_CLIENT_CODE_HERE') {
    console.log('❌ Please provide a valid Self-Client code');
    return;
  }
  
  try {
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: "https://www.zoho.com/books",
      code: selfClientCode
    });

    const response = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log('✅ Self-Client token exchange successful!');
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Self-Client token exchange failed:', error.response?.data || error.message);
  }
}

// Main execution
console.log('🔐 Zoho API Token Exchange Tool');
console.log('==============================');
console.log('1. Server-Client mode (generates refresh token directly)');
console.log('2. Self-Client mode (uses authorization code)');
console.log('');

// Uncomment the function you want to use:
exchangeServerClientToken();
// exchangeSelfClientCode();

console.log('\n💡 Usage:');
console.log('  node token-exchange.js                    # Show instructions');
console.log('  node token-exchange.js YOUR_REFRESH_TOKEN # Test refresh token');
