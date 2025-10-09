/**
 * Server-side Auth0 Integration for AI Project Manager
 * This file handles server-side authentication, token management, and FGA integration
 */

const express = require('express');
const { auth } = require('express-openid-connect');
const { ManagementClient, AuthenticationClient } = require('auth0');
const { CredentialsMethod } = require('auth0-fga-sdk');
const axios = require('axios');
const { AUTH0_CONFIG, TOKEN_VAULT_CONFIG, FGA_CONFIG } = require('./auth0-config');

const app = express();

// Auth0 Management Client for user management
const management = new ManagementClient({
    domain: AUTH0_CONFIG.domain,
    clientId: AUTH0_CONFIG.clientId,
    clientSecret: AUTH0_CONFIG.clientSecret,
    scope: 'read:users update:users read:user_metadata update:user_metadata'
});

// Auth0 Authentication Client for token exchange
const auth0Client = new AuthenticationClient({
    domain: AUTH0_CONFIG.domain,
    clientId: AUTH0_CONFIG.clientId,
    clientSecret: AUTH0_CONFIG.clientSecret
});

// FGA Client Configuration
const { OpenFgaClient } = require('@openfga/sdk');
const fgaClient = new OpenFgaClient({
    apiUrl: process.env.FGA_API_URL,
    storeId: FGA_CONFIG.store.id,
    authorizationModelId: FGA_CONFIG.store.authorizationModelId,
    credentials: {
        method: CredentialsMethod.ClientCredentials,
        config: {
            clientId: process.env.FGA_CLIENT_ID,
            clientSecret: process.env.FGA_CLIENT_SECRET
        }
    }
});

// Express OpenID Connect configuration
const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.SESSION_SECRET,
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
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

app.use(auth(config));
app.use(express.json());
app.use(express.static('public'));

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
        res.sendFile(__dirname + '/index.html');
    } else {
        // User is not authenticated, show landing page
        res.sendFile(__dirname + '/index.html');
    }
});

// API route to get user profile with enriched data
app.get('/api/profile', requireAuth, async (req, res) => {
    try {
        const user = req.oidc.user;
        
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
app.get('/api/tokens/google-calendar', requireAuth, async (req, res) => {
    try {
        const user = req.oidc.user;
        
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
app.get('/api/tokens/slack', requireAuth, async (req, res) => {
    try {
        const user = req.oidc.user;
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
app.post('/api/fga/check-access', requireAuth, async (req, res) => {
    try {
        const { resource, relation } = req.body;
        const user = req.oidc.user;
        
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
app.post('/api/fga/grant-access', requireAuth, async (req, res) => {
    try {
        const { resource, relation, targetUser } = req.body;
        const user = req.oidc.user;
        
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
app.post('/api/async-approval', requireAuth, async (req, res) => {
    try {
        const { action, resource, justification } = req.body;
        const user = req.oidc.user;
        
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
    console.log(`AI Project Manager server running on port ${PORT}`);
    console.log(`Auth0 domain: ${AUTH0_CONFIG.domain}`);
    console.log(`FGA Store ID: ${FGA_CONFIG.store.id}`);
});

module.exports = app;