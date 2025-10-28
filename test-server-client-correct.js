const axios = require('axios');

async function testServerClientWithCorrectCredentials() {
  try {
    console.log('🧪 Testing Server-Client with correct credentials...');
    
    // Test data for contact creation
    const testData = {
      "Last_Name": "Test Customer Server-Client",
      "Email": "test-server-client@example.com",
      "Company": "Test Company Server-Client", 
      "Lead_Source": "Website",
      "Description": "Lead received via webhook - Server-Client mode"
    };

    console.log('📤 Data being sent to Zoho Bigin API:');
    console.log(JSON.stringify(testData, null, 2));

    // First get access token with correct credentials
    const tokenUrl = "https://accounts.zoho.com/oauth/v2/token";
    const tokenParams = new URLSearchParams({
      refresh_token: "1000.0f83f3f55b2a6621be65dfd126620722.f32011697ca96b039f7ec6f1575a5e9f",
      client_id: "1000.YGDJ730H28KEGG5PU7O9NFKY5BQWTN",  // Correct Server-Client ID
      client_secret: "399a8ff39ae8ca478c91b8d71466aae422d60e1e72",  // Correct Server-Client Secret
      grant_type: "refresh_token",
    });

    console.log('🔑 Getting access token...');
    const tokenRes = await axios.post(tokenUrl, tokenParams.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = tokenRes.data.access_token;
    console.log('✅ Access token obtained:', accessToken ? accessToken.substring(0, 20) + '...' : 'No token');

    // Try to create a contact in Bigin
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
    console.error('❌ Error:');
    console.error('Status:', err.response?.status);
    console.error('Error:', err.response?.data || err.message);
  }
}

testServerClientWithCorrectCredentials().catch(console.error);
