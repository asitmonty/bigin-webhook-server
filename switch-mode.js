// Zoho API Mode Switcher
// ======================
// Use this script to easily switch between Self-Client and Server-Client modes

const fs = require('fs');
const path = require('path');

// Credentials from zoho-credentials.txt
const credentials = {
  selfClient: {
    clientId: '1000.8M3XLYNUNNOYDOW877VN684JN38XMS',
    clientSecret: 'ca6c3b8395c3c59f6e41f407fba2ffd89b6dbd6e21',
    refreshToken: '1000.0b0df64bcb99ebccc9c9906d8c598836.91927c8731df6ad3e129888a30433fbf'
  },
  serverClient: {
    clientId: '1000.YGDJ730H28KEGG5PU7O9NFKY5BQWTN',
    clientSecret: '399a8ff39ae8ca478c91b8d71466aae422d60e1e72',
    refreshToken: '1000.dd84c2eb3b72ec3dfd9ef4f1ca28565a.12c29bbca3b8ab2cca968c88b5efd42a'
  }
};

function switchToSelfClient() {
  console.log('🔄 Switching to Self-Client mode...');
  
  const envContent = `ZOHO_CLIENT_ID=${credentials.selfClient.clientId}
ZOHO_CLIENT_SECRET=${credentials.selfClient.clientSecret}
ZOHO_REFRESH_TOKEN=${credentials.selfClient.refreshToken}
ZOHO_MODE=self-client`;

  try {
    fs.writeFileSync('.env', envContent);
    console.log('✅ Switched to Self-Client mode');
    console.log('📝 Updated .env file with Self-Client credentials');
    console.log('🚀 Ready to use Self-Client authentication');
  } catch (error) {
    console.error('❌ Failed to switch to Self-Client mode:', error.message);
  }
}

function switchToServerClient() {
  console.log('🔄 Switching to Server-Client mode...');
  
  if (credentials.serverClient.refreshToken === 'NEEDS_AUTHORIZATION_CODE_EXCHANGE') {
    console.log('❌ Server-Client refresh token not available');
    console.log('💡 Please run token-exchange.js first to get refresh token');
    console.log('📝 Then update zoho-credentials.txt with the refresh token');
    return;
  }
  
  const envContent = `ZOHO_CLIENT_ID=${credentials.serverClient.clientId}
ZOHO_CLIENT_SECRET=${credentials.serverClient.clientSecret}
ZOHO_REFRESH_TOKEN=${credentials.serverClient.refreshToken}
ZOHO_MODE=server-client`;

  try {
    fs.writeFileSync('.env', envContent);
    console.log('✅ Switched to Server-Client mode');
    console.log('📝 Updated .env file with Server-Client credentials');
    console.log('🚀 Ready to use Server-Client authentication');
  } catch (error) {
    console.error('❌ Failed to switch to Server-Client mode:', error.message);
  }
}

function showCurrentMode() {
  try {
    if (fs.existsSync('.env')) {
      const envContent = fs.readFileSync('.env', 'utf8');
      const lines = envContent.split('\n');
      
      console.log('📋 Current Configuration:');
      console.log('========================');
      
      lines.forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const [key, value] = line.split('=');
          if (key === 'ZOHO_CLIENT_ID') {
            console.log(`Client ID: ${value}`);
            if (value === credentials.selfClient.clientId) {
              console.log('Mode: Self-Client ✅');
            } else if (value === credentials.serverClient.clientId) {
              console.log('Mode: Server-Client ✅');
            } else {
              console.log('Mode: Unknown ❓');
            }
          }
        }
      });
    } else {
      console.log('❌ No .env file found');
    }
  } catch (error) {
    console.error('❌ Failed to read current configuration:', error.message);
  }
}

// Main execution
const command = process.argv[2];

console.log('🔐 Zoho API Mode Switcher');
console.log('========================');

switch (command) {
  case 'self':
  case 'self-client':
    switchToSelfClient();
    break;
    
  case 'server':
  case 'server-client':
    switchToServerClient();
    break;
    
  case 'status':
  case 'current':
    showCurrentMode();
    break;
    
  default:
    console.log('Usage: node switch-mode.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  self, self-client  - Switch to Self-Client mode');
    console.log('  server, server-client - Switch to Server-Client mode');
    console.log('  status, current    - Show current mode');
    console.log('');
    console.log('Examples:');
    console.log('  node switch-mode.js self');
    console.log('  node switch-mode.js server');
    console.log('  node switch-mode.js status');
}
