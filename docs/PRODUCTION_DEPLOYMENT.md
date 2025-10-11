# Production Deployment Guide

## Enterprise Readiness Enhancements

This guide covers the enterprise-ready enhancements made to the AI Project Manager application.

## Key Improvements

### 1. Real Auth0 Token Vault Integration

**Before (Demo):**
```javascript
// Simulated token exchange
const tokenResponse = await simulateTokenVaultExchange(user.sub, 'google-calendar');
```

**After (Production):**
```javascript
// Real Token Vault integration
const tokenResponse = await getTokenVaultToken(user.sub, 'google-calendar');
```

**Features:**
- Real Auth0 Management API integration
- Proper error handling for token unavailability
- Fallback to demo mode in development
- Support for Google Calendar, Slack, and GitHub tokens

### 2. Real FGA (Fine-Grained Authorization) Integration

**Before (Demo):**
```javascript
// Mock permissions
const mockPermissions = {
    'document:project-plan:viewer': true,
    // ...
};
```

**After (Production):**
```javascript
// Real FGA SDK integration with OpenFGA
const checkResult = await fgaClient.check({
    user: `user:${user.sub}`,
    relation: relation,
    object: resource
});
```

**Features:**
- Full OpenFGA SDK integration
- Client credentials authentication
- Real-time permission checking
- Audit logging for all permission operations

### 3. Enhanced Error Handling & Monitoring

**New Features:**
- Structured error logging with context
- Security event logging
- Request ID tracing
- Comprehensive health checks
- Kubernetes-compatible probes
- Performance metrics collection

### 4. Enterprise Security Features

**Added Security Measures:**
- Rate limiting (general + auth-specific)
- Security headers (Helmet.js)
- CORS configuration
- Request size limits
- CSP (Content Security Policy)
- Input validation and sanitization

## Environment Variables

### Required for Production

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-production-domain.auth0.com
AUTH0_CLIENT_ID=your_production_client_id
AUTH0_CLIENT_SECRET=your_production_client_secret
AUTH0_AUDIENCE=https://api.your-domain.com
SESSION_SECRET=your_cryptographically_secure_64_char_secret
BASE_URL=https://your-production-domain.com

# FGA Configuration
FGA_API_URL=https://api.fga.dev
FGA_STORE_ID=your_fga_store_id
FGA_MODEL_ID=your_fga_model_id
FGA_CLIENT_ID=your_fga_client_id
FGA_CLIENT_SECRET=your_fga_client_secret

# Production Settings
NODE_ENV=production
TRUST_PROXY=true
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_ENABLED=true
ENABLE_HELMET=true
```

## Deployment Checklist

### 1. Pre-Deployment

- [ ] Set all required environment variables
- [ ] Configure Auth0 Token Vault with external providers
- [ ] Set up FGA store and authorization model
- [ ] Generate secure session secret (64+ characters)
- [ ] Configure CORS origins for production domains

### 2. Security Configuration

- [ ] Enable rate limiting
- [ ] Configure security headers
- [ ] Set up proper CORS policy
- [ ] Enable request logging
- [ ] Configure trusted proxy settings

### 3. Monitoring Setup

- [ ] Health check endpoint: `/api/health`
- [ ] Metrics endpoint: `/api/metrics`
- [ ] Readiness probe: `/api/ready`
- [ ] Liveness probe: `/api/live`
- [ ] Set up log aggregation
- [ ] Configure alerting for error rates

### 4. Performance Optimization

- [ ] Enable compression
- [ ] Set appropriate cache headers
- [ ] Configure static asset serving
- [ ] Optimize bundle sizes
- [ ] Enable gzip compression

## Health Check Endpoints

### `/api/health` - Comprehensive Health Check
Returns detailed health status including:
- Overall system health
- External service connectivity (Auth0, FGA)
- Response times
- Configuration status
- Memory and uptime metrics

### `/api/ready` - Readiness Probe
Kubernetes-compatible readiness check:
- Returns 200 when service is ready to accept traffic
- Returns 503 when service is not ready

### `/api/live` - Liveness Probe
Kubernetes-compatible liveness check:
- Simple alive/dead status
- Used by orchestrators to restart unhealthy containers

### `/api/metrics` - Performance Metrics
Returns system metrics:
- Memory usage
- CPU usage
- Uptime
- Node.js version
- Environment info

## Rate Limiting Configuration

### General API Rate Limiting
- **Window:** 15 minutes (configurable)
- **Limit:** 100 requests per window (configurable)
- **Scope:** All `/api/*` endpoints

### Authentication Rate Limiting
- **Window:** 15 minutes
- **Limit:** 5 attempts per window
- **Scope:** `/login`, `/callback` endpoints

## Security Headers

The application automatically sets these security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: [configured for Auth0 integration]
```

## Error Handling

### Structured Error Responses
All errors return structured JSON:
```json
{
    "error": "Human-readable error message",
    "timestamp": "2025-10-11T10:30:00Z",
    "requestId": "abc123def",
    "details": "Additional context (dev only)"
}
```

### Security Event Logging
All security events are logged with structured data:
- Authentication attempts
- Permission checks
- Rate limit violations
- Server lifecycle events

## FGA Authorization Model

### Required Relations
```
type user

type document
  relations
    define viewer: [user]
    define editor: [user] 
    define owner: [user]

type project
  relations
    define member: [user]
    define manager: [user]
    define owner: [user]

type calendar
  relations
    define reader: [user]
    define writer: [user]
```

## Troubleshooting

### Common Issues

1. **FGA Connection Failed**
   - Verify FGA credentials in environment variables
   - Check FGA API URL accessibility
   - Ensure authorization model is deployed

2. **Token Vault Errors**
   - Verify Auth0 Management API permissions
   - Check if users have connected external accounts
   - Confirm Token Vault is enabled in Auth0 tenant

3. **Rate Limiting Too Aggressive**
   - Adjust `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS`
   - Consider different limits for different user tiers
   - Check if `TRUST_PROXY` is properly configured

4. **Health Check Failures**
   - Check external service connectivity
   - Verify environment variables are set
   - Review application logs for specific errors

## Performance Monitoring

### Key Metrics to Monitor

1. **Response Times**
   - API endpoint response times
   - External service call latencies
   - Health check response times

2. **Error Rates**
   - HTTP error status codes
   - Authentication failures
   - Permission check failures

3. **Resource Usage**
   - Memory consumption
   - CPU utilization
   - Request throughput

4. **Security Events**
   - Rate limit violations
   - Authentication anomalies
   - Permission escalation attempts

## Scaling Considerations

### Horizontal Scaling
- Application is stateless and can be horizontally scaled
- Session data is stored in Auth0, not in application memory
- FGA and Token Vault are external services that scale independently

### Load Balancing
- Configure sticky sessions if needed
- Ensure proper proxy headers for rate limiting
- Health checks should be used by load balancers

### Database Considerations
- Current implementation doesn't use a database
- For production, consider adding Redis for:
  - Rate limiting state (if multiple instances)
  - Temporary approval request storage
  - Caching frequently accessed permissions

This enterprise-ready configuration provides production-grade security, monitoring, and scalability for your AI Project Manager application.