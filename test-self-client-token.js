const axios = require('axios');

async function testSelfClientToken() {
  try {
    console.log('Testing Zoho Self-Client authentication...');
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      code: "1000.a3986e9f1bcbfeea19be1ca9610960f0.c24ccc5266584db97e54aaea99e238dd",
      client_id: "1000.8M3XLYNUNNOYDOW877VN684JN38XMS",
      client_secret: "ca6c3b8395c3c59f6e41f407fba2ffd89b6dbd6e21",
      grant_type: "authorization_code",
    });

    const res = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log('✅ Self-Client token successful:', res.data);
    return res.data.access_token;
  } catch (err) {
    console.error('❌ Self-Client token failed:', err.response?.data || err.message);
    throw err;
  }
}

testSelfClientToken().catch(console.error);
