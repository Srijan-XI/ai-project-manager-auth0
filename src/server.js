/**
 * Server-side Auth0 Integration for AI Project Manager
 * This file handles server-side authentication, token management, and FGA integration
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cors = require('cors');
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

// Security middleware
if (process.env.ENABLE_HELMET !== 'false') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.auth0.com"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", `https://${process.env.AUTH0_DOMAIN}`, "https://api.fga.dev"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false
    }));
}

// Compression middleware
app.use(compression());

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Request logging
if (process.env.ENABLE_REQUEST_LOGGING !== 'false') {
    const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
    app.use(morgan(logFormat));
}

// Trust proxy for accurate IP addresses (important for rate limiting)
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

// Rate limiting
if (process.env.RATE_LIMIT_ENABLED !== 'false') {
    const limiter = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        message: {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logSecurityEvent('RATE_LIMIT_EXCEEDED', req.auth?.sub || req.ip, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.url
            });
            res.status(429).json({
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.'
            });
        }
    });
    
    app.use('/api', limiter);
    
    // Stricter rate limiting for authentication endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: {
            error: 'Too many authentication attempts',
            message: 'Too many authentication attempts. Please try again later.'
        }
    });
    
    app.use('/login', authLimiter);
    app.use('/callback', authLimiter);
}

// Real Token Vault configuration
const TOKEN_VAULT_CONFIG = {
    apiUrl: process.env.AUTH0_TOKEN_VAULT_URL || `https://${AUTH0_CONFIG.domain}/api/v2/token-vault`,
    googleCalendar: { 
        scope: 'https://www.googleapis.com/auth/calendar',
        provider: 'google-oauth2',
        connection: 'google-oauth2'
    },
    slack: { 
        scope: 'chat:write,channels:read,users:read',
        provider: 'slack',
        connection: 'slack'
    },
    github: { 
        scope: 'repo,read:org,user:email',
        provider: 'github',
        connection: 'github'
    }
};

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

// FGA Client Configuration
let fgaClient = null;
let fgaConfig = null;

async function initializeFGA() {
    try {
        if (!process.env.FGA_STORE_ID || !process.env.FGA_CLIENT_ID || !process.env.FGA_CLIENT_SECRET) {
            console.log('FGA not configured - some variables missing');
            return;
        }
        
        const { OpenFgaClient, CredentialsMethod } = require('@openfga/sdk');
        
        fgaConfig = {
            apiUrl: process.env.FGA_API_URL || 'https://api.fga.dev',
            storeId: process.env.FGA_STORE_ID,
            authorizationModelId: process.env.FGA_MODEL_ID
        };
        
        fgaClient = new OpenFgaClient({
            apiUrl: fgaConfig.apiUrl,
            storeId: fgaConfig.storeId,
            authorizationModelId: fgaConfig.authorizationModelId,
            credentials: {
                method: CredentialsMethod.ClientCredentials,
                config: {
                    clientId: process.env.FGA_CLIENT_ID,
                    clientSecret: process.env.FGA_CLIENT_SECRET,
                    apiTokenIssuer: process.env.FGA_API_TOKEN_ISSUER || fgaConfig.apiUrl,
                    apiAudience: process.env.FGA_API_AUDIENCE || fgaConfig.apiUrl
                }
            }
        });
        
        // Test FGA connection
        await fgaClient.listStores();
        console.log('✅ FGA client initialized successfully');
        
    } catch (error) {
        console.error('❌ FGA initialization failed:', error.message);
        fgaClient = null;
    }
}

// Initialize FGA on startup
initializeFGA();

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware for tracing
app.use((req, res, next) => {
    req.id = Math.random().toString(36).substr(2, 9);
    res.setHeader('X-Request-ID', req.id);
    next();
});

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// Serve static assets from client folder
app.use(express.static(path.join(__dirname, '../client'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true
}));

// Enhanced health check endpoint with comprehensive monitoring
app.get('/api/health', async (req, res) => {
    const startTime = Date.now();
    
    const auth0Configured = !!(
        process.env.AUTH0_DOMAIN && 
        process.env.AUTH0_CLIENT_ID && 
        process.env.AUTH0_CLIENT_SECRET &&
        process.env.AUTH0_DOMAIN !== 'demo.auth0.com' &&
        process.env.AUTH0_CLIENT_ID !== 'demo-client-id'
    );
    
    const fgaConfigured = !!(process.env.FGA_STORE_ID && process.env.FGA_CLIENT_ID && process.env.FGA_CLIENT_SECRET);
    
    // Test external service connectivity
    const serviceChecks = {
        auth0: { status: 'unknown', responseTime: null },
        fga: { status: 'unknown', responseTime: null },
        tokenVault: { status: 'unknown', responseTime: null }
    };
    
    // Check Auth0 connectivity
    if (auth0Configured && management) {
        try {
            const auth0Start = Date.now();
            await management.getUsers({ per_page: 1 });
            serviceChecks.auth0 = {
                status: 'healthy',
                responseTime: Date.now() - auth0Start
            };
        } catch (error) {
            serviceChecks.auth0 = {
                status: 'unhealthy',
                error: error.message,
                responseTime: Date.now() - auth0Start
            };
        }
    } else {
        serviceChecks.auth0.status = auth0Configured ? 'unconfigured' : 'disabled';
    }
    
    // Check FGA connectivity
    if (fgaConfigured && fgaClient) {
        try {
            const fgaStart = Date.now();
            await fgaClient.listStores({ pageSize: 1 });
            serviceChecks.fga = {
                status: 'healthy',
                responseTime: Date.now() - fgaStart
            };
        } catch (error) {
            serviceChecks.fga = {
                status: 'unhealthy',
                error: error.message,
                responseTime: Date.now() - fgaStart
            };
        }
    } else {
        serviceChecks.fga.status = fgaConfigured ? 'unconfigured' : 'disabled';
    }
    
    // Token Vault is part of Auth0, so inherit its status
    serviceChecks.tokenVault.status = serviceChecks.auth0.status === 'healthy' ? 'healthy' : serviceChecks.auth0.status;
    
    const overallHealthy = Object.values(serviceChecks).every(check => 
        check.status === 'healthy' || check.status === 'disabled'
    );
    
    const healthReport = {
        status: overallHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        responseTime: Date.now() - startTime,
        services: serviceChecks,
        configuration: {
            auth0_configured: auth0Configured,
            fga_configured: fgaConfigured,
            auth0_domain: process.env.AUTH0_DOMAIN || 'not-set',
            base_url: process.env.BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
        }
    };
    
    // Return appropriate status code
    const statusCode = overallHealthy ? 200 : 503;
    res.status(statusCode).json(healthReport);
});

// Metrics endpoint for monitoring
app.get('/api/metrics', (req, res) => {
    const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    };
    
    res.json(metrics);
});

// Readiness probe (Kubernetes compatible)
app.get('/api/ready', async (req, res) => {
    try {
        // Check if essential services are ready
        const isReady = !!(management || process.env.NODE_ENV === 'development');
        
        if (isReady) {
            res.status(200).json({ status: 'ready' });
        } else {
            res.status(503).json({ status: 'not ready', reason: 'Essential services not initialized' });
        }
    } catch (error) {
        res.status(503).json({ status: 'not ready', error: error.message });
    }
});

// Liveness probe (Kubernetes compatible)
app.get('/api/live', (req, res) => {
    res.status(200).json({ 
        status: 'alive',
        timestamp: new Date().toISOString() 
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

// Remove legacy public static folder (no-op in new structure)
// app.use(express.static(__dirname + '/public'));

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
    // Serve SPA index from client folder regardless of auth state
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// API route to get user profile with enriched data
app.get('/api/profile', jwtCheck, async (req, res) => {
    try {
        const user = req.auth; // JWT payload contains user info
        
        // If management client isn't configured, return basic JWT info in demo mode
        let userDetails = { app_metadata: {} };
        if (management) {
            // Get detailed user information from Auth0 Management API
            userDetails = await management.getUser({ id: user.sub });
        }
        
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
        
        if (!management) {
            return res.status(503).json({ 
                error: 'Token Vault not configured',
                message: 'Auth0 Management API not available'
            });
        }
        
        // Real Token Vault integration
        const tokenResponse = await getTokenVaultToken(user.sub, 'google-calendar');
        
        if (!tokenResponse.success) {
            return res.status(400).json({
                error: 'Token unavailable',
                message: tokenResponse.message || 'Unable to retrieve Google Calendar token'
            });
        }
        
        res.json({
            access_token: tokenResponse.access_token,
            expires_in: tokenResponse.expires_in,
            scope: TOKEN_VAULT_CONFIG.googleCalendar.scope,
            token_type: 'Bearer'
        });
    } catch (error) {
        console.error('Error getting Google Calendar token:', error);
        res.status(500).json({ 
            error: 'Token retrieval failed',
            message: 'Internal error retrieving calendar token'
        });
    }
});

// Get Slack token
app.get('/api/tokens/slack', jwtCheck, async (req, res) => {
    try {
        const user = req.auth; // JWT payload contains user info
        
        if (!management) {
            return res.status(503).json({ 
                error: 'Token Vault not configured',
                message: 'Auth0 Management API not available'
            });
        }
        
        const tokenResponse = await getTokenVaultToken(user.sub, 'slack');
        
        if (!tokenResponse.success) {
            return res.status(400).json({
                error: 'Token unavailable',
                message: tokenResponse.message || 'Unable to retrieve Slack token'
            });
        }
        
        res.json({
            access_token: tokenResponse.access_token,
            expires_in: tokenResponse.expires_in,
            scope: TOKEN_VAULT_CONFIG.slack.scope,
            token_type: 'Bearer'
        });
    } catch (error) {
        console.error('Error getting Slack token:', error);
        res.status(500).json({ 
            error: 'Token retrieval failed',
            message: 'Internal error retrieving Slack token'
        });
    }
});

// Fine-Grained Authorization Routes

// Check document access
app.post('/api/fga/check-access', jwtCheck, async (req, res) => {
    try {
        const { resource, relation } = req.body;
        const user = req.auth; // JWT payload contains user info
        
        if (!resource || !relation) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Resource and relation are required'
            });
        }
        
        if (!fgaClient) {
            // Enhanced mock permissions for development
            const mockPermissions = getMockPermissions(user.sub);
            const key = `${resource}:${relation}`;
            
            res.json({
                allowed: mockPermissions[key] || false,
                resource: resource,
                relation: relation,
                source: 'mock'
            });
            return;
        }
        
        // Real FGA check
        const checkResult = await fgaClient.check({
            user: `user:${user.sub}`,
            relation: relation,
            object: resource
        });
        
        // Log the permission check for audit
        console.log(`FGA Check: user:${user.sub} ${relation} ${resource} = ${checkResult.allowed}`);
        
        res.json({
            allowed: checkResult.allowed,
            resource: resource,
            relation: relation,
            source: 'fga',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error checking FGA access:', error);
        res.status(500).json({ 
            error: 'Permission check failed',
            message: 'Unable to verify access permissions'
        });
    }
});

// Grant document access
app.post('/api/fga/grant-access', jwtCheck, async (req, res) => {
    try {
        const { resource, relation, targetUser } = req.body;
        const user = req.auth; // JWT payload contains user info
        
        if (!resource || !relation || !targetUser) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Resource, relation, and targetUser are required'
            });
        }
        
        if (!fgaClient) {
            // In demo mode, simulate success
            console.log(`Mock grant: ${targetUser} granted ${relation} on ${resource} by ${user.sub}`);
            return res.json({
                success: true,
                message: `[Demo] Access granted: ${targetUser} can now ${relation} ${resource}`,
                source: 'mock'
            });
        }
        
        // Check if current user has permission to grant access
        const canGrantCheck = await fgaClient.check({
            user: `user:${user.sub}`,
            relation: 'owner',
            object: resource
        });
        
        if (!canGrantCheck.allowed) {
            // Also check if user is a manager of the resource
            const isManagerCheck = await fgaClient.check({
                user: `user:${user.sub}`,
                relation: 'manager',
                object: resource
            });
            
            if (!isManagerCheck.allowed) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    message: 'You must be an owner or manager to grant access to this resource'
                });
            }
        }
        
        // Write the relationship tuple
        const writeResult = await fgaClient.write({
            writes: [{
                user: `user:${targetUser}`,
                relation: relation,
                object: resource
            }]
        });
        
        // Log the permission grant for audit
        console.log(`FGA Grant: ${user.sub} granted ${relation} on ${resource} to ${targetUser}`);
        
        res.json({
            success: true,
            message: `Access granted: ${targetUser} can now ${relation} ${resource}`,
            source: 'fga',
            timestamp: new Date().toISOString(),
            grantedBy: user.sub
        });
        
    } catch (error) {
        console.error('Error granting FGA access:', error);
        res.status(500).json({ 
            error: 'Permission grant failed',
            message: 'Unable to grant access permissions'
        });
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

// Real Token Vault integration
async function getTokenVaultToken(userId, service) {
    try {
        if (!management) {
            throw new Error('Auth0 Management API not configured');
        }
        
        const config = TOKEN_VAULT_CONFIG[service];
        if (!config) {
            throw new Error(`Service ${service} not configured`);
        }
        
        // Use Auth0 Management API to get token from Token Vault
        const tokenRequest = {
            user_id: userId,
            connection: config.connection,
            scope: config.scope
        };
        
        // Call Auth0 Token Vault API
        const response = await management.getAccessToken(tokenRequest);
        
        if (!response || !response.access_token) {
            return {
                success: false,
                message: `No ${service} token available for user. User may need to connect their ${service} account.`
            };
        }
        
        return {
            success: true,
            access_token: response.access_token,
            expires_in: response.expires_in || 3600,
            refresh_token: response.refresh_token,
            scope: response.scope || config.scope
        };
        
    } catch (error) {
        console.error(`Token Vault error for ${service}:`, error);
        
        // Fallback to demo mode if Token Vault not available
        if (process.env.NODE_ENV === 'development') {
            console.warn(`Falling back to demo token for ${service}`);
            return {
                success: true,
                access_token: `demo_${service}_${generateToken()}`,
                expires_in: 3600,
                scope: TOKEN_VAULT_CONFIG[service].scope
            };
        }
        
        return {
            success: false,
            message: `Failed to retrieve ${service} token: ${error.message}`
        };
    }
}

// Enhanced mock permissions for development
function getMockPermissions(userId) {
    return {
        'document:project-plan:viewer': true,
        'document:project-plan:editor': userId.includes('admin'),
        'document:project-plan:owner': userId.includes('admin'),
        'document:requirements:viewer': true,
        'document:requirements:editor': true,
        'document:requirements:owner': userId.includes('admin'),
        'document:architecture:viewer': true,
        'document:architecture:editor': userId.includes('admin'),
        'project:alpha-release:member': true,
        'project:alpha-release:manager': userId.includes('admin'),
        'project:alpha-release:owner': userId.includes('admin'),
        'calendar:team-calendar:reader': true,
        'calendar:team-calendar:writer': userId.includes('admin')
    };
}

// Logging utility
function logSecurityEvent(event, userId, details = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event: event,
        userId: userId,
        ...details
    };
    
    console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
        // Example: send to logging service
        // await sendToLoggingService(logEntry);
    }
}

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

// Enhanced error handling middleware
app.use((error, req, res, next) => {
    // Log the error with context
    const errorContext = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.auth?.sub || 'anonymous',
        errorMessage: error.message,
        errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    console.error('[ERROR]', JSON.stringify(errorContext, null, 2));
    
    // Log security events for specific error types
    if (error.status === 401 || error.status === 403) {
        logSecurityEvent('ACCESS_DENIED', req.auth?.sub || 'anonymous', {
            method: req.method,
            url: req.url,
            errorMessage: error.message
        });
    }
    
    // Categorize errors and provide appropriate responses
    let statusCode = 500;
    let clientMessage = 'Internal server error';
    
    if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        clientMessage = 'Authentication required';
    } else if (error.name === 'ValidationError') {
        statusCode = 400;
        clientMessage = 'Invalid request data';
    } else if (error.status) {
        statusCode = error.status;
        clientMessage = error.message;
    }
    
    // Send structured error response
    res.status(statusCode).json({
        error: clientMessage,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown',
        ...(process.env.NODE_ENV === 'development' && { 
            details: error.message,
            stack: error.stack 
        })
    });
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
    const notFoundContext = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    };
    
    console.warn('[404]', JSON.stringify(notFoundContext));
    
    res.status(404).json({
        error: 'Resource not found',
        message: `The requested resource ${req.method} ${req.originalUrl} was not found`,
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown handling
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logSecurityEvent('UNHANDLED_REJECTION', 'system', { 
        reason: reason?.message || reason,
        stack: reason?.stack 
    });
    
    // In production, you might want to exit the process
    if (process.env.NODE_ENV === 'production') {
        gracefulShutdown('UNHANDLED_REJECTION');
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    logSecurityEvent('UNCAUGHT_EXCEPTION', 'system', { 
        error: error.message,
        stack: error.stack 
    });
    
    // Always exit on uncaught exception
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`✅ AI Project Manager server running on port ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Auth0 domain: ${AUTH0_CONFIG.domain}`);
    console.log(`✅ Auth0 configured: ${!!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID)}`);
    console.log(`✅ FGA configured: ${!!(process.env.FGA_STORE_ID)}`);
    console.log(`✅ Rate limiting enabled: ${process.env.RATE_LIMIT_ENABLED !== 'false'}`);
    console.log(`✅ Security headers enabled: ${process.env.ENABLE_HELMET !== 'false'}`);
    console.log(`✅ Health check: /api/health`);
    console.log(`✅ Metrics: /api/metrics`);
    console.log(`✅ Ready probe: /api/ready`);
    console.log(`✅ Live probe: /api/live`);
    
    // Log startup security event
    logSecurityEvent('SERVER_STARTED', 'system', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        auth0Configured: !!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID),
        fgaConfigured: !!(process.env.FGA_STORE_ID),
        securityEnabled: process.env.ENABLE_HELMET !== 'false'
    });
});

// Graceful shutdown with timeout
const gracefulShutdown = (signal) => {
    console.log(`${signal} received, starting graceful shutdown`);
    
    logSecurityEvent('SERVER_SHUTDOWN_INITIATED', 'system', { signal });
    
    server.close((err) => {
        if (err) {
            console.error('Error during server shutdown:', err);
            process.exit(1);
        }
        
        console.log('Server closed successfully');
        logSecurityEvent('SERVER_SHUTDOWN_COMPLETED', 'system', { signal });
        process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};

module.exports = app;