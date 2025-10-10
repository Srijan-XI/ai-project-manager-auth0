# AI Project Manager with Auth0 for AI Agents

A comprehensive demonstration of building secure agentic AI applications using Auth0 for AI Agents. This project showcases Universal Login, Token Vault, Fine-Grained Authorization (FGA), and Asynchronous Authorization working together to create enterprise-ready AI agents.

## 📁 Project Structure

```
├── client/           # Frontend files (HTML, CSS, JS)
│   ├── css/         # Stylesheets
│   ├── js/          # Client-side JavaScript
│   └── index.html   # Main HTML file
├── config/          # Configuration files
│   ├── auth0-config.js
│   └── external-setup-validator.js
├── docs/            # Documentation
├── scripts/         # Setup and utility scripts
│   ├── EXTERNAL_SETUP.md
│   ├── GITHUB-PAGES-SETUP.md
│   ├── NO-DOMAIN-QUICKSTART.md
│   └── setup.js
├── src/             # Server-side source code
│   └── server.js    # Main Express server
├── tests/           # Test files
│   └── integration.test.js
└── package.json     # Project dependencies and scripts
```

## 🌐 Live Demo

**Production URL**: https://ai-project-manager-auth0.vercel.app/

- **Health Check**: https://ai-project-manager-auth0.vercel.app/api/health
- **Source Code**: https://github.com/Srijan-XI/ai-project-manager-auth0


<a href="https://github.com/Srijan-XI"><img width="100%" loading="lazy" src="assets/demo1.png" /></a>
<a href="https://github.com/Srijan-XI"><img width="100%" loading="lazy" src="assets/demo2.png" /></a>

## 🔒 Security Features Demonstrated

### 1. **Universal Login**
- Secure user authentication with OAuth 2.0
- Post-Login Actions for user profile enrichment
- Token-based authentication with JWT

### 2. **Token Vault** 
- Secure API token management for third-party services
- Automatic token refresh and rotation
- Support for Google Calendar, Slack, and GitHub APIs

### 3. **Fine-Grained Authorization (FGA)**
- Document-level access control
- Role-based permissions (viewer, editor, owner)
- Real-time permission checking

### 4. **Asynchronous Authorization**
- Human-in-the-loop approval workflows
- Async approval requests for sensitive actions
- Audit trail and compliance logging

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Express.js     │    │     Auth0       │
│   (app.js)      │◄──►│   Server         │◄──►│   Services      │
│                 │    │   (server.js)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Auth0 Config  │    │   Token Vault    │    │   Post-Login    │
│  (auth0-config) │    │   Integration    │    │    Action       │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
ai-project-manager-auth0/
├── index.html                          # Main application interface
├── app.js                             # Frontend application logic
├── style.css                          # Application styling
├── server.js                          # Express.js server with Auth0 integration
├── auth0-config.js                    # Auth0 configuration
├── auth0-post-login-action.js         # Auth0 Post-Login Action code
├── auth0-token-exchange-blog-post.md  # Technical blog post
├── auth0-ai-agents-submission.md      # DEV.to challenge submission
├── package.json                       # Node.js dependencies
├── .env.example                       # Environment variables template
└── README.md                          # This file
```

## 🚀 Quick Start

### 🏃‍♂️ Super Quick Start (No Domain Required!)

**Don't have a domain?** No problem! See [`NO-DOMAIN-QUICKSTART.md`](./NO-DOMAIN-QUICKSTART.md) for a 15-minute setup guide.

### Prerequisites

- Node.js 16+ and npm 8+
- Auth0 account (free tier available)
- Optional: FGA store configured in Auth0

### 1. Clone and Install

```bash
git clone https://github.com/Srijan-XI/ai-project-manager-auth0.git
cd ai-project-manager-auth0
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Auth0 credentials
```

### 3. Set Up Auth0

#### Universal Login Configuration
```javascript
// In Auth0 Dashboard > Applications > Settings
Allowed Callback URLs: http://localhost:3000/callback
Allowed Logout URLs: http://localhost:3000
Allowed Web Origins: http://localhost:3000
```

#### Post-Login Action Setup
1. Go to Auth0 Dashboard > Actions > Flows > Login
2. Create new action with code from `auth0-post-login-action.js`
3. Add action to Login flow

#### FGA Configuration
1. Create FGA store in Auth0 Dashboard
2. Define authorization model:
```json
{
  "type_definitions": [
    {
      "type": "user"
    },
    {
      "type": "document",
      "relations": {
        "viewer": {
          "this": {}
        },
        "editor": {
          "this": {}
        },
        "owner": {
          "this": {}
        }
      }
    }
  ]
}
```

### 4. Start the Application

```bash
npm start
# or for development
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🔧 Configuration Details

