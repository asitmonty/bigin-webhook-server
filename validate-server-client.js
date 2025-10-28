const axios = require('axios');

// Simple Server-Client token validation
async function validateServerClientToken() {
  console.log('🔍 Validating Server-Client Token');
  console.log('=================================');
  
  const clientId = '1000.YGDJ730H28KEGG5PU7O9NFKY5BQWTN';
  const clientSecret = '399a8ff39ae8ca478c91b8d71466aae422d60e1e72';
  const refreshToken = '1000.dd84c2eb3b72ec3dfd9ef4f1ca28565a.12c29bbca3b8ab2cca968c88b5efd42a';
  
  try {
    console.log('🔑 Testing Server-Client refresh token...');
    
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
      console.log('✅ Server-Client refresh token is VALID!');
      console.log('🔑 Access Token:', response.data.access_token.substring(0, 20) + '...');
      console.log('⏰ Expires In:', response.data.expires_in, 'seconds');
      
      return response.data.access_token;
    } else {
      console.log('❌ No access token received');
      console.log('Response:', response.data);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Server-Client token validation failed:');
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.data?.error === 'Access Denied') {
      console.log('\n💡 Rate limit issue - the token might be valid but we need to wait');
      console.log('⏳ Wait 1-2 hours for rate limits to clear, then test again');
    } else if (error.response?.data?.error === 'invalid_grant') {
      console.log('\n💡 Invalid refresh token - needs to be regenerated');
      console.log('🔄 Use the authorization URL to get a new refresh token');
    }
    
    return null;
  }
}

// Test a simple API call if token is valid
async function testSimpleAPICall(accessToken) {
  if (!accessToken) return;
  
  try {
    console.log('\n🧪 Testing simple API call...');
    
    const apiUrl = "https://www.zohoapis.com/bigin/v2/Contacts?fields=id&per_page=1";
    const apiResponse = await axios.get(apiUrl, {
      headers: { 
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
    });
    
    console.log('✅ API call successful!');
    console.log('📊 Status:', apiResponse.status);
    console.log('🚀 Server-Client mode is working!');
    
  } catch (error) {
    console.error('❌ API call failed:', error.response?.data || error.message);
  }
}

// Main execution
async function main() {
  const accessToken = await validateServerClientToken();
  if (accessToken) {
    await testSimpleAPICall(accessToken);
  }
}

main();
