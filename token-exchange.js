const axios = require('axios');

// Server-Client Token Exchange Script
// ==================================
// Use this script to exchange Server-Client authorization code for refresh token

async function exchangeServerClientCode() {
  console.log('🔄 Server-Client Token Exchange');
  console.log('==============================');
  
  // Server-Client credentials
  const clientId = '1000.YGDJ730H28KEGG5PU7O9NFKY5BQWTN';
  const clientSecret = '399a8ff39ae8ca478c91b8d71466aae422d60e1e72';
  
  // You need to provide the authorization code from Zoho
  const authCode = 'YOUR_AUTHORIZATION_CODE_HERE'; // Replace with actual code
  
  console.log('📋 Server-Client Credentials:');
  console.log('Client ID:', clientId);
  console.log('Client Secret:', clientSecret);
  console.log('Auth Code:', authCode);
  
  if (authCode === 'YOUR_AUTHORIZATION_CODE_HERE') {
    console.log('\n❌ Please provide a valid authorization code');
    console.log('To get an authorization code:');
    console.log('1. Go to https://api-console.zoho.com/');
    console.log('2. Select your Server-Client app');
    console.log('3. Generate authorization code');
    console.log('4. Replace YOUR_AUTHORIZATION_CODE_HERE with the actual code');
    return;
  }
  
  try {
    console.log('\n🔄 Exchanging authorization code for tokens...');
    
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: "https://your-redirect-uri.com", // Replace with your actual redirect URI
      code: authCode
    });

    const response = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log('✅ Token exchange successful!');
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.refresh_token) {
      console.log('\n📝 Update your credentials file with:');
      console.log(`SERVER_CLIENT_REFRESH_TOKEN=${response.data.refresh_token}`);
      
      console.log('\n📝 Update your .env file with:');
      console.log(`ZOHO_CLIENT_ID=${clientId}`);
      console.log(`ZOHO_CLIENT_SECRET=${clientSecret}`);
      console.log(`ZOHO_REFRESH_TOKEN=${response.data.refresh_token}`);
    }
    
  } catch (error) {
    console.error('❌ Token exchange failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n💡 Common issues:');
      console.log('- Invalid authorization code');
      console.log('- Wrong redirect URI');
      console.log('- Expired authorization code');
      console.log('- Incorrect client credentials');
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
console.log('1. Server-Client mode (recommended for production)');
console.log('2. Self-Client mode (current working mode)');
console.log('');

// Uncomment the function you want to use:
// exchangeServerClientCode();
// exchangeSelfClientCode();

console.log('💡 To use this script:');
console.log('1. Uncomment the function you want to use');
console.log('2. Replace YOUR_AUTHORIZATION_CODE_HERE with actual code');
console.log('3. Update redirect_uri if needed');
console.log('4. Run: node token-exchange.js');
