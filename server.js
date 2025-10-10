/**
 * Server-side Auth0 Integration for AI Project Manager
 * This file handles server-side authentication, token management, and FGA integration
 */

const express = require('express');
const { auth } = require('express-openid-connect');
const { auth: jwtAuth } = require('express-oauth2-jwt-bearer');
const { ManagementClient, AuthenticationClient } = require('auth0');
const axios = require('axios');
require('dotenv').config();

// Configuration with environment variables and fallbacks
const AUTH0_CONFIG = {
    domain: process.env.AUTH0_DOMAIN || 'demo.auth0.com',
    clientId: process.env.AUTH0_CLIENT_ID || 'demo-client-id',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || 'demo-client-secret',
    audience: process.env.AUTH0_AUDIENCE || 'https://api.ai-project-manager.com',
};

const app = express();

// JWT validation middleware for API endpoints
const jwtCheck = jwtAuth({
    audience: AUTH0_CONFIG.audience,
    issuerBaseURL: `https://${AUTH0_CONFIG.domain}/`,
    tokenSigningAlg: 'RS256'
});

// Auth0 Management Client for user management (with error handling)
let management = null;
let auth0Client = null;

try {
    if (process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET) {
        management = new ManagementClient({
            domain: AUTH0_CONFIG.domain,
            clientId: AUTH0_CONFIG.clientId,
            clientSecret: AUTH0_CONFIG.clientSecret,
            scope: 'read:users update:users read:user_metadata update:user_metadata'
        });

        auth0Client = new AuthenticationClient({
            domain: AUTH0_CONFIG.domain,
            clientId: AUTH0_CONFIG.clientId,
            clientSecret: AUTH0_CONFIG.clientSecret
        });
    } else {
        console.log('⚠️  Auth0 credentials not configured - using demo mode');
    }
} catch (error) {
    console.log('⚠️  Auth0 client initialization failed:', error.message);
}

// FGA Client Configuration (Optional)
let fgaClient = null;
try {
    if (process.env.FGA_STORE_ID && process.env.FGA_CLIENT_ID) {
        const { OpenFgaClient } = require('@openfga/sdk');
        fgaClient = new OpenFgaClient({
            apiUrl: process.env.FGA_API_URL || 'https://api.fga.dev',
            storeId: process.env.FGA_STORE_ID,
            authorizationModelId: process.env.FGA_MODEL_ID
        });
    }
} catch (error) {
    console.log('FGA not configured, using mock permissions');
}

// Express OpenID Connect configuration
const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.SESSION_SECRET || 'demo-session-secret-for-development-only',
    baseURL: process.env.BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000',
    clientID: AUTH0_CONFIG.clientId,
    issuerBaseURL: `https://${AUTH0_CONFIG.domain}`,
    clientSecret: AUTH0_CONFIG.clientSecret,
    authorizationParams: {
        response_type: 'code',
        audience: AUTH0_CONFIG.audience,
        scope: AUTH0_CONFIG.scope
    },
    afterCallback: async (req, res, session) => {
        // This will be called after successful authentication
        // The Post-Login Action will have enriched the user profile
        const user = session.user;
        
        console.log('User authenticated:', user.sub);
        console.log('User metadata:', user['app_metadata']);
        
        // Check if user data was synced by the Post-Login Action
        if (user['app_metadata']?.is_data_synced) {
            console.log('User profile enriched with:', {
                loyalty_tier: user['app_metadata'].loyalty_tier,
                employee_id: user['app_metadata'].employee_id,
                access_level: user['app_metadata'].access_level
            });
        }
        
        return session;
    }
};

