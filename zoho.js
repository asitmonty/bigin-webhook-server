const axios = require("axios");
require("dotenv").config();

let accessToken = null;

async function refreshAccessToken() {
  const url = "https://accounts.zoho.in/oauth/v2/token";
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: "refresh_token",
  });

  const res = await axios.post(url, params);
  accessToken = res.data.access_token;
  console.log("🔄 Zoho token refreshed");
  return accessToken;
}

async function sendToZohoBigin(data) {
  if (!accessToken) await refreshAccessToken();

  try {
    const url = "https://www.zohoapis.in/bigin/v2/Leads";
    const payload = { data: [data] };

    const res = await axios.post(url, payload, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    console.log("✅ Sent to Zoho:", res.data);
  } catch (err) {
    console.error("❌ Zoho API Error:", err.response?.data || err.message);

    if (err.response?.status === 401) {
      await refreshAccessToken();
      return sendToZohoBigin(data);
    }
  }
}

module.exports = { sendToZohoBigin };
