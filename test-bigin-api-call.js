const axios = require('axios');

async function testZohoBiginAPICall() {
  try {
    console.log('🧪 Testing actual Zoho Bigin API call...');
    
    // First get access token
    const tokenUrl = "https://accounts.zoho.com/oauth/v2/token";
    const tokenParams = new URLSearchParams({
      code: "1000.fc9b3aaaf21474a4e89503b1500ad007.cc34f58c1957086a48ca14e9e5a36009",
      client_id: "1000.8M3XLYNUNNOYDOW877VN684JN38XMS",
      client_secret: "ca6c3b8395c3c59f6e41f407fba2ffd89b6dbd6e21",
      grant_type: "authorization_code",
    });

    const tokenRes = await axios.post(tokenUrl, tokenParams.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = tokenRes.data.access_token;
    console.log('✅ Access token obtained');

    // Test data that would be sent to Bigin for Contact creation
    const testData = {
      "Last_Name": "Test Customer",  // Mandatory field
      "Email": "test@example.com",
      "Company": "Test Company", 
      "Lead_Source": "Website",
      "Description": "Lead received via webhook"
    };

    console.log('📤 Data being sent to Zoho Bigin API:');
    console.log(JSON.stringify(testData, null, 2));

    // Try to create a contact/deal in Bigin
    const biginUrl = "https://www.zohoapis.com/bigin/v2/Contacts";
    const payload = { data: [testData] };

    console.log('📤 Full API payload:');
    console.log(JSON.stringify(payload, null, 2));

    const res = await axios.post(biginUrl, payload, {
      headers: { 
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
    });

    console.log('✅ Zoho Bigin API response:');
    console.log(JSON.stringify(res.data, null, 2));
    
  } catch (err) {
    console.error('❌ Zoho Bigin API error:');
    console.error('Status:', err.response?.status);
    console.error('Error:', err.response?.data || err.message);
  }
}

testZohoBiginAPICall().catch(console.error);
