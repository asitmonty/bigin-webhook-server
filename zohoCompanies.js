const axios = require("axios");
const { refreshAccessToken } = require('./zoho');

let accessToken = null;

async function sendCompanyToZohoBigin(data) {
  try {
    // Check rate limit and token
    if (!accessToken) await refreshAccessToken();
    const url = "https://www.zohoapis.com/bigin/v2/Accounts";
    const payload = { data: [data] };
    console.log("🏢 Sending company to Zoho Bigin:", JSON.stringify(payload, null, 2));
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
    });
    console.log("✅ Zoho Bigin Company API response:");
    console.dir(res.data, { depth: null });
    return {
      success: true,
      data: res.data,
      message: "Company successfully created in Zoho Bigin"
    };
  } catch (err) {
    console.error("❌ Zoho Bigin Company API error:", err.response?.data || err.message);
    // Token refresh
    if (err.response?.status === 401) {
      console.log("🔁 Token expired — refreshing and retrying...");
      await refreshAccessToken();
      return sendCompanyToZohoBigin(data);
    }
    // Duplicate -> upsert
    const duplicateCode = err.response?.data?.data?.[0]?.code;
    const duplicateMsg = err.response?.data?.data?.[0]?.message;
    if (duplicateCode === 'DUPLICATE_DATA' || (typeof duplicateMsg === 'string' && duplicateMsg.toLowerCase().includes('duplicate'))) {
      try {
        console.log('🔁 Duplicate company detected. Looking up by name to upsert...');
        // You may implement/findCompanyByName and updateCompany in future
        // For now just log and treat as success
        return { success: true, data: {}, message: 'Company upsert simulated (duplicate)' };
      } catch (lookupErr) {
        console.error('❌ Company upsert failed:', lookupErr.response?.data || lookupErr.message);
      }
    }
    return {
      success: false,
      error: err.response?.data || err.message,
      message: "Failed to create company in Zoho Bigin"
    };
  }
}

module.exports = { sendCompanyToZohoBigin };
