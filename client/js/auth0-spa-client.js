// Auth0 SPA Client for AI Project Manager
// Uses Auth0 SPA SDK for client-side authentication

let auth0Client = null;

async function initAuth0() {
    try {
        // Use config from auth0-config.js if available
        const config = window.AUTH0_CONFIG || {
            domain: 'genai-8649882471415737.us.auth0.com',
            clientId: 'A7kUmty4eQnifEG9zjRjTaAa3wjWTzyO',
            audience: 'https://api.ai-project-manager.com',
            scope: 'openid profile email read:projects write:projects manage:calendar'
        };

        auth0Client = await createAuth0Client({
            domain: config.domain,
            clientId: config.clientId,
            authorizationParams: {
                redirect_uri: window.location.origin,
                audience: config.audience,
                scope: config.scope
            }
        });

        // Handle redirect callback
        if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, '/');
        }
        await updateAuthState();
    } catch (error) {
        console.error('Auth0 initialization error:', error);
        // Fall back to showing landing page
        if (typeof showLandingPage === 'function') showLandingPage();
    }
}

async function updateAuthState() {
    try {
        if (!auth0Client) {
            console.warn('Auth0 client not initialized');
            return;
        }
        
        const isAuthenticated = await auth0Client.isAuthenticated();
        if (isAuthenticated) {
            const user = await auth0Client.getUser();
            window.appState = window.appState || {};
            window.appState.isAuthenticated = true;
            window.appState.currentUser = user;
            if (typeof showDashboard === 'function') showDashboard();
        } else {
            window.appState = window.appState || {};
            window.appState.isAuthenticated = false;
            window.appState.currentUser = null;
            if (typeof showLandingPage === 'function') showLandingPage();
        }
    } catch (error) {
        console.error('Error updating auth state:', error);
    }
}

async function initiateAuth0Login() {
    try {
        if (!auth0Client) {
            console.error('Auth0 client not initialized');
            return;
        }
        await auth0Client.loginWithRedirect();
    } catch (error) {
        console.error('Login failed:', error);
    }
}

async function logout() {
    try {
        if (!auth0Client) {
            console.error('Auth0 client not initialized');
            return;
        }
        await auth0Client.logout({
            logoutParams: {
                returnTo: window.location.origin
            }
        });
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

async function getAccessToken() {
    try {
        if (!auth0Client) {
            console.warn('Auth0 client not initialized');
            return null;
        }
        return await auth0Client.getTokenSilently();
    } catch (e) {
        console.error('Auth0 getTokenSilently error:', e);
        return null;
    }
}

// Helper function to make authenticated API calls
async function makeAuthenticatedRequest(url, options = {}) {
    try {
        const token = await getAccessToken();
        if (!token) {
            throw new Error('No access token available');
        }

        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await fetch(url, authOptions);
        return response;
    } catch (error) {
        console.error('Authenticated request failed:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', initAuth0);

// Expose for HTML and app.js
window.initiateAuth0Login = initiateAuth0Login;
window.logout = logout;
window.getAccessToken = getAccessToken;
window.makeAuthenticatedRequest = makeAuthenticatedRequest;
