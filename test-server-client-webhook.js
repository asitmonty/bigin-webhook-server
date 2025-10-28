const { processAndRouteData } = require('./zoho');

// Test Server-Client mode with sample webhook JSON
async function testServerClientWebhook() {
  console.log('🧪 Testing Server-Client Mode with Sample Webhook');
  console.log('================================================');
  
  // Set Server-Client environment variables
  process.env.ZOHO_CLIENT_ID = '1000.YGDJ730H28KEGG5PU7O9NFKY5BQWTN';
  process.env.ZOHO_CLIENT_SECRET = '399a8ff39ae8ca478c91b8d71466aae422d60e1e72';
  process.env.ZOHO_REFRESH_TOKEN = '1000.dd84c2eb3b72ec3dfd9ef4f1ca28565a.12c29bbca3b8ab2cca968c88b5efd42a';
  
  try {
    // Sample webhook data (similar to what we've used before)
    const sampleWebhookData = {
      // Contact/Lead data
      contact: {
        Last_Name: "Server-Client Test Contact",
        Email: "server-client-test@example.com",
        Company: "Server-Client Test Company",
        Lead_Source: "Server-Client Webhook Test",
        Phone: "+1234567890"
      },
      
      // Company data
      company: {
        Account_Name: "Server-Client Test Company Ltd",
        Website: "https://serverclienttest.com",
        Industry: "Technology",
        Phone: "+1234567890",
        Email: "info@serverclienttest.com"
      },
      
      // Deal data
      deal: {
        Deal_Name: "Server-Client Test Deal",
        Stage: "Enquiry",
        Amount: 7500,
        Description: "Server-Client mode test deal"
      },
      
      // Product data
      product: {
        Product_Name: "Server-Client Test Product",
        Product_Code: "SERVER-CLIENT-001",
        Unit_Price: 199.99,
        Description: "Server-Client mode test product"
      }
    };
    
    console.log('📋 Sample Webhook Data:');
    console.log(JSON.stringify(sampleWebhookData, null, 2));
    
    console.log('\n🔄 Processing webhook data with Server-Client mode...');
    
    // Process the webhook data
    const result = await processAndRouteData(sampleWebhookData);
    
    console.log('\n📊 Processing Results:');
    console.log('======================');
    console.log(JSON.stringify(result, null, 2));
    
    // Check individual results
    console.log('\n✅ Individual Results:');
    if (result.zohoBigin.contact) {
      console.log('👤 Contact:', result.zohoBigin.contact.success ? '✅ SUCCESS' : '❌ FAILED');
      if (result.zohoBigin.contact.success) {
        console.log('   Contact ID:', result.zohoBigin.contact.data.data[0].details.id);
      }
    }
    
    if (result.zohoBigin.account) {
      console.log('🏢 Company:', result.zohoBigin.account.success ? '✅ SUCCESS' : '❌ FAILED');
      if (result.zohoBigin.account.success) {
        console.log('   Company ID:', result.zohoBigin.account.data.data[0].details.id);
      }
    }
    
    if (result.zohoBigin.lead) {
      console.log('🎯 Lead:', result.zohoBigin.lead.success ? '✅ SUCCESS' : '❌ FAILED');
      if (result.zohoBigin.lead.success) {
        console.log('   Lead ID:', result.zohoBigin.lead.data.data[0].details.id);
      }
    }
    
    // Summary
    const successCount = Object.values(result.zohoBigin).filter(r => r && r.success).length;
    const totalCount = Object.values(result.zohoBigin).filter(r => r).length;
    
    console.log('\n🎯 SERVER-CLIENT MODE TEST SUMMARY');
    console.log('==================================');
    console.log(`✅ Successful operations: ${successCount}/${totalCount}`);
    console.log(`🎯 Overall result: ${successCount === totalCount ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);
    
    if (successCount === totalCount) {
      console.log('\n🚀 Server-Client mode is working perfectly!');
      console.log('Ready for production deployment.');
    }
    
  } catch (error) {
    console.error('❌ Server-Client test failed:', error.message);
    console.error('Full error:', error);
  }
}

testServerClientWebhook();
