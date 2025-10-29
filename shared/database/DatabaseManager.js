// Shared database schemas and migrations for SaaS template
const { Pool } = require('pg');

class DatabaseManager {
  constructor(config) {
    this.pool = new Pool(config);
  }

  async initialize() {
    await this.createTenantTable();
    await this.createUserTable();
    await this.createSubscriptionTable();
    await this.createIntegrationTable();
    await this.createWebhookTable();
    await this.createAuditTable();
  }

  async createTenantTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE NOT NULL,
        subdomain VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        plan VARCHAR(50) DEFAULT 'free',
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
      CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
      CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
    `;
    
    await this.pool.query(query);
  }

  async createUserTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'member',
        status VARCHAR(50) DEFAULT 'active',
        auth_provider VARCHAR(50),
        auth_provider_id VARCHAR(255),
        last_login TIMESTAMP,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, email)
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
    `;
    
    await this.pool.query(query);
  }

  async createSubscriptionTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        plan VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        stripe_subscription_id VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        trial_end TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    `;
    
    await this.pool.query(query);
  }

  async createIntegrationTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        config JSONB DEFAULT '{}',
        credentials JSONB DEFAULT '{}',
        last_sync TIMESTAMP,
        sync_status VARCHAR(50),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON integrations(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
      CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
    `;
    
    await this.pool.query(query);
  }

  async createWebhookTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        url VARCHAR(500) NOT NULL,
        secret VARCHAR(255),
        events TEXT[] DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'active',
        last_triggered TIMESTAMP,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id ON webhooks(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);
    `;
    
    await this.pool.query(query);
  }

  async createAuditTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(255),
        details JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `;
    
    await this.pool.query(query);
  }

  // Tenant management methods
  async createTenant(tenantData) {
    const query = `
      INSERT INTO tenants (name, domain, subdomain, plan, settings)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      tenantData.name,
      tenantData.domain,
      tenantData.subdomain,
      tenantData.plan || 'free',
      JSON.stringify(tenantData.settings || {})
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getTenantByDomain(domain) {
    const query = 'SELECT * FROM tenants WHERE domain = $1';
    const result = await this.pool.query(query, [domain]);
    return result.rows[0];
  }

  async getTenantBySubdomain(subdomain) {
    const query = 'SELECT * FROM tenants WHERE subdomain = $1';
    const result = await this.pool.query(query, [subdomain]);
    return result.rows[0];
  }

  // User management methods
  async createUser(userData) {
    const query = `
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, auth_provider, auth_provider_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      userData.tenant_id,
      userData.email,
      userData.password_hash,
      userData.first_name,
      userData.last_name,
      userData.role || 'member',
      userData.auth_provider,
      userData.auth_provider_id
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getUserByEmail(email, tenantId) {
    const query = 'SELECT * FROM users WHERE email = $1 AND tenant_id = $2';
    const result = await this.pool.query(query, [email, tenantId]);
    return result.rows[0];
  }

  // Subscription management methods
  async createSubscription(subscriptionData) {
    const query = `
      INSERT INTO subscriptions (tenant_id, plan, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end, trial_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      subscriptionData.tenant_id,
      subscriptionData.plan,
      subscriptionData.stripe_subscription_id,
      subscriptionData.stripe_customer_id,
      subscriptionData.current_period_start,
      subscriptionData.current_period_end,
      subscriptionData.trial_end
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getActiveSubscription(tenantId) {
    const query = 'SELECT * FROM subscriptions WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1';
    const result = await this.pool.query(query, [tenantId, 'active']);
    return result.rows[0];
  }

  // Integration management methods
  async createIntegration(integrationData) {
    const query = `
      INSERT INTO integrations (tenant_id, name, type, config, credentials)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      integrationData.tenant_id,
      integrationData.name,
      integrationData.type,
      JSON.stringify(integrationData.config || {}),
      JSON.stringify(integrationData.credentials || {})
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getIntegrationsByTenant(tenantId) {
    const query = 'SELECT * FROM integrations WHERE tenant_id = $1 AND status = $2';
    const result = await this.pool.query(query, [tenantId, 'active']);
    return result.rows;
  }

  // Webhook management methods
  async createWebhook(webhookData) {
    const query = `
      INSERT INTO webhooks (tenant_id, name, url, secret, events)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      webhookData.tenant_id,
      webhookData.name,
      webhookData.url,
      webhookData.secret,
      webhookData.events || []
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getWebhooksByTenant(tenantId) {
    const query = 'SELECT * FROM webhooks WHERE tenant_id = $1 AND status = $2';
    const result = await this.pool.query(query, [tenantId, 'active']);
    return result.rows;
  }

  // Audit logging
  async logAuditEvent(auditData) {
    const query = `
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      auditData.tenant_id,
      auditData.user_id,
      auditData.action,
      auditData.resource_type,
      auditData.resource_id,
      JSON.stringify(auditData.details || {}),
      auditData.ip_address,
      auditData.user_agent
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = DatabaseManager;
