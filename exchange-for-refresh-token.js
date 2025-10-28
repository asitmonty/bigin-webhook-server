const axios = require('axios');

// Exchange Self-Client code for refresh token
async function exchangeForRefreshToken() {
  console.log('🔄 Exchanging Self-Client Code for Refresh Token');
  console.log('===============================================');
  
  const selfClientCode = '1000.6360fea5569b050a60a173aeac2e8933.2743d929c62f70c40f00ab016f77193c';
  const clientId = '1000.8M3XLYNUNNOYDOW877VN684JN38XMS';
  const clientSecret = 'ca6c3b8395c3c59f6e41f407fba2ffd89b6dbd6e21';
  
  try {
    console.log('🔄 Exchanging code for tokens...');
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      code: selfClientCode,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
    });

    const res = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log('📥 Response:', JSON.stringify(res.data, null, 2));
    
    if (res.data.access_token && res.data.refresh_token) {
      console.log('\n✅ Token exchange successful!');
      console.log('📋 Access Token:', res.data.access_token);
      console.log('🔄 Refresh Token:', res.data.refresh_token);
      console.log('⏰ Expires In:', res.data.expires_in, 'seconds');
      
      // Test the refresh token
      console.log('\n🧪 Testing refresh token...');
      const refreshParams = new URLSearchParams({
        refresh_token: res.data.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      });

      const refreshRes = await axios.post(url, refreshParams.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      console.log('📥 Refresh Response:', JSON.stringify(refreshRes.data, null, 2));
      
      if (refreshRes.data.access_token) {
        console.log('\n🎉 Refresh token is working!');
        console.log('📝 Update your .env file with:');
        console.log(`ZOHO_CLIENT_ID=${clientId}`);
        console.log(`ZOHO_CLIENT_SECRET=${clientSecret}`);
        console.log(`ZOHO_REFRESH_TOKEN=${res.data.refresh_token}`);
        
        // Test the API
        console.log('\n🧪 Testing Zoho Bigin API...');
        const testUrl = "https://www.zohoapis.com/bigin/v2/Contacts?fields=Last_Name,Email&per_page=1";
        const testRes = await axios.get(testUrl, {
          headers: { 
            Authorization: `Zoho-oauthtoken ${refreshRes.data.access_token}`,
            "Content-Type": "application/json"
          },
        });
        
        console.log('✅ API test successful!');
        console.log('Status:', testRes.status);
        
      } else {
        console.log('❌ Refresh token test failed');
      }
      
    } else {
      console.log('❌ No tokens in response');
      console.log('Available fields:', Object.keys(res.data));
    }
    
  } catch (err) {
    console.error('❌ Token exchange failed!');
    console.error('Status:', err.response?.status);
    console.error('Error:', err.response?.data || err.message);
  }
}

exchangeForRefreshToken();
