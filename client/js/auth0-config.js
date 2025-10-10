/**
 * Auth0 Configuration for AI Project Manager
 * This file contains all Auth0-related configurations and integrations
 */

// Auth0 Configuration
const AUTH0_CONFIG = {
    domain: process.env.AUTH0_DOMAIN || 'your-domain.auth0.com',
    clientId: process.env.AUTH0_CLIENT_ID || 'your_client_id',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || 'your_client_secret', // Server-side only
    audience: process.env.AUTH0_AUDIENCE || 'https://api.ai-project-manager.com',
    scope: 'openid profile email read:projects write:projects manage:calendar',
    redirectUri: process.env.AUTH0_REDIRECT_URI || 'https://localhost:3000/callback'
};

// Token Vault Configuration
const TOKEN_VAULT_CONFIG = {
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
    store: {
        id: process.env.FGA_STORE_ID || 'your-fga-store-id',
        authorizationModelId: process.env.FGA_MODEL_ID || 'your-model-id'
    },
    relations: {
        document: ['viewer', 'editor', 'owner'],
        project: ['member', 'manager', 'owner'],
        calendar: ['reader', 'writer']
    }
};

// Export configurations
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AUTH0_CONFIG,
        TOKEN_VAULT_CONFIG,
        FGA_CONFIG
    };
} else {
    // Browser environment
    window.AUTH0_CONFIG = AUTH0_CONFIG;
    window.TOKEN_VAULT_CONFIG = TOKEN_VAULT_CONFIG;
    window.FGA_CONFIG = FGA_CONFIG;
}