// Basic middleware
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint (must be before auth middleware)
app.get('/api/health', (req, res) => {
    const auth0Configured = !!(
        process.env.AUTH0_DOMAIN && 
        process.env.AUTH0_CLIENT_ID && 
        process.env.AUTH0_CLIENT_SECRET &&
        process.env.AUTH0_DOMAIN !== 'demo.auth0.com' &&
        process.env.AUTH0_CLIENT_ID !== 'demo-client-id'
    );
    
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        auth0_configured: auth0Configured,
        fga_configured: !!(process.env.FGA_STORE_ID && process.env.FGA_CLIENT_ID),
        auth0_domain: process.env.AUTH0_DOMAIN || 'not-set'
    });
});

// Debug endpoint to check environment variables (remove this in production)
app.get('/api/debug-env', (req, res) => {
    res.json({
        AUTH0_DOMAIN: process.env.AUTH0_DOMAIN ? 'SET' : 'NOT SET',
        AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ? 'SET' : 'NOT SET', 
        AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET ? 'SET' : 'NOT SET',
        SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
        BASE_URL: process.env.BASE_URL ? 'SET' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'undefined'
    });
});

// Only apply auth middleware if Auth0 is configured
if (process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET) {
    app.use(auth(config));
} else {
    console.log('⚠️  Auth0 not configured - skipping authentication middleware');
    // Mock authentication for demo mode
    app.use((req, res, next) => {
        req.oidc = {
            isAuthenticated: () => false,
            user: null
        };
        next();
    });
}

// Serve static files
app.use(express.static(__dirname + '/public'));

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.oidc.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Routes

// Main application route
app.get('/', (req, res) => {
    if (req.oidc.isAuthenticated()) {
        // User is authenticated, serve the main app
        res.sendFile(__dirname + '/public/index.html');
    } else {
        // User is not authenticated, show landing page
        res.sendFile(__dirname + '/public/index.html');
    }
});

