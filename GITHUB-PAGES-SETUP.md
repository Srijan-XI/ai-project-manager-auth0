# 🌐 GitHub Pages Setup Guide

## 📂 Repository
**GitHub Repo**: https://github.com/Srijan-XI/ai-project-manager-auth0.git

**Clone the repo**:
```bash
git clone https://github.com/Srijan-XI/ai-project-manager-auth0.git
cd ai-project-manager-auth0
npm install
```

## ⚠️ Important: GitHub Pages Limitations

GitHub Pages only hosts **static files** (HTML, CSS, JS). This means:

**✅ What Works:**
- Frontend authentication with Auth0 SPA SDK
- Basic login/logout functionality  
- Static UI components
- Client-side JavaScript features

**❌ What Doesn't Work:**
- Express.js server (`server.js`)
- Server-side token exchange
- FGA API calls from backend
- Token Vault server integration
- Post-Login Action data (limited)

## 🔧 GitHub Pages Conversion

### Step 1: Create GitHub Pages Branch

```bash
# Create a new branch for static version
git checkout -b github-pages

# We'll modify files for client-side only
```

### Step 2: Create Client-Side Auth0 Integration

Replace the server-side integration with Auth0 SPA SDK:

**Create `auth0-spa-client.js`:**

```javascript
/**
 * Auth0 SPA Client for GitHub Pages
 * Replaces server-side authentication
 */

let auth0Client = null;

// Initialize Auth0 SPA Client
async function initAuth0() {
    auth0Client = await createAuth0Client({
        domain: 'your-domain.auth0.com',
        clientId: 'your-client-id',
        authorizationParams: {
            redirect_uri: 'https://srijan-xi.github.io/ai-project-manager-auth0',
            audience: 'https://api.ai-project-manager.com',
            scope: 'openid profile email'
        }
    });

    // Check if we're returning from Auth0
    const query = window.location.search;
    if (query.includes('code=') && query.includes('state=')) {
        // Handle the callback
        await auth0Client.handleRedirectCallback();
        
        // Clean up the URL
        window.history.replaceState({}, document.title, '/');
        
        // Update UI
        updateAuthState();
    } else {
        // Check if user is already authenticated
        updateAuthState();
    }
}

// Update authentication state
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

// Login function for GitHub Pages
async function initiateAuth0Login() {
    await auth0Client.loginWithRedirect();
}

// Logout function for GitHub Pages
async function logout() {
    await auth0Client.logout({
        logoutParams: {
            returnTo: window.location.origin
        }
    });
}

// Get access token (for API calls)
async function getAccessToken() {
    try {
        return await auth0Client.getTokenSilently();
    } catch (error) {
        console.error('Error getting access token:', error);
        return null;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAuth0);
```

### Step 3: Update `index.html` for GitHub Pages

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Project Manager - Secure AI Agents with Auth0</title>
    <link rel="stylesheet" href="style.css">
    
    <!-- Auth0 SPA SDK -->
    <script src="https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js"></script>
    
    <!-- Your Auth0 client -->
    <script src="auth0-spa-client.js"></script>
</head>
<body>
    <!-- Your existing HTML content -->
    
    <!-- Update login button -->
    <button class="btn btn--primary" onclick="initiateAuth0Login()">
        Login with Auth0
    </button>
    
    <!-- Include your app.js last -->
    <script src="app.js"></script>
</body>
</html>
```

### Step 4: Modify `app.js` for Static Mode

Update the app state and remove server calls:

```javascript
// Update app state initialization
async function initializeApp() {
    // No server calls - Auth0 SPA handles authentication
    
    // Initialize chat with welcome message
    initializeChat();
    
    // Set up keyboard listeners
    setupKeyboardListeners();
    
    // Auth0 SPA client will handle authentication state
}

