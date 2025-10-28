const EnhancedDataProcessor = require('./processors/EnhancedDataProcessor');

async function debugTest() {
  const processor = new EnhancedDataProcessor();
  
  // Test with webhook payload structure
  const testPayload = {
    webhookTrigger: {
      payload: {
        data: {
          firstName: "John",
          lastName: "Doe", 
          email: "john.doe@example.com",
          company: "Example Corp"
        },
        eventName: "user.login.register"
      }
    }
  };
  
  console.log('Testing with webhook payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    // Test the full extraction process
    const extracted = processor.extractAllBranches(testPayload);
    console.log('Extracted data:', extracted);
    
    // Test validateAndTransform
    const transformed = processor.validateAndTransform(extracted);
    console.log('Transformed data:', transformed);
    
    // Test validation
    const validation = processor.validateData(transformed);
    console.log('Validation result:', validation);
    
    if (!validation.isValid) {
      console.log('Validation errors:', validation.errors);
    } else {
      console.log('✅ Validation passed!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugTest();
