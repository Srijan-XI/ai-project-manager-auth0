/**
 * Auth0 Configuration for AI Project Manager
 * This file contains all Auth0-related configurations and integrations
 */

// Safe env getter for browser and Node
function getEnv(key, fallback) {
    try {
        if (typeof process !== 'undefined' && process.env && typeof process.env[key] !== 'undefined') {
            return process.env[key] || fallback;
        }
    } catch (_) {}
    // Optionally read from window.__ENV__ if provided at runtime
    if (typeof window !== 'undefined' && window.__ENV__ && typeof window.__ENV__[key] !== 'undefined') {
        return window.__ENV__[key] || fallback;
    }
    return fallback;
}

// Auth0 Configuration (browser-safe)
const AUTH0_CONFIG = {
    domain: getEnv('AUTH0_DOMAIN', 'genai-8649882471415737.us.auth0.com'),
    clientId: getEnv('AUTH0_CLIENT_ID', 'A7kUmty4eQnifEG9zjRjTaAa3wjWTzyO'),
    audience: getEnv('AUTH0_AUDIENCE', 'https://api.ai-project-manager.com'),
    scope: 'openid profile email read:projects write:projects manage:calendar',
    redirectUri: getEnv('AUTH0_REDIRECT_URI', (typeof window !== 'undefined' ? window.location.origin + '/callback' : 'http://localhost:3000/callback'))
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
        id: getEnv('FGA_STORE_ID', 'your-fga-store-id'),
        authorizationModelId: getEnv('FGA_MODEL_ID', 'your-model-id')
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