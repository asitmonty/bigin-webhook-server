const axios = require("axios");

async function sendDealToZohoBigin(data) {
  try {
    // Lazily require to avoid circular dependency on module load
    const { refreshAccessToken } = require('./zoho');
    const token = await refreshAccessToken();

    const url = "https://www.zohoapis.com/bigin/v2/Pipelines";

    const dealData = {
      Deal_Name: data.Deal_Name || data.deal_name || "New Deal",
      Contact_Name: data.Contact_Name || data.contact_id,
      Sub_Pipeline: data.Sub_Pipeline || "PVE License User Pipeline",
      Stage: data.Stage || data.stage || "Enquiry",
      Closing_Date: data.Closing_Date || data.closing_date || new Date().toISOString().split('T')[0]
    };

    const payload = { data: [dealData] };
    console.log("💰 Sending deal to Zoho Bigin:", JSON.stringify(payload, null, 2));

    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
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

    if (err.response?.status === 401) {
      console.log("🔁 Token expired — refreshing and retrying...");
      const { refreshAccessToken } = require('./zoho');
      await refreshAccessToken();
      return sendDealToZohoBigin(data);
    }

    if (err.response?.status === 429 ||
        (err.response?.data?.code === 'INVALID_TOKEN' &&
         err.response?.data?.message?.includes('too many requests'))) {
      console.log("⏳ Rate limit hit, waiting 60 seconds...");
      await new Promise(resolve => setTimeout(resolve, 60000));
      return sendDealToZohoBigin(data);
    }

    return {
      success: false,
      error: err.response?.data || err.message,
      message: "Failed to create deal in Zoho Bigin"
    };
  }
}

module.exports = { sendDealToZohoBigin };