// Mock FGA permissions for GitHub Pages
function hasPermission(resource, relation) {
    // For GitHub Pages, simulate permissions
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

// Mock Token Vault for GitHub Pages
function getTokenVaultToken(service) {
    // Return mock tokens for demo
    return {
        access_token: `mock_${service}_token`,
        expires_in: 3600,
        token_type: 'Bearer'
    };
}

// Updated calendar refresh for GitHub Pages
async function refreshCalendarData() {
    showLoadingState();
    
    // Simulate API call
    setTimeout(() => {
        hideLoadingState();
        showNotification('Calendar data refreshed (mock data for GitHub Pages)', 'success');
        addSecurityLog('Calendar sync completed', 'success', 
            'Mock calendar sync for GitHub Pages demo');
    }, 1000);
}

// Updated document access for GitHub Pages
async function viewDocument(docId, permission = null) {
    try {
        const resourceMap = {
            'doc1': 'document:project-plan',
            'doc2': 'document:requirements', 
            'doc3': 'document:architecture'
        };
        
        const resource = resourceMap[docId] || `document:${docId}`;
        
        // Check mock permissions
        let userPermission = null;
        
        if (hasPermission(resource, 'owner')) {
            userPermission = 'owner';
        } else if (hasPermission(resource, 'editor')) {
            userPermission = 'editor';
        } else if (hasPermission(resource, 'viewer')) {
            userPermission = 'viewer';
        } else {
            showNotification('Access denied (mock FGA for GitHub Pages)', 'warning');
            return;
        }
        
        if (userPermission === 'viewer') {
            showNotification('Document opened in read-only mode', 'info');
        } else if (userPermission === 'editor') {
            showNotification('Document opened with edit permissions', 'success');
        } else {
            showNotification('Document opened with full permissions', 'success');
        }
        
        addSecurityLog('Document accessed', 'success', 
            `User accessed ${resource} with ${userPermission} permissions (GitHub Pages demo)`);
            
    } catch (error) {
        console.error('Error accessing document:', error);
        showNotification('Error accessing document', 'error');
    }
}
```

### Step 5: Configure Auth0 for GitHub Pages

1. **Update Auth0 Application Settings**:
   ```
   Auth0 Dashboard > Applications > Your App > Settings
   
   Application Type: Single Page Application (SPA)
   
   Allowed Callback URLs:
   https://srijan-xi.github.io/ai-project-manager-auth0
   
   Allowed Logout URLs:
   https://srijan-xi.github.io/ai-project-manager-auth0
   
   Allowed Web Origins:
   https://srijan-xi.github.io/ai-project-manager-auth0
   
   Allowed Origins (CORS):
   https://srijan-xi.github.io/ai-project-manager-auth0
   ```

2. **Note**: You'll need to create a **new Auth0 Application** of type "Single Page Application" for GitHub Pages.

### Step 6: Deploy to GitHub Pages

1. **Push your GitHub Pages branch**:
   ```bash
   git add .
   git commit -m "GitHub Pages static version"
   git push origin github-pages
   ```

2. **Enable GitHub Pages**:
   ```
   Go to: GitHub Repo > Settings > Pages
   Source: Deploy from a branch
   Branch: github-pages
   Folder: / (root)
   ```

3. **Your app will be live at**:
   `https://srijan-xi.github.io/ai-project-manager-auth0`

## 🚀 Recommended: Use Vercel Instead

**Why Vercel is better than GitHub Pages for this project:**

| Feature | GitHub Pages | Vercel |
|---------|--------------|---------|
| **Server-side code** | ❌ Static only | ✅ Full Node.js support |
| **Environment variables** | ❌ No | ✅ Yes |
| **FGA integration** | ❌ Mock only | ✅ Full integration |
| **Token Vault** | ❌ Mock only | ✅ Full integration |
| **Post-Login Action data** | ❌ Limited | ✅ Full support |
| **Setup complexity** | 🔴 High (need to modify code) | 🟢 Low (works as-is) |
| **Free tier** | ✅ Yes | ✅ Yes |
| **Custom domain** | ✅ Yes | ✅ Yes |

**Deploy to Vercel instead:**
```bash
npm i -g vercel
vercel
```

You'll get the same free hosting with full functionality! 🎯

## 📝 Summary

- **GitHub Pages works** but with significant limitations
- **You lose server-side features** (FGA, Token Vault, etc.)
- **Requires code modifications** to work as SPA only
- **Vercel/Netlify are better** for full-stack apps
- **Use GitHub Pages only if** you specifically need GitHub integration

For the complete AI Project Manager experience with all Auth0 features, deploy to **Vercel, Render, or Railway** instead! 🚀