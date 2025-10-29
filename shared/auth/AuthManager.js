// Authentication configuration for SaaS template
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class AuthManager {
  constructor(config) {
    this.config = config;
    this.jwtSecret = config.jwtSecret || process.env.JWT_SECRET;
    this.authProvider = config.authProvider || 'auth0';
  }

  // JWT Token Management
  generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Password Management
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Generate secure random strings
  generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateApiKey() {
    return crypto.randomBytes(32).toString('base64');
  }

  // Auth0 Configuration
  getAuth0Config() {
    return {
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE,
      scope: 'openid profile email',
      providers: [
        {
          name: 'google',
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET
        },
        {
          name: 'microsoft',
          clientId: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET
        },
        {
          name: 'linkedin',
          clientId: process.env.LINKEDIN_CLIENT_ID,
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET
        },
        {
          name: 'facebook',
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET
        },
        {
          name: 'zoho',
          clientId: process.env.ZOHO_CLIENT_ID,
          clientSecret: process.env.ZOHO_CLIENT_SECRET
        }
      ]
    };
  }

  // Azure AD B2C Configuration
  getAzureADB2CConfig() {
    return {
      tenantName: process.env.AZURE_AD_B2C_TENANT_NAME,
      clientId: process.env.AZURE_AD_B2C_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET,
      policyName: process.env.AZURE_AD_B2C_POLICY_NAME,
      authority: `https://${process.env.AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${process.env.AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${process.env.AZURE_AD_B2C_POLICY_NAME}`,
      scopes: ['openid', 'profile', 'email'],
      providers: [
        {
          name: 'google',
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET
        },
        {
          name: 'microsoft',
          clientId: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET
        },
        {
          name: 'linkedin',
          clientId: process.env.LINKEDIN_CLIENT_ID,
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET
        },
        {
          name: 'facebook',
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET
        }
      ]
    };
  }

  // Multi-Factor Authentication
  generateMFACode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateMFASecret() {
    return crypto.randomBytes(20).toString('base32');
  }

  verifyMFACode(code, secret) {
    // Implementation would use TOTP library like 'speakeasy'
    // This is a simplified version
    return code.length === 6 && /^\d+$/.test(code);
  }

  // Session Management
  createSession(userId, tenantId, metadata = {}) {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      sessionId,
      userId,
      tenantId,
      createdAt: new Date(),
      lastAccessed: new Date(),
      metadata
    };
    
    return sessionData;
  }

  // Rate Limiting
  createRateLimitKey(identifier, action) {
    return `rate_limit:${action}:${identifier}`;
  }

  // Security Headers
  getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
    };
  }

  // CAPTCHA Integration
  async verifyCaptcha(token) {
    // Implementation would integrate with Google reCAPTCHA or similar
    // This is a placeholder
    return true;
  }

  // Password Policy
  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    
    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    
    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Account Lockout
  createLockoutKey(email) {
    return `lockout:${email}`;
  }

  // Password Reset
  generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Email Verification
  generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Tenant-specific authentication
  validateTenantAccess(user, tenantId) {
    return user.tenant_id === tenantId && user.status === 'active';
  }

  // Role-based access control
  hasPermission(user, resource, action) {
    const rolePermissions = {
      admin: ['*'],
      owner: ['*'],
      manager: ['read', 'write', 'update'],
      member: ['read'],
      viewer: ['read']
    };

    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(action);
  }

  // Audit logging for authentication events
  logAuthEvent(event, userId, tenantId, metadata = {}) {
    const authEvent = {
      event,
      userId,
      tenantId,
      timestamp: new Date(),
      metadata
    };

    // This would typically be sent to a logging service
    console.log('Auth Event:', authEvent);
    return authEvent;
  }
}

module.exports = AuthManager;
