const { sendCompanyToZohoBigin, sendLeadToZohoBigin, sendDealToZohoBigin, sendProductToZohoBigin } = require('./zoho');

// Test Server-Client mode with ONE request per minute (rate limit friendly)
async function testServerClientSlowly() {
  console.log('🐌 Testing Server-Client Mode - ONE Request Per Minute');
  console.log('=====================================================');
  
  // Set Server-Client environment variables
  process.env.ZOHO_CLIENT_ID = '1000.YGDJ730H28KEGG5PU7O9NFKY5BQWTN';
  process.env.ZOHO_CLIENT_SECRET = '399a8ff39ae8ca478c91b8d71466aae422d60e1e72';
  process.env.ZOHO_REFRESH_TOKEN = '1000.dd84c2eb3b72ec3dfd9ef4f1ca28565a.12c29bbca3b8ab2cca968c88b5efd42a';
  
  // Helper function to wait 60 seconds between requests
  const waitOneMinute = () => new Promise(resolve => {
    console.log('⏳ Waiting 60 seconds before next request...');
    setTimeout(resolve, 60000);
  });
  
  const results = {
    contact: null,
    company: null,
    deal: null,
    product: null
  };
  
  try {
    console.log('📋 Test Plan: One API call per minute');
    console.log('Total time: ~4 minutes for all tests');
    console.log('');
    
    // Test 1: Contact Creation (1 minute)
    console.log('👤 Test 1/4: Creating Contact...');
    const contactData = {
      Last_Name: "Server-Client Slow Test Contact",
      Email: "server-client-slow@example.com",
      Company: "Server-Client Slow Test Company",
      Lead_Source: "Server-Client Slow Test",
      Phone: "+1234567890"
    };
    
    results.contact = await sendLeadToZohoBigin(contactData);
    console.log('Contact Result:', results.contact.success ? '✅ SUCCESS' : '❌ FAILED');
    if (results.contact.success) {
      console.log('Contact ID:', results.contact.data.data[0].details.id);
    } else {
      console.log('Error:', results.contact.error);
    }
    
    await waitOneMinute();
    
    // Test 2: Company Creation (2 minutes)
    console.log('\n🏢 Test 2/4: Creating Company...');
    const companyData = {
      Account_Name: "Server-Client Slow Test Company Ltd",
      Website: "https://serverclientslow.com",
      Industry: "Technology",
      Phone: "+1234567890",
      Email: "info@serverclientslow.com"
    };
    
    results.company = await sendCompanyToZohoBigin(companyData);
    console.log('Company Result:', results.company.success ? '✅ SUCCESS' : '❌ FAILED');
    if (results.company.success) {
      console.log('Company ID:', results.company.data.data[0].details.id);
    } else {
      console.log('Error:', results.company.error);
    }
    
    await waitOneMinute();
    
    // Test 3: Deal Creation (3 minutes)
    console.log('\n💰 Test 3/4: Creating Deal...');
    const dealData = {
      Deal_Name: "Server-Client Slow Test Deal",
      Contact_Name: results.contact?.success ? results.contact.data.data[0].details.id : "5079371000017298311", // Use created contact or fallback
      Sub_Pipeline: "PVE License User Pipeline",
      Stage: "Enquiry",
      Closing_Date: getFutureDate(30),
      Amount: 8500,
      Description: "Server-Client slow test deal"
    };
    
    results.deal = await sendDealToZohoBigin(dealData);
    console.log('Deal Result:', results.deal.success ? '✅ SUCCESS' : '❌ FAILED');
    if (results.deal.success) {
      console.log('Deal ID:', results.deal.data.data[0].details.id);
    } else {
      console.log('Error:', results.deal.error);
    }
    
    await waitOneMinute();
    
    // Test 4: Product Creation (4 minutes)
    console.log('\n📦 Test 4/4: Creating Product...');
    const productData = {
      Product_Name: "Server-Client Slow Test Product",
      Product_Code: "SERVER-SLOW-001",
      Unit_Price: 149.99,
      Description: "Server-Client slow test product"
    };
    
    results.product = await sendProductToZohoBigin(productData);
    console.log('Product Result:', results.product.success ? '✅ SUCCESS' : '❌ FAILED');
    if (results.product.success) {
      console.log('Product ID:', results.product.data.data[0].details.id);
    } else {
      console.log('Error:', results.product.error);
    }
    
    // Final Summary
    console.log('\n🎯 SERVER-CLIENT SLOW TEST SUMMARY');
    console.log('==================================');
    console.log('👤 Contact:', results.contact?.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('🏢 Company:', results.company?.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('💰 Deal:', results.deal?.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('📦 Product:', results.product?.success ? '✅ SUCCESS' : '❌ FAILED');
    
    const successCount = Object.values(results).filter(r => r && r.success).length;
    const totalCount = Object.values(results).filter(r => r).length;
    
    console.log(`\n📊 Overall: ${successCount}/${totalCount} successful`);
    console.log(`🎯 Result: ${successCount === totalCount ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);
    
    if (successCount === totalCount) {
      console.log('\n🚀 Server-Client mode is working perfectly!');
      console.log('✅ Rate limit friendly testing successful');
      console.log('🚀 Ready for production deployment');
    } else if (successCount > 0) {
      console.log('\n⚠️ Server-Client mode partially working');
      console.log('Some operations succeeded, others failed');
    } else {
      console.log('\n❌ Server-Client mode needs investigation');
      console.log('All operations failed - check credentials');
    }
    
  } catch (error) {
    console.error('❌ Server-Client slow test failed:', error.message);
  }
}

// Helper function to get future date
function getFutureDate(days) {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);
  return futureDate.toISOString().split('T')[0];
}

testServerClientSlowly();
