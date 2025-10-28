const axios = require('axios');

async function getBiginFieldsMetadata() {
  try {
    console.log('🔍 Getting Zoho Bigin Fields Metadata for Deals module...');
    
    // First get access token
    const tokenUrl = "https://accounts.zoho.com/oauth/v2/token";
    const tokenParams = new URLSearchParams({
      code: "1000.3984d8540cfeecb57179206416458259.ccc99d01f15a717925e07ede3a09cee9",
      client_id: "1000.8M3XLYNUNNOYDOW877VN684JN38XMS",
      client_secret: "ca6c3b8395c3c59f6e41f407fba2ffd89b6dbd6e21",
      grant_type: "authorization_code",
    });

    const tokenRes = await axios.post(tokenUrl, tokenParams.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = tokenRes.data.access_token;
    console.log('✅ Access token obtained:', accessToken ? accessToken.substring(0, 20) + '...' : 'No token');

    // Now get fields metadata
    const fieldsUrl = "https://www.zohoapis.com/bigin/v1/settings/fields?module=Deals";
    const fieldsRes = await axios.get(fieldsUrl, {
      headers: { 
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
    });

    console.log('📋 Zoho Bigin Deals Fields Metadata:');
    console.log(JSON.stringify(fieldsRes.data, null, 2));
    
    return fieldsRes.data;
  } catch (err) {
    console.error('❌ Error getting fields metadata:', err.response?.data || err.message);
    throw err;
  }
}

getBiginFieldsMetadata().catch(console.error);
