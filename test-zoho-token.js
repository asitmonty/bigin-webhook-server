const axios = require('axios');

async function testZohoToken() {
  try {
    console.log('Testing Zoho token refresh...');
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      refresh_token: "1000.3bcebafa95d70a482fdb1c3bea41f6f0.eb10578a5570bdcc8b8516bb270d74d5",
      client_id: "1000.YGDJ730H28KEGG5PU7O9NFKY5BQWTN",
      client_secret: "399a8ff39ae8ca478c91b8d71466aae422d60e1e72",
      grant_type: "refresh_token",
    });

    const res = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log('✅ Token refresh successful:', res.data);
    return res.data.access_token;
  } catch (err) {
    console.error('❌ Token refresh failed:', err.response?.data || err.message);
    throw err;
  }
}

testZohoToken().catch(console.error);
