const axios = require('axios');

async function testZohoBiginWithServerClient() {
  try {
    console.log('🧪 Testing Zoho Bigin API with Server-Client mode...');
    
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

    // Try to create a contact in Bigin using the zoho.js module
    const { sendToZohoBigin } = require('./zoho');
    
    const result = await sendToZohoBigin(testData);
    
    console.log('✅ Zoho Bigin API result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.error('❌ Zoho Bigin API error:');
    console.error('Error:', err.message);
    console.error('Details:', err.response?.data || 'No response data');
  }
}

testZohoBiginWithServerClient().catch(console.error);
