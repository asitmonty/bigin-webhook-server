const axios = require("axios");

// ✅ Send contact to Zoho Bigin (US region)
async function sendToZohoBigin(data) {
  try {
    const { refreshAccessToken } = require('./zoho');
    const token = await refreshAccessToken();

    const url = "https://www.zohoapis.com/bigin/v2/Contacts";
    const payload = { data: [data] };

    console.log("📤 Sending payload to Zoho Bigin:", JSON.stringify(payload, null, 2));

    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json"
      },
    });

    console.log("✅ Zoho Bigin API response:");
    console.dir(res.data, { depth: null });
    return { success: true, data: res.data, message: "Contact successfully created in Zoho Bigin" };
  } catch (err) {
    console.error("❌ Zoho Bigin API error:", err.response?.data || err.message);

    if (err.response?.status === 401) {
      console.log("🔁 Token expired — refreshing and retrying...");
      return sendToZohoBigin(data);
    }

    // Duplicate -> upsert by email
    const duplicateCode = err.response?.data?.data?.[0]?.code;
    const duplicateMsg = err.response?.data?.data?.[0]?.message;
    if (duplicateCode === 'DUPLICATE_DATA' || (typeof duplicateMsg === 'string' && duplicateMsg.toLowerCase().includes('duplicate'))) {
      try {
        console.log('🔁 Duplicate contact detected. Looking up by email to upsert...');
        const existingId = await findContactByEmail(data.Email);
        if (existingId) {
          await updateContact(existingId, data);
          console.log(`✅ Upserted existing contact ${existingId}`);
          return { success: true, data: { id: existingId }, message: 'Contact exists; updated' };
        }
      } catch (lookupErr) {
        console.error('❌ Upsert failed:', lookupErr.response?.data || lookupErr.message);
      }
    }

    return { success: false, error: err.response?.data || err.message, message: "Failed to create contact in Zoho Bigin" };
  }
}

// 🔎 Find contact by email
async function findContactByEmail(email) {
  if (!email) return null;
  const { refreshAccessToken } = require('./zoho');
  const token = await refreshAccessToken();
  const url = `https://www.zohoapis.com/bigin/v2/Contacts/search?email=${encodeURIComponent(email)}`;
  const res = await axios.get(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const id = res.data?.data?.[0]?.id;
  if (id) {
    console.log(`🔎 Found contact by email ${email}: ${id}`);
  } else {
    console.log(`🔎 No contact found by email ${email}`);
  }
  return id || null;
}

// ✏️ Update contact by id
async function updateContact(contactId, data) {
  if (!contactId) return null;
  const { refreshAccessToken } = require('./zoho');
  const token = await refreshAccessToken();
  const url = `https://www.zohoapis.com/bigin/v2/Contacts/${contactId}`;
  const payload = { data: [data] };
  const res = await axios.put(url, payload, {
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json"
    }
  });
  console.log('✏️ Contact updated:', res.data);
  return res.data;
}

module.exports = { sendToZohoBigin, findContactByEmail, updateContact };