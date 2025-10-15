# AI Project Manager - Complete Setup Guide

This single setup guide consolidates the project setup, Auth0 configuration, Fine-Grained Authorization (FGA), Token Vault/third-party API steps, deployment options (including a no-domain quickstart), and a GitHub Pages-specific conversion guide.

---

## Contents

- Prerequisites
- Quick Start (No Domain Required)
- Full External Setup (Auth0, FGA, Token Vault)
- GitHub Pages: Static-Only Conversion
- Deployment Options (Vercel, Render, Heroku, Railway)
- Testing & Troubleshooting
- Appendix: Example Files and Notes

---

## Prerequisites

- Node.js 16+ installed
- Git installed
- Auth0 account (free tier available)
- Google account (for Calendar API)
- Slack workspace (optional)
- GitHub account (optional)

You do not need your own domain to get started. This guide shows how to run locally and deploy using free providers (Vercel, Render, Railway, Heroku). For static-only hosting, see the GitHub Pages section.

---

## Quick Start — No Domain Required (15 minutes)

Get a working local instance and an easy free deployment URL without owning a domain.

1. Clone and install:

```bash
git clone https://github.com/Srijan-XI/ai-project-manager-auth0.git
cd ai-project-manager-auth0
npm install
```

2. Create an Auth0 application (for localhost during development):

- Auth0 Dashboard > Applications > Create Application
- Name: "AI Project Manager"
- Type: **"Single Page Application"** ⚠️ Important!

**Note:** For client-side authentication to work, you MUST select "Single Page Application" type, not "Regular Web Application".

3. Configure Auth0 for local development:

Allowed Callback URLs:

```
http://localhost:3000/callback, http://localhost:3000
```

Allowed Logout URLs:

```
http://localhost:3000
```

Allowed Web Origins:

```
http://localhost:3000
```

**Important:** Make sure to include both `/callback` and the base URL in Allowed Callback URLs.

4. Run interactive setup:

```bash
npm run setup
```

Provide your Auth0 Domain, Client ID, Client Secret and other values when prompted.

**Note:** For Single Page Applications, the client secret is only used for server-side operations. The browser-side code uses a different authentication flow.

5. Start the app locally:

```bash
npm start
```

Open: http://localhost:3000

---

## Full External Setup

This section combines the detailed steps for Auth0, FGA, Token Vault (third-party APIs), and optional external database used by the Post-Login Action.

### 1) Auth0 Setup

1. Create an Auth0 account at https://auth0.com and verify your email.

2. Create an application:

- Auth0 Dashboard > Applications > Create Application
- Name: "AI Project Manager"
- Type: "Regular Web Applications"
- Technology: Node.js

3. Application Settings — add development and production URLs:

Allowed Callback URLs (example):

```
http://localhost:3000/callback,
https://ai-project-manager-auth0.vercel.app/callback
```

Allowed Logout URLs (example):

```
http://localhost:3000,
https://ai-project-manager-auth0.vercel.app
```

Allowed Web Origins (example):

```
http://localhost:3000,
https://ai-project-manager-auth0.vercel.app
```

4. Save and note credentials (Domain, Client ID, Client Secret).

### 2) Configure Auth0 API

1. Auth0 Dashboard > APIs > Create API

Example settings:

- Name: "AI Project Manager API"
- Identifier: https://api.ai-project-manager.com
- Signing Algorithm: RS256

Enable RBAC and add permissions/scopes your app requires (e.g., read:profile, read:projects, write:projects, manage:calendar, access:documents).

### 3) Post-Login Action

Auth0 Actions can enrich the user profile after login.

1. Auth0 Dashboard > Actions > Flows > Login
2. Create new Action (Build from scratch)

Example:

- Name: "User Profile Enrichment"
- Trigger: Post Login
- Runtime: Node 18

Copy the action code from `auth0-post-login-action.js` and update any external API endpoints and secrets.

