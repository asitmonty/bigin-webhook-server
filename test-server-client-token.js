const axios = require('axios');

async function testServerClientToken() {
  try {
    console.log('Testing Zoho Server-Client authentication...');
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      refresh_token: "1000.0f83f3f55b2a6621be65dfd126620722.f32011697ca96b039f7ec6f1575a5e9f",
      client_id: "1000.8M3XLYNUNNOYDOW877VN684JN38XMS",
      client_secret: "ca6c3b8395c3c59f6e41f407fba2ffd89b6dbd6e21",
      grant_type: "refresh_token",
    });

    const res = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log('✅ Server-Client token successful:', res.data);
    return res.data.access_token;
  } catch (err) {
    console.error('❌ Server-Client token failed:', err.response?.data || err.message);
    throw err;
  }
}

testServerClientToken().catch(console.error);