// API route to get user profile with enriched data
app.get('/api/profile', jwtCheck, async (req, res) => {
    try {
        const user = req.auth; // JWT payload contains user info
        
        // Get detailed user information from Auth0 Management API
        const userDetails = await management.getUser({ id: user.sub });
        
        res.json({
            user: {
                id: user.sub,
                name: user.name,
                email: user.email,
                picture: user.picture,
                // Enriched data from Post-Login Action
                loyalty_tier: userDetails.app_metadata?.loyalty_tier,
                employee_id: userDetails.app_metadata?.employee_id,
                department: userDetails.app_metadata?.department,
                access_level: userDetails.app_metadata?.access_level,
                is_data_synced: userDetails.app_metadata?.is_data_synced
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Token Vault Integration Routes

// Get Google Calendar token
app.get('/api/tokens/google-calendar', jwtCheck, async (req, res) => {
    try {
        const user = req.auth; // JWT payload contains user info
        
        // In a real implementation, this would integrate with Auth0's Token Vault
        // For demo purposes, we'll simulate the token exchange
        const tokenResponse = await simulateTokenVaultExchange(user.sub, 'google-calendar');
        
        res.json({
            access_token: tokenResponse.access_token,
            expires_in: tokenResponse.expires_in,
            scope: TOKEN_VAULT_CONFIG.googleCalendar.scope
        });
    } catch (error) {
        console.error('Error getting Google Calendar token:', error);
        res.status(500).json({ error: 'Failed to get calendar token' });
    }
});

// Get Slack token
app.get('/api/tokens/slack', jwtCheck, async (req, res) => {
    try {
        const user = req.auth; // JWT payload contains user info
        const tokenResponse = await simulateTokenVaultExchange(user.sub, 'slack');
        
        res.json({
            access_token: tokenResponse.access_token,
            expires_in: tokenResponse.expires_in,
            scope: TOKEN_VAULT_CONFIG.slack.scope
        });
    } catch (error) {
        console.error('Error getting Slack token:', error);
        res.status(500).json({ error: 'Failed to get Slack token' });
    }
});

// Fine-Grained Authorization Routes

// Check document access
app.post('/api/fga/check-access', jwtCheck, async (req, res) => {
    try {
        const { resource, relation } = req.body;
        const user = req.auth; // JWT payload contains user info
        
        if (!fgaClient) {
            // Mock permissions for demo when FGA not configured
            const mockPermissions = {
                'document:project-plan:viewer': true,
                'document:requirements:viewer': true,
                'document:requirements:editor': true,
                'document:architecture:viewer': true
            };
            const key = `${resource}:${relation}`;
            res.json({
                allowed: mockPermissions[key] || false,
                resource: resource,
                relation: relation
            });
            return;
        }
        
        const checkResult = await fgaClient.check({
            user: `user:${user.sub}`,
            relation: relation,
            object: resource
        });
        
        res.json({
            allowed: checkResult.allowed,
            resource: resource,
            relation: relation
        });
    } catch (error) {
        console.error('Error checking FGA access:', error);
        res.status(500).json({ error: 'Failed to check access' });
    }
});

// Grant document access
app.post('/api/fga/grant-access', jwtCheck, async (req, res) => {
    try {
        const { resource, relation, targetUser } = req.body;
        const user = req.auth; // JWT payload contains user info
        
        // Check if current user can grant access (must be owner or manager)
        const canGrant = await fgaClient.check({
            user: `user:${user.sub}`,
            relation: 'owner',
            object: resource
        });
        
        if (!canGrant.allowed) {
            return res.status(403).json({ error: 'Insufficient permissions to grant access' });
        }
        
        // Write the relationship
        await fgaClient.write({
            writes: [{
                user: `user:${targetUser}`,
                relation: relation,
                object: resource
            }]
        });
        
        res.json({
            success: true,
            message: `Access granted: ${targetUser} can now ${relation} ${resource}`
        });
    } catch (error) {
        console.error('Error granting FGA access:', error);
        res.status(500).json({ error: 'Failed to grant access' });
    }
});

// Asynchronous Authorization Route
app.post('/api/async-approval', jwtCheck, async (req, res) => {
    try {
        const { action, resource, justification } = req.body;
        const user = req.auth; // JWT payload contains user info
        
        // Store approval request (in production, this would be in a database)
        const approvalRequest = {
            id: generateRequestId(),
            user_id: user.sub,
            user_name: user.name,
            action: action,
            resource: resource,
            justification: justification,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        // In production, this would trigger a notification to managers
        console.log('Approval request created:', approvalRequest);
        
        // Simulate async notification (in production, use webhooks, email, or push notifications)
        setTimeout(() => {
            simulateApprovalDecision(approvalRequest.id);
        }, 5000); // Auto-approve after 5 seconds for demo
        
        res.json({
            request_id: approvalRequest.id,
            status: 'pending',
            message: 'Approval request submitted. You will be notified when approved.'
        });
    } catch (error) {
        console.error('Error creating approval request:', error);
        res.status(500).json({ error: 'Failed to create approval request' });
    }
});

// Helper Functions

async function simulateTokenVaultExchange(userId, service) {
    // In a real implementation, this would integrate with Auth0's Token Vault
    // This is a simulation for demo purposes
    return {
        access_token: `tvault_${service}_${generateToken()}`,
        expires_in: 3600,
        token_type: 'Bearer'
    };
}

function generateRequestId() {
    return 'req_' + Math.random().toString(36).substr(2, 9);
}

function generateToken() {
    return Math.random().toString(36).substr(2, 16);
}

function simulateApprovalDecision(requestId) {
    // In production, this would be handled by a manager or automated system
    console.log(`Approval request ${requestId} has been auto-approved for demo purposes`);
    
    // Notify the frontend (in production, use WebSockets, SSE, or polling)
    // For demo, we'll just log it
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Application error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ AI Project Manager server running on port ${PORT}`);
    console.log(`✅ Auth0 domain: ${AUTH0_CONFIG.domain}`);
    console.log(`✅ Auth0 configured: ${!!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID)}`);
    console.log(`✅ FGA configured: ${!!(process.env.FGA_STORE_ID)}`);
    console.log(`✅ Health check: /api/health`);
});

module.exports = app;