### Auth0 Configuration (`auth0-config.js`)

The configuration file centralizes all Auth0 settings:

```javascript
const AUTH0_CONFIG = {
    domain: 'your-domain.auth0.com',
    clientId: 'your_client_id',
    audience: 'https://api.ai-project-manager.com',
    scope: 'openid profile email read:projects write:projects manage:calendar'
};
```

### Server Integration (`server.js`)

The Express.js server provides:

- **Authentication Routes**: Login, logout, callback handling
- **API Endpoints**: User profile, permissions, token management
- **FGA Integration**: Permission checking and granting
- **Token Vault**: Secure third-party API token management
- **Async Authorization**: Approval workflow management

### Frontend Integration (`app.js`)

The frontend application includes:

- **Authentication State Management**: User session and permissions
- **FGA Permission Checking**: Real-time authorization
- **Token Vault Integration**: Secure API calls
- **Async Approval Workflows**: User-friendly approval requests

## 🔐 Security Implementation

### 1. Post-Login Action

The `auth0-post-login-action.js` demonstrates:

```javascript
// Check if user data needs enrichment
const isDataSynced = user.app_metadata?.is_data_synced;

if (!isDataSynced) {
    // Fetch data from external API
    const userData = await api.fetch(externalApiUrl);
    
    // Update user profile
    api.user.setAppMetadata("loyalty_tier", userData.loyalty_tier);
    api.user.setAppMetadata("is_data_synced", true);
}
```

### 2. Fine-Grained Authorization

Real-time permission checking:

```javascript
async function viewDocument(docId) {
    const resource = `document:${docId}`;
    
    if (hasPermission(resource, 'owner')) {
        // Full access
    } else if (hasPermission(resource, 'editor')) {
        // Edit access
    } else if (hasPermission(resource, 'viewer')) {
        // Read-only access
    } else {
        // Request access through async authorization
        await requestDocumentAccess(resource, 'viewer');
    }
}
```

### 3. Token Vault Integration

Secure third-party API access:

```javascript
async function refreshCalendarData() {
    const calendarToken = getTokenVaultToken('google-calendar');
    
    if (!calendarToken) {
        // Refresh token through Token Vault
        const tokenData = await fetch('/api/tokens/google-calendar');
        appState.tokenVaultTokens.set('google-calendar', tokenData);
    }
    
    // Use token for Google Calendar API calls
}
```

### 4. Asynchronous Authorization

Human-in-the-loop approval:

```javascript
async function requestDocumentAccess(resource, relation) {
    const response = await fetch('/api/async-approval', {
        method: 'POST',
        body: JSON.stringify({
            action: 'access_document',
            resource: resource,
            justification: `User needs ${relation} access for project work`
        })
    });
    
    // Track approval request status
    updateApprovalRequestsDisplay();
}
```

## 📊 Features Demonstrated

### Dashboard Features

1. **Project Overview**: Displays project status with FGA-controlled access
2. **Document Management**: Role-based document access (viewer/editor/owner)
3. **Calendar Integration**: Token Vault-secured Google Calendar sync
4. **Chat Interface**: AI assistant with security context
5. **Approval Workflow**: Async authorization for sensitive actions
6. **Security Logs**: Comprehensive audit trail

