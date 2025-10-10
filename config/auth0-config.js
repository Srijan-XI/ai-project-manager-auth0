/**/**/**

 * Auth0 Configuration for AI Project Manager

 * Centralized configuration for all Auth0 services * Auth0 Configuration * Auth0 Configuration for AI Project Manager

 */

 * Centralized configuration for all Auth0 services * This file contains all Auth0-related configurations and integrations

require('dotenv').config();

 */ */

// Auth0 Basic Configuration

const AUTH0_CONFIG = {

    domain: process.env.AUTH0_DOMAIN || 'demo.auth0.com',

    clientId: process.env.AUTH0_CLIENT_ID || 'demo-client-id',// Auth0 Basic Configuration// Auth0 Configuration

    clientSecret: process.env.AUTH0_CLIENT_SECRET || 'demo-client-secret',

    audience: process.env.AUTH0_AUDIENCE || `https://${process.env.AUTH0_DOMAIN || 'demo.auth0.com'}/api/v2/`,const AUTH0_CONFIG = {const AUTH0_CONFIG = {

};

    domain: process.env.AUTH0_DOMAIN || 'your-domain.auth0.com',    domain: process.env.AUTH0_DOMAIN || 'your-domain.auth0.com',

// Token Vault Configuration

const TOKEN_VAULT_CONFIG = {    clientId: process.env.AUTH0_CLIENT_ID || 'your-client-id',    clientId: process.env.AUTH0_CLIENT_ID || 'your_client_id',

    domain: AUTH0_CONFIG.domain,

    clientId: AUTH0_CONFIG.clientId,    clientSecret: process.env.AUTH0_CLIENT_SECRET || 'your-client-secret',    clientSecret: process.env.AUTH0_CLIENT_SECRET || 'your_client_secret', // Server-side only

    clientSecret: AUTH0_CONFIG.clientSecret,

    vaultUrl: process.env.AUTH0_VAULT_URL || `https://${AUTH0_CONFIG.domain}/oauth/token-vault`,    audience: process.env.AUTH0_AUDIENCE || `https://${process.env.AUTH0_DOMAIN}/api/v2/`,    audience: process.env.AUTH0_AUDIENCE || 'https://api.ai-project-manager.com',

};

};    scope: 'openid profile email read:projects write:projects manage:calendar',

// Fine-Grained Authorization Configuration

const FGA_CONFIG = {    redirectUri: process.env.AUTH0_REDIRECT_URI || 'https://localhost:3000/callback'

    apiUrl: process.env.FGA_API_URL || 'https://api.fga.dev',

    storeId: process.env.FGA_STORE_ID || null,// Token Vault Configuration};

    modelId: process.env.FGA_MODEL_ID || null,

    clientId: process.env.FGA_CLIENT_ID || null,const TOKEN_VAULT_CONFIG = {

    clientSecret: process.env.FGA_CLIENT_SECRET || null,

};    domain: AUTH0_CONFIG.domain,// Token Vault Configuration



// Validation function    clientId: AUTH0_CONFIG.clientId,const TOKEN_VAULT_CONFIG = {

function validateConfig() {

    const requiredEnvVars = [    clientSecret: AUTH0_CONFIG.clientSecret,    googleCalendar: {

        'AUTH0_DOMAIN',

        'AUTH0_CLIENT_ID',     vaultUrl: process.env.AUTH0_VAULT_URL || `https://${AUTH0_CONFIG.domain}/oauth/token-vault`,        scope: 'https://www.googleapis.com/auth/calendar',

        'AUTH0_CLIENT_SECRET',

        'SESSION_SECRET'};        tokenEndpoint: '/api/tokens/google-calendar'

    ];

        },

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

    // Fine-Grained Authorization Configuration    slack: {

    if (missing.length > 0) {

        console.warn('⚠️  Missing environment variables:', missing.join(', '));const FGA_CONFIG = {        scope: 'chat:write,channels:read',

        console.warn('⚠️  App will run in demo mode. Configure these variables in Vercel dashboard.');

        return false;    apiUrl: process.env.FGA_API_URL || 'https://api.fga.dev',        tokenEndpoint: '/api/tokens/slack'

    }

        storeId: process.env.FGA_STORE_ID || null,    },

    return true;

}    modelId: process.env.FGA_MODEL_ID || null,    github: {



module.exports = {    clientId: process.env.FGA_CLIENT_ID || null,        scope: 'repo,read:org',

    AUTH0_CONFIG,

    TOKEN_VAULT_CONFIG,     clientSecret: process.env.FGA_CLIENT_SECRET || null,        tokenEndpoint: '/api/tokens/github'

    FGA_CONFIG,

    validateConfig};    }

};
};

// Validation function

function validateConfig() {// Fine-Grained Authorization Configuration

    const requiredEnvVars = [const FGA_CONFIG = {

        'AUTH0_DOMAIN',    store: {

        'AUTH0_CLIENT_ID',         id: process.env.FGA_STORE_ID || 'your-fga-store-id',

        'AUTH0_CLIENT_SECRET',        authorizationModelId: process.env.FGA_MODEL_ID || 'your-model-id'

        'SESSION_SECRET'    },

    ];    relations: {

            document: ['viewer', 'editor', 'owner'],

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);        project: ['member', 'manager', 'owner'],

            calendar: ['reader', 'writer']

    if (missing.length > 0) {    }

        console.warn('⚠️  Missing environment variables:', missing.join(', '));};

        console.warn('⚠️  App will run in demo mode. Configure these variables in Vercel dashboard.');

        return false;// Export configurations

    }if (typeof module !== 'undefined' && module.exports) {

        module.exports = {

    return true;        AUTH0_CONFIG,

}        TOKEN_VAULT_CONFIG,

        FGA_CONFIG

module.exports = {    };

    AUTH0_CONFIG,} else {

    TOKEN_VAULT_CONFIG,     // Browser environment

    FGA_CONFIG,    window.AUTH0_CONFIG = AUTH0_CONFIG;

    validateConfig    window.TOKEN_VAULT_CONFIG = TOKEN_VAULT_CONFIG;

};    window.FGA_CONFIG = FGA_CONFIG;
}