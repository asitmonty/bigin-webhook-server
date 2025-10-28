const axios = require("axios");
require("dotenv").config();

let accessToken = null;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequestsPerMinute: 10, // Zoho Bigin allows ~10 requests per minute
  requests: [],
  isRateLimited: false
};

// Rate limiting helper functions
function isRateLimited() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Remove requests older than 1 minute
  RATE_LIMIT_CONFIG.requests = RATE_LIMIT_CONFIG.requests.filter(time => time > oneMinuteAgo);
  
  // Check if we've exceeded the limit
  if (RATE_LIMIT_CONFIG.requests.length >= RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
    RATE_LIMIT_CONFIG.isRateLimited = true;
    return true;
  }
  
  RATE_LIMIT_CONFIG.isRateLimited = false;
  return false;
}

function recordRequest() {
  RATE_LIMIT_CONFIG.requests.push(Date.now());
}

async function waitForRateLimit() {
  if (RATE_LIMIT_CONFIG.isRateLimited) {
    const oldestRequest = Math.min(...RATE_LIMIT_CONFIG.requests);
    const waitTime = 60000 - (Date.now() - oldestRequest) + 1000; // Add 1 second buffer
    
    if (waitTime > 0) {
      console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime/1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// ✅ Self-Client authentication (no refresh token needed)
async function getAccessToken() {
  try {
    console.log("🔑 Getting Zoho access token via Self-Client...");
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      code: process.env.ZOHO_SELF_CLIENT_CODE,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      grant_type: "authorization_code",
    });

    const res = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    accessToken = res.data.access_token;
    console.log("✅ Zoho access token obtained successfully.");
    return accessToken;
  } catch (err) {
    console.error("❌ Self-Client token failed:", err.response?.data || err.message);
    throw err;
  }
}

// ✅ Refresh token (Zoho .com region) - Server-Client mode
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
    
    // Handle rate limiting
    if (err.response?.data?.error === 'Access Denied' && 
        err.response?.data?.error_description?.includes('too many requests')) {
      console.log("⏳ Rate limit hit, waiting 60 seconds...");
      await new Promise(resolve => setTimeout(resolve, 60000));
      return refreshAccessToken(); // Retry after waiting
    }
    
    throw err;
  }
}

// ✅ Send lead to Zoho Bigin (US region)
async function sendToZohoBigin(data) {
  try {
    // Check rate limit before making request
    if (isRateLimited()) {
      await waitForRateLimit();
    }
    
    if (!accessToken) await refreshAccessToken();

    const url = "https://www.zohoapis.com/bigin/v2/Contacts";
    const payload = { data: [data] };

    console.log("📤 Sending payload to Zoho Bigin:", JSON.stringify(payload, null, 2));

    // Record this request for rate limiting
    recordRequest();

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
        
        // Handle rate limiting with exponential backoff
        if (err.response?.status === 429 || 
            (err.response?.data?.code === 'INVALID_TOKEN' && 
             err.response?.data?.message?.includes('too many requests'))) {
          console.log("⏳ Rate limit hit, waiting 60 seconds...");
          await new Promise(resolve => setTimeout(resolve, 60000));
          return sendToZohoBigin(data);
        }

    return {
      success: false,
      error: err.response?.data || err.message,
      message: "Failed to create lead in Zoho Bigin"
    };
  }
}

// ✅ Send company to Zoho Bigin
async function sendCompanyToZohoBigin(data) {
  try {
    // Check rate limit before making request
    if (isRateLimited()) {
      await waitForRateLimit();
    }
    
    if (!accessToken) await refreshAccessToken();

    const url = "https://www.zohoapis.com/bigin/v2/Accounts";
    const payload = { data: [data] };

    console.log("🏢 Sending company to Zoho Bigin:", JSON.stringify(payload, null, 2));

    // Record this request for rate limiting
    recordRequest();

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

    if (err.response?.status === 401) {
      console.log("🔁 Token expired — refreshing and retrying...");
      await refreshAccessToken();
      return sendCompanyToZohoBigin(data);
    }
    
    // Handle rate limiting with exponential backoff
    if (err.response?.status === 429 || 
        (err.response?.data?.code === 'INVALID_TOKEN' && 
         err.response?.data?.message?.includes('too many requests'))) {
      console.log("⏳ Rate limit hit, waiting 60 seconds...");
      await new Promise(resolve => setTimeout(resolve, 60000));
      return sendCompanyToZohoBigin(data);
    }

    return {
      success: false,
      error: err.response?.data || err.message,
      message: "Failed to create company in Zoho Bigin"
    };
  }
}

