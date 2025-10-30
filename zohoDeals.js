const axios = require("axios");
const { refreshAccessToken } = require('./zoho');

let accessToken = null;

async function sendDealToZohoBigin(data) {
  try {
    // Token check and preparation
    if (!accessToken) await refreshAccessToken();
    const url = "https://www.zohoapis.com/bigin/v2/Pipelines";
    const dealData = {
      Deal_Name: data.Deal_Name || data.deal_name || "New Deal",
      Contact_Name: data.Contact_Name || data.contact_id,
      Sub_Pipeline: data.Sub_Pipeline || "PVE License User Pipeline",
      Stage: data.Stage || data.stage || "Enquiry",
      Closing_Date: data.Closing_Date || data.closing_date // Provide a default if needed
    };
    const payload = { data: [dealData] };
    console.log("💰 Sending deal to Zoho Bigin:", JSON.stringify(payload, null, 2));
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
    });
    console.log("✅ Zoho Bigin Deal API response:");
    console.dir(res.data, { depth: null });
    return {
      success: true,
      data: res.data,
      message: "Deal successfully created in Zoho Bigin"
    };
  } catch (err) {
    console.error("❌ Zoho Bigin Deal API error:", err.response?.data || err.message);
    // Token refresh
    if (err.response?.status === 401) {
      console.log("🔁 Token expired — refreshing and retrying...");
      await refreshAccessToken();
      return sendDealToZohoBigin(data);
    }
    // Duplicate -> upsert
    const duplicateCode = err.response?.data?.data?.[0]?.code;
    const duplicateMsg = err.response?.data?.data?.[0]?.message;
    if (duplicateCode === 'DUPLICATE_DATA' || (typeof duplicateMsg === 'string' && duplicateMsg.toLowerCase().includes('duplicate'))) {
      try {
        console.log('🔁 Duplicate deal detected. Upsert simulated. (implement as needed)');
        return { success: true, data: {}, message: 'Deal upsert simulated (duplicate)' };
      } catch (lookupErr) {
        console.error('❌ Deal upsert failed:', lookupErr.response?.data || lookupErr.message);
      }
    }
    return {
      success: false,
      error: err.response?.data || err.message,
      message: "Failed to create deal in Zoho Bigin"
    };
  }
}

module.exports = { sendDealToZohoBigin };
