// Auth0 SPA Client for AI Project Manager
// Uses Auth0 SPA SDK for client-side authentication

let auth0Client = null;

async function initAuth0() {
    auth0Client = await createAuth0Client({
        domain: 'genai-8649882471415737.us.auth0.com', // TODO: Replace with your Auth0 domain
        clientId: 'A7kUmty4eQnifEG9zjRjTaAa3wjWTzyO',      // TODO: Replace with your Auth0 client ID
        authorizationParams: {
            redirect_uri: window.location.origin,
            audience: 'https://api.ai-project-manager.com',
            scope: 'openid profile email read:projects write:projects manage:calendar'
        }
    });

    // Handle redirect callback
    if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, '/');
    }
    updateAuthState();
}

async function updateAuthState() {
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
}

async function initiateAuth0Login() {
    await auth0Client.loginWithRedirect();
}

async function logout() {
    await auth0Client.logout({
        logoutParams: {
            returnTo: window.location.origin
        }
    });
}

async function getAccessToken() {
    try {
        return await auth0Client.getTokenSilently();
    } catch (e) {
        console.error('Auth0 getTokenSilently error:', e);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', initAuth0);

// Expose for HTML
window.initiateAuth0Login = initiateAuth0Login;
window.logout = logout;
