const EnhancedDataProcessor = require('./processors/EnhancedDataProcessor');

async function testZohoDataFormat() {
  console.log('🧪 Testing Zoho Bigin data format...');
  
  const processor = new EnhancedDataProcessor();
  
  // Test data similar to our webhook payload
  const testData = {
    customerName: "Test Customer",
    firstName: "Test",
    lastName: "Customer", 
    email: "test@example.com",
    company: "Test Company",
    eventName: "purchase.completed",
    dealAmount: "1000",
    productName: "Test Product"
  };
  
  console.log('📋 Input data:', testData);
  
  // Process the data
  const processedData = processor.validateAndTransform(testData);
  console.log('🔄 Processed data:', processedData);
  
  // Map to Zoho format
  const zohoData = processor.mapToZohoBiginFormat(processedData);
  console.log('📤 Final Zoho Bigin data:', JSON.stringify(zohoData, null, 2));
  
  // Check if it's a deal event
  const isDeal = processor.isDealEvent(testData.eventName);
  console.log('💰 Is deal event:', isDeal);
  
  if (isDeal) {
    const stage = processor.getDealStage(testData.eventName, testData);
    console.log('🎯 Deal stage:', stage);
    
    const dealName = processor.generateDealName(testData);
    console.log('📝 Deal name:', dealName);
  }
}

testZohoDataFormat().catch(console.error);