### Security Benefits

- **Zero Trust Architecture**: Every action is authenticated and authorized
- **Principle of Least Privilege**: Users only get minimum required permissions
- **Secure Token Management**: No hardcoded API keys or tokens
- **Audit Trail**: Complete logging of all security events
- **Compliance Ready**: Enterprise-grade security controls

## 🧪 Testing the Integration

### 1. Authentication Flow

1. Visit the application
2. Click "Login with Auth0"
3. Complete authentication
4. Observe enriched user profile from Post-Login Action

### 2. FGA Permissions

1. Try accessing different documents
2. Note different permission levels (viewer/editor/owner)
3. Request access to restricted documents
4. See async approval workflow

### 3. Token Vault

1. Click "Refresh Calendar"
2. Observe secure token retrieval
3. Check network tab for secure API calls

### 4. Async Authorization

1. Request approval for sensitive action
2. See approval request in dashboard
3. Track approval status

## 📚 Learning Resources

### Blog Post
See `auth0-token-exchange-blog-post.md` for a detailed technical explanation of the OAuth 2.0 token exchange process.

### Submission Article
See `auth0-ai-agents-submission.md` for the complete DEV.to challenge submission with implementation details.

## 🚀 Deployment

### Environment Setup

1. Update `.env` with production values
2. Configure Auth0 for production domain
3. Set up FGA store in production
4. Deploy to your preferred platform (Vercel, Heroku, AWS, etc.)

### Production Considerations

- Use HTTPS for all communications
- Implement proper error handling and logging
- Set up monitoring and alerting
- Configure rate limiting and DDoS protection
- Implement proper session management
- Use secure headers and CORS policies

## 🛠️ Vercel & Auth0 Deployment Checklist

### 1. Set Environment Variables in Vercel

Add these in your Vercel project dashboard (Settings → Environment Variables):

```
AUTH0_DOMAIN=genai-864988247141573.us.auth0.com
AUTH0_CLIENT_ID=your_client_id_from_auth0
AUTH0_CLIENT_SECRET=your_client_secret_from_auth0
AUTH0_AUDIENCE=https://api.ai-project-manager.com
SESSION_SECRET=your_random_64_char_string
BASE_URL=https://ai-project-manager-auth0.vercel.app
```

- **Copy-paste values directly from your Auth0 dashboard.**
- Make sure to use zero (`0`) not letter O in `auth0.com`.
- Set for **All Environments** (Production, Preview, Development).

### 2. Redeploy After Setting Variables
- After saving, trigger a redeploy in Vercel to apply changes.

### 3. Verify Health Check
- Visit: `https://ai-project-manager-auth0.vercel.app/api/health`
- You should see:

```json
{
  "status": "ok",
  "auth0_configured": true,
  ...
}
```

If `auth0_configured` is `false`, double-check your variable names and values, then redeploy.

### 4. Test Login Flow
- Visit: `https://ai-project-manager-auth0.vercel.app/`
- Click **Login** and complete Auth0 authentication.
- You should be redirected back to your app.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper tests
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙋‍♂️ Support

For questions about this implementation:

1. Check the Auth0 Documentation
2. Review the code comments
3. Open an issue in this repository
4. Contact the Auth0 community

## 🏆 Auth0 for AI Agents Challenge

This project was created for the Auth0 for AI Agents Challenge on DEV.to, demonstrating how Auth0's security features can transform AI agents from security liabilities into enterprise-ready solutions.

**Key Achievements:**
- ✅ Universal Login implementation
- ✅ Token Vault integration
- ✅ Fine-Grained Authorization
- ✅ Asynchronous Authorization
- ✅ Post-Login Actions
- ✅ Comprehensive security logging
- ✅ Production-ready architecture

---

*Built with ❤️ and 🔒 by Srijan Kumar for the Auth0 for AI Agents Challenge*# ai-project-manager-auth0
