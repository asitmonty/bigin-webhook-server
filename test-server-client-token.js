const axios = require('axios');

// Test Server-Client refresh token directly
async function testServerClientToken() {
  console.log('🧪 Testing Server-Client Refresh Token');
  console.log('======================================');
  
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
      console.log('✅ Server-Client refresh token is valid!');
      console.log('📥 Access token generated successfully');
      console.log('🔑 Access Token:', response.data.access_token);
      console.log('⏰ Expires In:', response.data.expires_in, 'seconds');
      
      // Test API call with the access token
      console.log('\n🧪 Testing API call with Server-Client token...');
      
      const apiUrl = "https://www.zohoapis.com/bigin/v2/Contacts?fields=id&per_page=1";
      const apiResponse = await axios.get(apiUrl, {
        headers: { 
          Authorization: `Zoho-oauthtoken ${response.data.access_token}`,
          "Content-Type": "application/json"
        },
      });
      
      console.log('✅ API call successful!');
      console.log('📊 API Response Status:', apiResponse.status);
      console.log('🚀 Server-Client mode is working!');
      
    } else {
      console.log('❌ No access token received');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Server-Client token test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n💡 Possible issues:');
      console.log('- Invalid refresh token');
      console.log('- Wrong client credentials');
      console.log('- Expired refresh token');
      console.log('- Incorrect redirect URI configuration');
    }
    
    if (error.response?.data?.error === 'Access Denied') {
      console.log('\n⏳ Rate limit hit - waiting 60 seconds...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      console.log('🔄 Retrying after rate limit...');
      // Could retry here if needed
    }
  }
}

testServerClientToken();
