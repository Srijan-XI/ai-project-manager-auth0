/**
 * Auth0 Configuration for AI Project Manager
 * Centralized configuration for all Auth0 services
 */

require('dotenv').config();

// Auth0 Basic Configuration
const AUTH0_CONFIG = {
    domain: process.env.AUTH0_DOMAIN || 'demo.auth0.com',
    clientId: process.env.AUTH0_CLIENT_ID || 'demo-client-id',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || 'demo-client-secret',
    audience: process.env.AUTH0_AUDIENCE || 'https://api.ai-project-manager.com',
};

// Token Vault Configuration
const TOKEN_VAULT_CONFIG = {
    domain: AUTH0_CONFIG.domain,
    clientId: AUTH0_CONFIG.clientId,
    clientSecret: AUTH0_CONFIG.clientSecret,
    vaultUrl: process.env.AUTH0_VAULT_URL || `https://${AUTH0_CONFIG.domain}/oauth/token-vault`,
    googleCalendar: {
        scope: 'https://www.googleapis.com/auth/calendar',
        tokenEndpoint: '/api/tokens/google-calendar'
    },
    slack: {
        scope: 'chat:write,channels:read',
        tokenEndpoint: '/api/tokens/slack'
    },
    github: {
        scope: 'repo,read:org',
        tokenEndpoint: '/api/tokens/github'
    }
};

// Fine-Grained Authorization Configuration
const FGA_CONFIG = {
    apiUrl: process.env.FGA_API_URL || 'https://api.fga.dev',
    storeId: process.env.FGA_STORE_ID || null,
    modelId: process.env.FGA_MODEL_ID || null,
    clientId: process.env.FGA_CLIENT_ID || null,
    clientSecret: process.env.FGA_CLIENT_SECRET || null,
    relations: {
        document: ['viewer', 'editor', 'owner'],
        project: ['member', 'manager', 'owner'],
        calendar: ['reader', 'writer']
    }
};

// Validation function
function validateConfig() {
    const requiredEnvVars = [
        'AUTH0_DOMAIN',
        'AUTH0_CLIENT_ID',
        'AUTH0_CLIENT_SECRET',
        'SESSION_SECRET'
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missing.length > 0) {
        console.warn('⚠️  Missing environment variables:', missing.join(', '));
        console.warn('⚠️  App will run in demo mode. Configure these variables in Vercel dashboard.');
        return false;
    }

    return true;
}

// Export configurations
module.exports = {
    AUTH0_CONFIG,
    TOKEN_VAULT_CONFIG,
    FGA_CONFIG,
    validateConfig
};
