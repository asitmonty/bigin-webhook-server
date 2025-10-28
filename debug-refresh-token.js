const axios = require('axios');
require('dotenv').config();

async function debugRefreshToken() {
  console.log('🔍 Debugging Zoho Refresh Token Response...');
  
  try {
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    });

    console.log('📤 Request URL:', url);
    console.log('📤 Request params:', params.toString());

    const res = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log('📥 Response status:', res.status);
    console.log('📥 Response headers:', res.headers);
    console.log('📥 Response data:', JSON.stringify(res.data, null, 2));
    
    if (res.data.access_token) {
      console.log('✅ Access token found!');
      
      // Test with a simple API call
      console.log('\n🧪 Testing with Zoho Bigin API...');
      const testUrl = "https://www.zohoapis.com/bigin/v2/Contacts";
      const testRes = await axios.get(testUrl, {
        headers: { 
          Authorization: `Zoho-oauthtoken ${res.data.access_token}`,
          "Content-Type": "application/json"
        },
      });
      
      console.log('✅ API test successful!');
      console.log('Status:', testRes.status);
      
    } else {
      console.log('❌ No access token in response');
      console.log('Available fields:', Object.keys(res.data));
    }
    
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Headers:', err.response.headers);
    }
  }
}

debugRefreshToken();
