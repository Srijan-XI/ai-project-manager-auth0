# External Setup Guide for AI Project Manager with Auth0

## 🚀 Complete External Setup Instructions

This guide walks you through setting up all external services required for the AI Project Manager application.

## 📋 Prerequisites

- Node.js 16+ installed
- Git installed
- Auth0 account (free tier available)
- Google account (for Calendar API)
- Slack workspace (optional)
- GitHub account (optional)

**📌 Note: You DON'T need your own domain to get started!**
This guide shows you how to run everything locally first, then deploy for free.

---

## 🔐 Part 1: Auth0 Setup

### Step 1: Create Auth0 Account & Application

1. **Sign up for Auth0**:
   - Go to [https://auth0.com](https://auth0.com)
   - Click "Sign up for free"
   - Choose "Personal" account type
   - Verify your email

2. **Create a New Application**:
   ```
   Auth0 Dashboard > Applications > Create Application
   Name: "AI Project Manager"
   Type: "Regular Web Applications"
   Technology: Node.js
   ```

3. **Configure Application Settings** (Start with localhost only):
   ```
   Application Settings Tab:
   
   Allowed Callback URLs:
   http://localhost:3000/callback
   
   Allowed Logout URLs:
   http://localhost:3000
   
   Allowed Web Origins:
   http://localhost:3000
   
   Allowed Origins (CORS):
   http://localhost:3000
   ```

   **💡 Pro Tip**: Start with localhost URLs only. You can add production URLs later when you deploy!

4. **Save Your Credentials**:
   ```
   Note down from Settings tab:
   - Domain: your-domain.auth0.com
   - Client ID: abc123...
   - Client Secret: xyz789... (keep secret!)
   ```

### Step 2: Configure Auth0 API

1. **Create an API**:
   ```
   Auth0 Dashboard > APIs > Create API
   Name: "AI Project Manager API"
   Identifier: https://api.ai-project-manager.com
   Signing Algorithm: RS256
   ```

2. **Configure API Settings**:
   ```
   Settings Tab:
   ✅ Enable RBAC
   ✅ Add Permissions in the Access Token
   
   Permissions Tab - Add these scopes:
   - read:profile
   - read:projects
   - write:projects
   - manage:calendar
   - access:documents
   ```

### Step 3: Set Up Post-Login Action

1. **Navigate to Actions**:
   ```
   Auth0 Dashboard > Actions > Flows > Login
   ```

2. **Create New Action**:
   ```
   Click "+" > Build from scratch
   Name: "User Profile Enrichment"
   Trigger: Login / Post Login
   Runtime: Node 18
   ```

3. **Add the Code**:
   ```javascript
   // Copy the complete code from auth0-post-login-action.js
   // Update the API endpoint URL to your external service
   ```

4. **Add Dependencies** (if needed):
   ```
   Dependencies tab:
   axios: 1.6.0
   ```

5. **Configure Secrets**:
   ```
   Secrets tab:
   EXTERNAL_API_TOKEN: your-external-api-token
   EXTERNAL_API_KEY: your-external-api-key
   ```

6. **Deploy and Add to Flow**:
   ```
   Click "Deploy"
   Drag action to the Login flow
   Click "Apply"
   ```

---

## 🔑 Part 2: Fine-Grained Authorization (FGA) Setup

### Step 1: Enable FGA in Auth0

1. **Access FGA**:
   ```
   Auth0 Dashboard > Extensions > Fine Grained Authorization
   Or visit: https://dashboard.fga.dev
   ```

2. **Create Authorization Store**:
   ```
   Click "Create Store"
   Store Name: "ai-project-manager"
   ```

### Step 2: Create Authorization Model

1. **Define the Model**:
   ```json
   {
     "schema_version": "1.1",
     "type_definitions": [
       {
         "type": "user"
       },
       {
         "type": "document",
         "relations": {
           "owner": {
             "this": {}
           },
           "editor": {
             "union": {
               "child": [
                 {
                   "this": {}
                 },
                 {
                   "computedUserset": {
                     "relation": "owner"
                   }
                 }
               ]
             }
           },
           "viewer": {
             "union": {
               "child": [
                 {
                   "this": {}
                 },
                 {
                   "computedUserset": {
                     "relation": "editor"
                   }
                 }
               ]
             }
           }
         },
         "metadata": {
           "relations": {
             "owner": {
               "directly_related_user_types": [
                 {
                   "type": "user"
                 }
               ]
             },
             "editor": {
               "directly_related_user_types": [
                 {
                   "type": "user"
                 }
               ]
             },
             "viewer": {
               "directly_related_user_types": [
                 {
                   "type": "user"
                 }
               ]
             }
           }
         }
       },
       {
         "type": "project",
         "relations": {
           "owner": {
             "this": {}
           },
           "manager": {
             "union": {
               "child": [
                 {
                   "this": {}
                 },
                 {
                   "computedUserset": {
                     "relation": "owner"
                   }
                 }
               ]
             }
           },
           "member": {
             "union": {
               "child": [
                 {
                   "this": {}
                 },
                 {
                   "computedUserset": {
                     "relation": "manager"
                   }
                 }
               ]
             }
           }
         },
         "metadata": {
           "relations": {
             "owner": {
               "directly_related_user_types": [
                 {
                   "type": "user"
                 }
               ]
             },
             "manager": {
               "directly_related_user_types": [
                 {
                   "type": "user"
                 }
               ]
             },
             "member": {
               "directly_related_user_types": [
                 {
                   "type": "user"
                 }
               ]
             }
           }
         }
       }
     ]
   }
   ```

2. **Save Model and Get IDs**:
   ```
   Note down:
   - Store ID: 01ARZ3NDEKTSV4RRFFQ69G5FAV
   - Authorization Model ID: 01ARZ3NDEKTSV4RRFFQ69G5FAV
   ```

### Step 3: Create Test Data

1. **Add Relationship Tuples**:
   ```json
   [
     {
       "user": "user:auth0|123456789",
       "relation": "owner",
       "object": "document:project-plan"
     },
     {
       "user": "user:auth0|123456789",
       "relation": "editor",
       "object": "document:requirements"
     },
     {
       "user": "user:auth0|123456789",
       "relation": "viewer",
       "object": "document:architecture"
     }
   ]
   ```

### Step 4: Get API Credentials

1. **Create API Token**:
   ```
   FGA Dashboard > Settings > API Tokens > Create Token
   Name: "AI Project Manager"
   Scopes: Read, Write
   ```

2. **Note Credentials**:
   ```
   API URL: https://api.fga.dev
   Client ID: your-fga-client-id
   Client Secret: your-fga-client-secret
   ```

---

## 🔗 Part 3: Token Vault Setup (Third-Party APIs)

### Google Calendar API Setup

1. **Google Cloud Console**:
   ```
   Go to: https://console.cloud.google.com
   Create new project: "AI Project Manager"
   ```

2. **Enable Calendar API**:
   ```
   APIs & Services > Library
   Search: "Google Calendar API"
   Click "Enable"
   ```

3. **Create OAuth Credentials**:
   ```
   APIs & Services > Credentials > Create Credentials > OAuth client ID
   Application type: Web application
   Name: "AI Project Manager Auth0"
   
   Authorized redirect URIs:
   https://your-domain.auth0.com/login/callback
   ```

4. **Configure Auth0 Social Connection**:
   ```
   Auth0 Dashboard > Authentication > Social
   Click "Google"
   
   Client ID: [from Google Console]
   Client Secret: [from Google Console]
   
   Scopes: email profile openid https://www.googleapis.com/auth/calendar
   ```

### Slack API Setup (Optional)

1. **Create Slack App**:
   ```
   Go to: https://api.slack.com/apps
   Click "Create New App"
   From scratch: "AI Project Manager"
   Select your workspace
   ```

2. **Configure OAuth**:
   ```
   OAuth & Permissions:
   Redirect URLs: https://your-domain.auth0.com/login/callback
   
   Scopes:
   - chat:write
   - channels:read
   - users:read
   ```

3. **Configure Auth0 Social Connection**:
   ```
   Auth0 Dashboard > Authentication > Social
   Create Custom Social Connection for Slack
   ```

### GitHub API Setup (Optional)

1. **Create GitHub App**:
   ```
   GitHub Settings > Developer settings > OAuth Apps
   New OAuth App:
   Application name: "AI Project Manager"
   Authorization callback URL: https://your-domain.auth0.com/login/callback
   ```

2. **Configure Auth0 Social Connection**:
   ```
   Auth0 Dashboard > Authentication > Social
   Click "GitHub"
   Client ID & Secret from GitHub
   ```

---

## 🗄️ Part 4: External Database Setup (for Post-Login Action)

### Option 1: Mock API (for Testing)

1. **Create Mock API** using JSONPlaceholder or similar:
   ```javascript
   // Simple Express.js mock server
   const express = require('express');
   const app = express();
   
   app.get('/user-data', (req, res) => {
     const { id } = req.query;
     res.json({
       loyalty_tier: 'Gold',
       employee_id: 'EMP' + id.substr(-3),
       department: 'Engineering',
       access_level: 'standard'
     });
   });
   
   app.listen(3001);
   ```

2. **Deploy Mock API** to Heroku, Vercel, or similar

### Option 2: Real Database

1. **Set up Database** (PostgreSQL, MongoDB, etc.)
2. **Create API endpoint** that returns user enrichment data
3. **Secure with API keys** or JWT tokens

---

## 📱 Part 5: Application Deployment

### 🏠 Local Development Setup (No Domain Needed!)

1. **Clone and Install**:
   ```bash
   git clone https://github.com/Srijan-XI/ai-project-manager-auth0.git
   cd ai-project-manager-auth0
   npm install
   ```

2. **Run Interactive Setup**:
   ```bash
   node setup.js
   ```
   This will prompt for all the credentials you collected above.

3. **Start Application**:
   ```bash
   npm start
   ```

### 🚀 Free Production Deployment (No Domain Required!)

#### Option 1: Vercel (Recommended - Free with Custom URL)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy (You'll get a free Vercel URL like: your-app.vercel.app)**:
   ```bash
   vercel
   ```

3. **Your app will be available at**: `https://your-project-name.vercel.app`

4. **Update Auth0 with your new Vercel URL**:
   ```
   Go to Auth0 Dashboard > Applications > Settings
   
   Add to Allowed Callback URLs:
   https://your-project-name.vercel.app/callback
   
   Add to Allowed Logout URLs:
   https://your-project-name.vercel.app
   
   Add to Allowed Web Origins:
   https://your-project-name.vercel.app
   ```

5. **Set Environment Variables in Vercel**:
   ```bash
   vercel env add AUTH0_DOMAIN
   vercel env add AUTH0_CLIENT_ID
   vercel env add AUTH0_CLIENT_SECRET
   # ... add all other variables
   ```

#### Option 2: Heroku (Free Tier Available)

1. **Create Heroku App (You'll get: your-app-name.herokuapp.com)**:
   ```bash
   heroku create your-chosen-app-name
   ```

2. **Your app URL will be**: `https://your-chosen-app-name.herokuapp.com`

3. **Update Auth0 with Heroku URL**:
   ```
   Add to Auth0 settings:
   https://your-chosen-app-name.herokuapp.com/callback
   https://your-chosen-app-name.herokuapp.com
   ```

4. **Set Environment Variables**:
   ```bash
   heroku config:set AUTH0_DOMAIN=your-domain.auth0.com
   heroku config:set AUTH0_CLIENT_ID=your-client-id
   heroku config:set AUTH0_CLIENT_SECRET=your-client-secret
   # ... set all other variables
   ```

5. **Deploy**:
   ```bash
   git push heroku main
   ```

#### Option 3: Render.com (Free Tier)

1. **Go to**: https://render.com
2. **Connect your GitHub repo**
3. **Choose "Web Service"**
4. **Your app will get**: `https://your-app-name.onrender.com`
5. **Add environment variables in Render dashboard**
6. **Update Auth0 URLs accordingly**

#### Option 4: Railway.app (Free Tier)

1. **Go to**: https://railway.app  
2. **Deploy from GitHub**
3. **Your app will get**: `https://your-app-name.railway.app`
4. **Configure environment variables**
5. **Update Auth0 settings**

#### Option 5: GitHub Pages (Static Frontend Only)

**⚠️ Important Limitations**: GitHub Pages only hosts static files (HTML/CSS/JS), so you'll need modifications:

**What Works on GitHub Pages**:
- ✅ Frontend UI (HTML, CSS, JavaScript)
- ✅ Auth0 Universal Login (client-side)
- ✅ Basic authentication flow
- ✅ Free hosting at `https://yourusername.github.io/repo-name`

**What Doesn't Work**:
- ❌ Express.js server (`server.js`)
- ❌ Server-side token exchange
- ❌ FGA API calls from backend
- ❌ Token Vault server integration
- ❌ Post-Login Action integration

**GitHub Pages Setup**:

1. **Create a separate frontend-only version**:
   ```bash
   # Create a new branch for GitHub Pages
   git checkout -b github-pages
   ```

2. **Modify for client-side only**:
   ```html
   <!-- Use Auth0 SPA SDK instead of server-side -->
   <script src="https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js"></script>
   ```

3. **Update `app.js` for SPA mode**:
   ```javascript
   // Replace server calls with Auth0 SPA SDK
   import { createAuth0Client } from '@auth0/auth0-spa-js';
   
   const auth0 = await createAuth0Client({
     domain: 'your-domain.auth0.com',
     clientId: 'your-client-id',
     authorizationParams: {
       redirect_uri: 'https://yourusername.github.io/repo-name'
     }
   });
   ```

4. **Enable GitHub Pages**:
   ```
   GitHub Repo > Settings > Pages
   Source: Deploy from a branch
   Branch: github-pages
   Folder: / (root)
   ```

5. **Your app will be at**: `https://yourusername.github.io/your-repo-name`

**Recommended Alternative**: Use Vercel/Netlify instead for full-stack support!

### 💡 Custom Domain Later (Optional)

Once your app is working, you can add a custom domain:

1. **Buy a domain** from:
   - Namecheap ($8-12/year)
   - Google Domains ($12/year)
   - Cloudflare ($8-10/year)

2. **Point it to your deployment**:
   - Vercel: Add domain in Vercel dashboard
   - Heroku: Use Heroku domains add-on
   - Others: Follow their domain setup guides

3. **Update Auth0 URLs** to use your custom domain

### 🎯 Recommended Path (No Domain Needed)

```bash
# 1. Start locally
npm install
npm run setup
npm start  # Test at http://localhost:3000

# 2. Deploy to Vercel (get free .vercel.app URL)
npm i -g vercel
vercel

# 3. Update Auth0 with your Vercel URL
# 4. Your secure AI Project Manager is live! 🎉
```

---

## 🧪 Part 6: Testing the Setup

### Test Checklist

1. **Authentication Flow**:
   - [ ] User can login with Auth0
   - [ ] User profile is enriched with external data
   - [ ] User can logout successfully

2. **FGA Permissions**:
   - [ ] Document access works with proper permissions
   - [ ] Access denied for unauthorized documents
   - [ ] Async approval workflow functions

3. **Token Vault**:
   - [ ] Google Calendar token retrieval works
   - [ ] Tokens are cached and refreshed properly
   - [ ] Third-party API calls succeed

4. **Security**:
   - [ ] All endpoints require authentication
   - [ ] HTTPS is enforced in production
   - [ ] Security logs are generated

### Common Issues and Solutions

1. **Auth0 Callback Errors**:
   ```
   Check: Allowed Callback URLs in Auth0 Dashboard
   Ensure: URLs match exactly (http vs https, trailing slash)
   ```

2. **FGA Permission Denied**:
   ```
   Check: Authorization model is deployed
   Verify: User tuples are created correctly
   Test: API credentials are valid
   ```

3. **Token Vault Issues**:
   ```
   Check: Social connections are enabled
   Verify: Scopes are properly configured
   Test: Third-party API credentials
   ```

---

## 📞 Support Resources

### Documentation Links
- [Auth0 Documentation](https://auth0.com/docs)
- [FGA Documentation](https://docs.fga.dev)
- [Google Calendar API](https://developers.google.com/calendar)
- [Slack API](https://api.slack.com/docs)

### Auth0 Community
- [Auth0 Community](https://community.auth0.com)
- [Auth0 GitHub](https://github.com/auth0)

### Getting Help
1. Check the application logs for error messages
2. Verify all environment variables are set correctly
3. Test each component individually
4. Review the integration tests in `integration.test.js`

---

## 🎉 Congratulations!

Once you complete this setup, you'll have a fully functional, secure AI Project Manager with:
- ✅ Enterprise-grade authentication
- ✅ Fine-grained authorization
- ✅ Secure token management
- ✅ User profile enrichment
- ✅ Async approval workflows

Your AI agents will be transformed from security liabilities into enterprise-ready solutions! 🚀