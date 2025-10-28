const axios = require("axios");
require("dotenv").config();

let accessToken = null;

// ✅ Refresh token (Zoho .com region)
async function refreshAccessToken() {
  try {
    console.log("🔁 Refreshing Zoho token...");
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    });

    const res = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    accessToken = res.data.access_token;
    console.log("✅ Zoho access token refreshed successfully.");
    return accessToken;
  } catch (err) {
    console.error("❌ Token refresh failed:", err.response?.data || err.message);
    throw err;
  }
}

// ✅ Send lead to Zoho Bigin (US region)
async function sendToZohoBigin(data) {
  try {
    if (!accessToken) await refreshAccessToken();

    const url = "https://www.zohoapis.com/bigin/v2/Contacts";
    const payload = { data: [data] };

    console.log("📤 Sending payload to Zoho Bigin:", JSON.stringify(payload, null, 2));

    const res = await axios.post(url, payload, {
      headers: { 
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
    });

    console.log("✅ Zoho Bigin API response:");
    console.dir(res.data, { depth: null });
    
    return {
      success: true,
      data: res.data,
      message: "Lead successfully created in Zoho Bigin"
    };
  } catch (err) {
    console.error("❌ Zoho Bigin API error:", err.response?.data || err.message);

    if (err.response?.status === 401) {
      console.log("🔁 Token expired — refreshing and retrying...");
      await refreshAccessToken();
      return sendToZohoBigin(data);
    }

    return {
      success: false,
      error: err.response?.data || err.message,
      message: "Failed to create lead in Zoho Bigin"
    };
  }
}

// ✅ Process and route data to Zoho Bigin
async function processAndRouteData(processedData, options = {}) {
  const results = {
    zohoBigin: null,
    timestamp: new Date().toISOString()
  };

  // Send to Zoho Bigin (always enabled for standalone webhook)
  try {
    results.zohoBigin = await sendToZohoBigin(processedData);
  } catch (error) {
    results.zohoBigin = {
      success: false,
      error: error.message,
      message: "Failed to send to Zoho Bigin"
    };
  }

  return results;
}

module.exports = { 
  sendToZohoBigin, 
  processAndRouteData,
  refreshAccessToken 
};