Add the needed dependencies (e.g., axios) and configure Secrets (EXTERNAL_API_TOKEN, EXTERNAL_API_KEY) in the Action UI.

Deploy the action and add it to the Login flow.

### 4) Fine-Grained Authorization (FGA)

1. Auth0 Dashboard > Extensions > Fine Grained Authorization (or visit https://dashboard.fga.dev)
2. Create an Authorization Store (e.g., `ai-project-manager`).

Deploy a model similar to the example below (supports users, documents, projects with owner/editor/viewer/manager/member relations):

Example model (JSON):

```
{
  "schema_version": "1.1",
  "type_definitions": [
    { "type": "user" },
    {
      "type": "document",
      "relations": {
        "owner": { "this": {} },
        "editor": {
          "union": { "child": [ { "this": {} }, { "computedUserset": { "relation": "owner" } } ] }
        },
        "viewer": {
          "union": { "child": [ { "this": {} }, { "computedUserset": { "relation": "editor" } } ] }
        }
      }
    },
    {
      "type": "project",
      "relations": {
        "owner": { "this": {} },
        "manager": { "union": { "child": [ { "this": {} }, { "computedUserset": { "relation": "owner" } } ] } },
        "member": { "union": { "child": [ { "this": {} }, { "computedUserset": { "relation": "manager" } } ] } }
      }
    }
  ]
}
```

3. Add relationship tuples for testing. Example tuples:

```
[
  { "user": "user:auth0|123456789", "relation": "owner", "object": "document:project-plan" },
  { "user": "user:auth0|123456789", "relation": "editor", "object": "document:requirements" },
  { "user": "user:auth0|123456789", "relation": "viewer", "object": "document:architecture" }
]
```

4. Create API tokens for your app to read/write tuples and evaluate permissions.

### 5) Token Vault & Third-Party APIs

Example: Google Calendar

1. Google Cloud Console > create project > Enable Calendar API
2. Create OAuth credentials (Web application)
3. Authorized redirect URIs: https://your-domain.auth0.com/login/callback
4. Configure Auth0 Social Connection for Google with the client ID/secret and scopes:

```
email profile openid https://www.googleapis.com/auth/calendar
```

Repeat for Slack, GitHub or other providers if needed (create OAuth apps on each provider and configure Auth0 social connections).

### 6) External Database for Post-Login Action (Optional)

You can use a mock API or a real database for enrichment data.

Mock Express example (for local testing):

```javascript
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

Deploy this mock API to a public host (Heroku, Vercel serverless, Render) for the Post-Login Action to call.

---

## GitHub Pages — Static-Only Conversion

GitHub Pages only hosts static content (HTML/CSS/JS). This project's full features require server-side code, so GitHub Pages needs a client-side SPA conversion. Use this only if you accept reduced functionality.

What's possible on GitHub Pages:

- Frontend authentication using Auth0 SPA SDK
- Basic login/logout and profile display
- Mocked FGA and Token Vault behavior for demos

What won't work on GitHub Pages:

- Express server (`server.js`)
- Server-side token exchange flows
- Real FGA calls from backend
- Real Token Vault server
- Post-Login Action with external server calls

Steps to convert to GitHub Pages:

1. Create a separate branch for the static build:

```bash
git checkout -b github-pages
```

2. Add an SPA Auth0 client file (e.g., `auth0-spa-client.js`) and include the Auth0 SPA SDK in `index.html`:

Example `auth0-spa-client.js` (init, login, logout, getToken):

```javascript
let auth0Client = null;

async function initAuth0() {
  auth0Client = await createAuth0Client({
    domain: 'your-domain.auth0.com',
    clientId: 'your-client-id',
    authorizationParams: {
      redirect_uri: 'https://yourusername.github.io/your-repo-name',
      audience: 'https://api.ai-project-manager.com',
      scope: 'openid profile email'
    }
  });

  const query = window.location.search;
  if (query.includes('code=') && query.includes('state=')) {
    await auth0Client.handleRedirectCallback();
    window.history.replaceState({}, document.title, '/');
    updateAuthState();
  } else {
    updateAuthState();
  }
}

async function updateAuthState() {
  const isAuthenticated = await auth0Client.isAuthenticated();
  if (isAuthenticated) {
    const user = await auth0Client.getUser();
    appState.isAuthenticated = true;
    appState.currentUser = user;
    showDashboard();
  } else {
    appState.isAuthenticated = false;
    appState.currentUser = null;
    showLandingPage();
  }
}

async function initiateAuth0Login() { await auth0Client.loginWithRedirect(); }
async function logout() { await auth0Client.logout({ logoutParams: { returnTo: window.location.origin } }); }
async function getAccessToken() { try { return await auth0Client.getTokenSilently(); } catch (error) { console.error(error); return null; } }

document.addEventListener('DOMContentLoaded', initAuth0);
```

3. Update `index.html` to include the SPA SDK and your new client script:

```html
<script src="https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js"></script>
<script src="auth0-spa-client.js"></script>
```

4. Modify `app.js` to remove server-dependent calls and use mocks for FGA and Token Vault. Examples are provided below:

Mock permission check:

```javascript
function hasPermission(resource, relation) {
  const mockPermissions = {
    'document:project-plan:viewer': true,
    'document:project-plan:editor': false,
    'document:requirements:viewer': true,
    'document:requirements:editor': true,
    'document:architecture:viewer': true
  };
  const key = `${resource}:${relation}`;
  return mockPermissions[key] || false;
}
```

Mock token vault:

```javascript
function getTokenVaultToken(service) {
  return { access_token: `mock_${service}_token`, expires_in: 3600, token_type: 'Bearer' };
}
```

5. Update Auth0 application type to "Single Page Application (SPA)" in the Auth0 Dashboard and set the Allowed Callback/Logout/Web Origins to your GitHub Pages URL.

6. Push and enable GitHub Pages from the `github-pages` branch (root folder). Your app will be available at:

```
https://yourusername.github.io/your-repo-name
```

Note: GitHub Pages is only recommended for demo/static use. For full functionality use Vercel or another provider that supports server-side code.

---

## Deployment Options

Recommended: Vercel (supports Node.js server-side functions and environment variables).

1. Vercel (recommended)

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel for production (AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, etc.). Update Auth0 Allowed Callback URLs to include your Vercel URL.

2. Render.com

Connect your GitHub repo, create a "Web Service" and deploy.

3. Heroku

```bash
heroku create your-chosen-app-name
git push heroku main
```

Set config vars in Heroku for all required environment variables.

4. Railway.app

Connect GitHub repo and deploy.

---

## Testing & Troubleshooting

Test checklist:

- Authentication flow: login, logout, profile enrichment
- FGA permissions: allowed/denied document access
- Token Vault: calendar token retrieval and refresh
- Security: endpoints require authentication, HTTPS in production

Common issues:

- Callback URL mismatch: ensure Auth0 Allowed Callback URLs exactly match the deployed URL (including protocol and trailing slash behavior)
- FGA permission denied: verify model and tuples
- Token vault issues: check social connection scopes and provider credentials

If you need to run tests, see `integration.test.js`.

---

## Appendix & Notes

- For GitHub Pages demo instructions see the "GitHub Pages — Static-Only Conversion" section above.
- For Post-Login Action code, refer to `auth0-post-login-action.js` in this repo.
- For quick notes and a short quickstart, see `NO-DOMAIN-QUICKSTART.md` and `EXTERNAL_SETUP.md` in the repository root.

---

## Summary

This `setup.md` consolidates the original `EXTERNAL_SETUP.md`, `NO-DOMAIN-QUICKSTART.md`, and `GITHUB-PAGES-SETUP.md` files into one single guide covering local setup, Auth0 configuration, FGA, third-party API token management, GitHub Pages conversion, and recommended deployment options. Follow the quick start to get running locally, then pick a deployment option for production (Vercel recommended).