// ✅ Send lead to Zoho Bigin
async function sendLeadToZohoBigin(data) {
  try {
    // Check rate limit before making request
    if (isRateLimited()) {
      await waitForRateLimit();
    }
    
    if (!accessToken) await refreshAccessToken();

    const url = "https://www.zohoapis.com/bigin/v2/Contacts";
    const payload = { data: [data] };

    console.log("🎯 Sending lead to Zoho Bigin:", JSON.stringify(payload, null, 2));

    // Record this request for rate limiting
    recordRequest();

    const res = await axios.post(url, payload, {
      headers: { 
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
    });

    console.log("✅ Zoho Bigin Lead API response:");
    console.dir(res.data, { depth: null });
    
    return {
      success: true,
      data: res.data,
      message: "Lead successfully created in Zoho Bigin"
    };
  } catch (err) {
    console.error("❌ Zoho Bigin Lead API error:", err.response?.data || err.message);

    if (err.response?.status === 401) {
      console.log("🔁 Token expired — refreshing and retrying...");
      await refreshAccessToken();
      return sendLeadToZohoBigin(data);
    }
    
    // Handle rate limiting with exponential backoff
    if (err.response?.status === 429 || 
        (err.response?.data?.code === 'INVALID_TOKEN' && 
         err.response?.data?.message?.includes('too many requests'))) {
      console.log("⏳ Rate limit hit, waiting 60 seconds...");
      await new Promise(resolve => setTimeout(resolve, 60000));
      return sendLeadToZohoBigin(data);
    }

    return {
      success: false,
      error: err.response?.data || err.message,
      message: "Failed to create lead in Zoho Bigin"
    };
  }
}

// ✅ Send deal to Zoho Bigin (Pipelines endpoint)
async function sendDealToZohoBigin(data) {
  try {
    // Check rate limit before making request
    if (isRateLimited()) {
      await waitForRateLimit();
    }
    
    if (!accessToken) await refreshAccessToken();

    const url = "https://www.zohoapis.com/bigin/v2/Pipelines";
    
    // Ensure proper Pipeline data format with mandatory fields
    const dealData = {
      Deal_Name: data.Deal_Name || data.deal_name || "New Deal",
      Contact_Name: data.Contact_Name || data.contact_id, // Use Contact ID
      Sub_Pipeline: data.Sub_Pipeline || "PVE License User Pipeline", // Default Sub-Pipeline
      Stage: data.Stage || data.stage || "Enquiry", // Default stage
      Closing_Date: data.Closing_Date || data.closing_date || getFutureDate(30) // Default: today + 30 days
    };
    
    const payload = { data: [dealData] };

    console.log("💰 Sending deal to Zoho Bigin:", JSON.stringify(payload, null, 2));

    // Record this request for rate limiting
    recordRequest();

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

    if (err.response?.status === 401) {
      console.log("🔁 Token expired — refreshing and retrying...");
      await refreshAccessToken();
      return sendDealToZohoBigin(data);
    }
    
    // Handle rate limiting with exponential backoff
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

// ✅ Send product to Zoho Bigin
async function sendProductToZohoBigin(data) {
  try {
    // Check rate limit before making request
    if (isRateLimited()) {
      await waitForRateLimit();
    }
    
    if (!accessToken) await refreshAccessToken();

    const url = "https://www.zohoapis.com/bigin/v2/Products";
    const payload = { data: [data] };

    console.log("📦 Sending product to Zoho Bigin:", JSON.stringify(payload, null, 2));

    // Record this request for rate limiting
    recordRequest();

    const res = await axios.post(url, payload, {
      headers: { 
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
    });

    console.log("✅ Zoho Bigin Product API response:");
    console.dir(res.data, { depth: null });
    
    return {
      success: true,
      data: res.data,
      message: "Product successfully created in Zoho Bigin"
    };
  } catch (err) {
    console.error("❌ Zoho Bigin Product API error:", err.response?.data || err.message);

    if (err.response?.status === 401) {
      console.log("🔁 Token expired — refreshing and retrying...");
      await refreshAccessToken();
      return sendProductToZohoBigin(data);
    }
    
    // Handle rate limiting with exponential backoff
    if (err.response?.status === 429 || 
        (err.response?.data?.code === 'INVALID_TOKEN' && 
         err.response?.data?.message?.includes('too many requests'))) {
      console.log("⏳ Rate limit hit, waiting 60 seconds...");
      await new Promise(resolve => setTimeout(resolve, 60000));
      return sendProductToZohoBigin(data);
    }

    return {
      success: false,
      error: err.response?.data || err.message,
      message: "Failed to create product in Zoho Bigin"
    };
  }
}

// ✅ Process and route data to Zoho Bigin
async function processAndRouteData(processedData, options = {}) {
  const results = {
    zohoBigin: {
      contact: null,
      company: null,
      lead: null
    },
    timestamp: new Date().toISOString()
  };

  // Create Company first (if company data exists)
  if (processedData.company) {
    try {
      console.log("🏢 Creating company...");
      const accountData = mapToAccountFormat(processedData);
      results.zohoBigin.account = await sendCompanyToZohoBigin(accountData);
    } catch (error) {
      results.zohoBigin.account = {
        success: false,
        error: error.message,
        message: "Failed to create account"
      };
    }
  }

  // Create Lead (if lead data exists)
  if (processedData.name || processedData.email) {
    try {
      console.log("🎯 Creating lead...");
      const leadData = mapToLeadFormat(processedData);
      results.zohoBigin.lead = await sendLeadToZohoBigin(leadData);
    } catch (error) {
      results.zohoBigin.lead = {
        success: false,
        error: error.message,
        message: "Failed to create lead"
      };
    }
  }

  // Create Contact (always create contact as fallback)
  try {
    console.log("👤 Creating contact...");
    const contactData = mapToContactFormat(processedData);
    results.zohoBigin.contact = await sendToZohoBigin(contactData);
  } catch (error) {
    results.zohoBigin.contact = {
      success: false,
      error: error.message,
      message: "Failed to create contact"
    };
  }

  return results;
}

// ✅ Map data to Company format
function mapToAccountFormat(data) {
  return {
    Account_Name: data.company || data.customerCompany || "Unknown Company",
    Website: data.website || "",
    Industry: data.industry || "",
    Description: data.message || data.description || "",
    Lead_Source: data.source || "Website"
  };
}

// ✅ Map data to Lead format
function mapToLeadFormat(data) {
  return {
    First_Name: data.first_name || data.firstName || "",
    Last_Name: data.last_name || data.lastName || data.name || "Unknown",
    Email: data.email || data.customerEmail || "",
    Phone: data.phone || data.mobile || "",
    Company: data.company || data.customerCompany || "",
    Lead_Source: data.source || data.leadSource || "Website",
    Lead_Status: determineLeadStatus(data.event_name),
    Description: data.message || data.description || "",
    Website: data.website || ""
  };
}

// ✅ Map data to Contact format (existing function)
function mapToContactFormat(data) {
  return {
    Last_Name: data.name || data.customerName || `${data.first_name || ''} ${data.last_name || ''}`.trim() || "Unknown Contact",
    Email: data.email || data.customerEmail || "",
    Mobile: data.phone || data.mobile || "",
    Description: data.message || data.description || "",
    Company: data.company || data.customerCompany || "",
    Lead_Source: "Website",
    Website: data.website || ""
  };
}

// ✅ Determine lead status based on event
function determineLeadStatus(eventName) {
  if (!eventName) return "Not Contacted";
  
  const event = eventName.toLowerCase();
  
  if (event.includes('purchase') || event.includes('completed')) {
    return "Qualified";
  } else if (event.includes('trial') || event.includes('download')) {
    return "Not Contacted";
  } else if (event.includes('register') || event.includes('activate')) {
    return "Contacted";
  } else if (event.includes('renewal')) {
    return "Qualified";
  }
  
  return "Not Contacted";
}

// ✅ Helper function to get future date
function getFutureDate(days) {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);
  return futureDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

module.exports = { 
  sendToZohoBigin, 
  sendCompanyToZohoBigin,
  sendLeadToZohoBigin,
  sendDealToZohoBigin,
  sendProductToZohoBigin,
  processAndRouteData,
  refreshAccessToken,
  mapToAccountFormat,
  mapToLeadFormat,
  mapToContactFormat,
  determineLeadStatus
};
