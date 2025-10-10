// Import Auth0 configuration
// Note: In production, this would be loaded securely
const AUTH0_CONFIG = window.AUTH0_CONFIG || {
    domain: 'your-domain.auth0.com',
    clientId: 'your_client_id',
    audience: 'https://api.ai-project-manager.com',
    scope: 'openid profile email read:projects write:projects manage:calendar'
};

// Application state
const appState = {
    isAuthenticated: false,
    currentUser: null,
    tokens: {
        accessToken: null,
        idToken: null,
        refreshToken: null
    },
    currentSection: 'overview',
    chatMessages: [],
    approvalRequests: [],
    fgaPermissions: new Map(), // Cache for FGA permissions
    tokenVaultTokens: new Map() // Cache for Token Vault tokens
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Check authentication status from server
        const response = await fetch('/api/profile', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            appState.isAuthenticated = true;
            appState.currentUser = data.user;
            showDashboard();
            
            // Load user permissions and tokens
            await loadUserPermissions();
            await loadTokenVaultTokens();
        } else {
            // User not authenticated
            appState.isAuthenticated = false;
            showLandingPage();
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
        showLandingPage();
    }
    
    // Initialize chat with welcome message
    initializeChat();
    
    // Set up keyboard listeners
    setupKeyboardListeners();
}

function showLandingPage() {
    document.getElementById('landing-page').classList.remove('hidden');
    document.getElementById('dashboard-page').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.remove('hidden');
    showSection('overview');
}

// Authentication functions
function showLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
}

// Redirect to Auth0 login
function initiateAuth0Login() {
    const authUrl = `https://${AUTH0_CONFIG.domain}/authorize?` + 
        `response_type=code&` +
        `client_id=${AUTH0_CONFIG.clientId}&` +
        `redirect_uri=${encodeURIComponent(window.location.origin + '/callback')}&` +
        `scope=${encodeURIComponent(AUTH0_CONFIG.scope)}&` +
        `audience=${encodeURIComponent(AUTH0_CONFIG.audience)}&` +
        `state=${generateRandomState()}`;
    
    // Store state for validation
    sessionStorage.setItem('auth0_state', generateRandomState());
    
    window.location.href = authUrl;
}

// Generate random state for CSRF protection
function generateRandomState() {
    return Math.random().toString(36).substr(2, 16);
}

// Load user permissions from FGA
async function loadUserPermissions() {
    try {
        // Get permissions for common resources
        const resources = [
            'document:project-plan',
            'document:requirements',
            'document:architecture',
            'project:alpha-release',
            'calendar:team-calendar'
        ];
        
        for (const resource of resources) {
            const relations = ['viewer', 'editor', 'owner'];
            for (const relation of relations) {
                const response = await fetch('/api/fga/check-access', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        resource: resource,
                        relation: relation
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.allowed) {
                        const key = `${resource}:${relation}`;
                        appState.fgaPermissions.set(key, true);
                    }
                }
            }
        }
        
        console.log('Loaded FGA permissions:', appState.fgaPermissions);
    } catch (error) {
        console.error('Error loading permissions:', error);
    }
}

// Load Token Vault tokens
async function loadTokenVaultTokens() {
    try {
        // Load Google Calendar token
        const calendarResponse = await fetch('/api/tokens/google-calendar', {
            credentials: 'include'
        });
        if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            appState.tokenVaultTokens.set('google-calendar', calendarData);
        }
        
        // Load Slack token  
        const slackResponse = await fetch('/api/tokens/slack', {
            credentials: 'include'
        });
        if (slackResponse.ok) {
            const slackData = await slackResponse.json();
            appState.tokenVaultTokens.set('slack', slackData);
        }
        
        console.log('Loaded Token Vault tokens:', appState.tokenVaultTokens.keys());
    } catch (error) {
        console.error('Error loading Token Vault tokens:', error);
    }
}

// Check if user has specific permission
function hasPermission(resource, relation) {
    const key = `${resource}:${relation}`;
    return appState.fgaPermissions.has(key) && appState.fgaPermissions.get(key);
}

// Get Token Vault token for service
function getTokenVaultToken(service) {
    return appState.tokenVaultTokens.get(service);
}

function hideLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
}

function simulateLogin() {
    // Simulate Auth0 login process
    showLoadingState();
    
    setTimeout(() => {
        appState.isAuthenticated = true;
        hideLoginModal();
        showDashboard();
        
        // Add security log entry
        addSecurityLog('User authenticated via Universal Login', 'success', 'OAuth 2.0 flow completed successfully');
        
        hideLoadingState();
        
        // Show success notification
        showNotification('Successfully authenticated with Auth0!', 'success');
    }, 1500);
}

function logout() {
    appState.isAuthenticated = false;
    showLandingPage();
    showNotification('Logged out successfully', 'info');
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.add('hidden'));
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Update navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeNavItem = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    appState.currentSection = sectionName;
    
    // Add specific functionality for each section
    if (sectionName === 'calendar') {
        simulateTokenVaultAccess();
    } else if (sectionName === 'documents') {
        simulateFGACheck();
    }
}

// Chat functionality
function initializeChat() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages && appState.chatMessages.length === 0) {
        const welcomeMessage = {
            type: 'assistant',
            content: "Welcome! I'm your secure AI project manager. All my actions are protected by Auth0's security features. How can I help you today?",
            timestamp: new Date()
        };
        appState.chatMessages.push(welcomeMessage);
        renderChatMessages();
    }
}

function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Add user message
    const userMessage = {
        type: 'user',
        content: message,
        timestamp: new Date()
    };
    appState.chatMessages.push(userMessage);
    
    // Clear input
    chatInput.value = '';
    
    // Simulate AI response
    setTimeout(() => {
        const aiResponse = generateAIResponse(message);
        const assistantMessage = {
            type: 'assistant', 
            content: aiResponse,
            timestamp: new Date()
        };
        appState.chatMessages.push(assistantMessage);
        renderChatMessages();
        
        // Add security log for AI interaction
        addSecurityLog('AI assistant interaction', 'success', 'Secure AI response generated');
    }, 1000);
    
    renderChatMessages();
}

function generateAIResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('calendar') || lowerMessage.includes('meeting')) {
        return "I can help you access calendar events through Auth0's Token Vault. Your Google Calendar integration is secure - no API keys are exposed to the client. Would you like me to show you upcoming meetings?";
    } else if (lowerMessage.includes('document') || lowerMessage.includes('file')) {
        return "Document access is controlled by Fine-Grained Authorization (FGA). I can only show you documents based on your permission level. Your current permissions allow access to Architecture Spec (Owner), Security Guidelines (Editor), and API Documentation (Viewer).";
    } else if (lowerMessage.includes('security') || lowerMessage.includes('auth')) {
        return "All my operations are secured by Auth0 for AI Agents. This includes Universal Login for user authentication, Token Vault for API access, FGA for document permissions, and CIBA for high-privilege actions. Your security posture is excellent!";
    } else if (lowerMessage.includes('project') || lowerMessage.includes('status')) {
        return "You have 2 active projects: 'Auth0 AI Integration' (In Progress) and 'RAG Pipeline Security' (Planning). I can help you manage tasks, schedule meetings, or review documents based on your permissions.";
    } else if (lowerMessage.includes('team') || lowerMessage.includes('notification')) {
        return "Team notifications require approval through CIBA (Client Initiated Backchannel Authentication). This ensures human oversight for sensitive operations. Would you like me to request approval for a team notification?";
    } else {
        return "I'm here to help with your secure project management needs. I can assist with calendar management (via Token Vault), document access (via FGA), team notifications (via CIBA), and security monitoring. What would you like to explore?";
    }
}

function renderChatMessages() {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;
    
    chatContainer.innerHTML = '';
    
    appState.chatMessages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.type}`;
        messageDiv.innerHTML = `<strong>${message.type === 'user' ? 'You' : 'AI Assistant'}:</strong> ${message.content}`;
        chatContainer.appendChild(messageDiv);
    });
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Token Vault simulation
function simulateTokenVaultAccess() {
    addSecurityLog('Token exchange requested for Google Calendar', 'success', 'Access token retrieved from Token Vault');
    showNotification('Calendar data loaded via Token Vault', 'success');
}

// Security logging
function addSecurityLog(event, status, details) {
    const logEntry = {
        timestamp: new Date(),
        event: event,
        status: status,
        details: details
    };
    
    // Add to the security logs display
    updateSecurityLogs(logEntry);
}

function updateSecurityLogs(newLog) {
    const logsContainer = document.querySelector('.log-entries');
    if (!logsContainer) return;
    
    const logDiv = document.createElement('div');
    logDiv.className = `log-entry ${newLog.status}`;
    
    logDiv.innerHTML = `
        <span class="log-time">${newLog.timestamp.toLocaleTimeString()}</span>
        <span class="log-event">${newLog.event}</span>
        <span class="log-status ${newLog.status}">${newLog.status}</span>
    `;
    
    // Add to top of logs
    logsContainer.insertBefore(logDiv, logsContainer.firstChild);
    
    // Keep only last 10 logs
    while (logsContainer.children.length > 10) {
        logsContainer.removeChild(logsContainer.lastChild);
    }
}

// Code modal functions
function showCodeModal() {
    document.getElementById('code-modal').classList.remove('hidden');
}

function hideCodeModal() {
    document.getElementById('code-modal').classList.add('hidden');
}

// Utility functions
function showLoadingState() {
    document.body.classList.add('loading');
}

function hideLoadingState() {
    document.body.classList.remove('loading');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--color-${type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'});
        color: var(--color-btn-primary-text);
        padding: var(--space-12) var(--space-16);
        border-radius: var(--radius-base);
        box-shadow: var(--shadow-lg);
        z-index: 2000;
        transform: translateX(100%);
        transition: transform var(--duration-normal) var(--ease-standard);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function setupKeyboardListeners() {
    document.addEventListener('keydown', function(e) {
        // ESC key closes modals
        if (e.key === 'Escape') {
            hideLoginModal();
            hideCodeModal();
        }
        
        // Enter key in chat input sends message
        if (e.key === 'Enter' && e.target.id === 'chat-input') {
            sendMessage();
        }
    });
}

// Demo data updates (simulate real-time updates)
function startDemoUpdates() {
    // Simulate periodic security updates
    setInterval(() => {
        if (appState.isAuthenticated) {
            const events = [
                { event: 'Token refresh completed', status: 'success', details: 'Calendar access token refreshed automatically' },
                { event: 'FGA permission check', status: 'success', details: 'Document access verified' },
                { event: 'AI agent heartbeat', status: 'success', details: 'All systems operational' }
            ];
            
            const randomEvent = events[Math.floor(Math.random() * events.length)];
            addSecurityLog(randomEvent.event, randomEvent.status, randomEvent.details);
        }
    }, 30000);
}

// Document interaction functions
async function viewDocument(docId, permission = null) {
    try {
        // Map docId to resource identifier
        const resourceMap = {
            'doc1': 'document:project-plan',
            'doc2': 'document:requirements', 
            'doc3': 'document:architecture'
        };
        
        const resource = resourceMap[docId] || `document:${docId}`;
        
        // If permission is explicitly passed (legacy), use it
        if (permission) {
            if (permission === 'no-access') {
                showNotification('Access denied: Insufficient permissions', 'error');
                addSecurityLog('Document access denied', 'error', `User attempted to access restricted document ${docId}`);
                return;
            }
            
            showNotification(`Document opened with ${permission} permissions`, 'success');
            addSecurityLog('Document accessed', 'success', `User accessed document ${docId} with ${permission} permissions`);
            return;
        }
        
        // Check FGA permissions in order of preference
        let userPermission = null;
        let permissionLevel = null;
        
        if (hasPermission(resource, 'owner')) {
            userPermission = 'owner';
            permissionLevel = 'full';
        } else if (hasPermission(resource, 'editor')) {
            userPermission = 'editor';
            permissionLevel = 'edit';
        } else if (hasPermission(resource, 'viewer')) {
            userPermission = 'viewer';
            permissionLevel = 'read-only';
        } else {
            // No permission - request access
            showNotification('Access denied. Requesting approval...', 'warning');
            await requestDocumentAccess(resource, 'viewer');
            return;
        }
        
        // Open document with appropriate permissions
        if (userPermission === 'viewer') {
            showNotification('Document opened in read-only mode', 'info');
        } else if (userPermission === 'editor') {
            showNotification('Document opened with edit permissions', 'success');
        } else {
            showNotification('Document opened with full permissions', 'success');
        }
        
        // Enhanced logging with user profile data from Post-Login Action
        const userContext = appState.currentUser ? 
            `User: ${appState.currentUser.name} (${appState.currentUser.loyalty_tier || 'N/A'} tier, Access Level: ${appState.currentUser.access_level || 'N/A'})` :
            'Unknown user';
            
        addSecurityLog('Document accessed', 'success', 
            `${userContext} accessed ${resource} with ${userPermission} permissions`);
            
    } catch (error) {
        console.error('Error accessing document:', error);
        showNotification('Error accessing document', 'error');
    }
}

// Request document access through async authorization
async function requestDocumentAccess(resource, relation) {
    try {
        const response = await fetch('/api/async-approval', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                action: 'access_document',
                resource: resource,
                justification: `User needs ${relation} access to ${resource} for project work`
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(`Access request submitted (ID: ${data.request_id}). You'll be notified when approved.`, 'info');
            
            // Add to approval requests list
            appState.approvalRequests.push({
                id: data.request_id,
                resource: resource,
                relation: relation,
                status: 'pending',
                timestamp: new Date().toISOString()
            });
            
            updateApprovalRequestsDisplay();
        } else {
            throw new Error('Failed to submit access request');
        }
    } catch (error) {
        console.error('Error requesting document access:', error);
        showNotification('Error requesting access', 'error');
    }
}

// Calendar integration with Token Vault
async function refreshCalendarData() {
    showLoadingState();
    
    try {
        // Get Google Calendar token from Token Vault
        const calendarToken = getTokenVaultToken('google-calendar');
        
        if (!calendarToken) {
            // Token not available, refresh from Token Vault
            const response = await fetch('/api/tokens/google-calendar', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const tokenData = await response.json();
                appState.tokenVaultTokens.set('google-calendar', tokenData);
                
                hideLoadingState();
                showNotification('Calendar data refreshed via Token Vault', 'success');
                addSecurityLog('Calendar sync completed', 'success', 
                    `Events synchronized from Google Calendar using Token Vault (expires in ${tokenData.expires_in}s)`);
            } else {
                throw new Error('Failed to get calendar token');
            }
        } else {
            // Use existing token
            hideLoadingState();
            showNotification('Calendar data refreshed via Token Vault', 'success');
            addSecurityLog('Calendar sync completed', 'success', 
                'Events synchronized from Google Calendar using cached Token Vault token');
        }
        
    } catch (error) {
        console.error('Error refreshing calendar:', error);
        hideLoadingState();
        showNotification('Failed to refresh calendar data', 'error');
        addSecurityLog('Calendar sync failed', 'error', error.message);
    }
}

// Initialize demo updates when authenticated
document.addEventListener('DOMContentLoaded', function() {
    startDemoUpdates();
});

// Update approval requests display
function updateApprovalRequestsDisplay() {
    const approvalSection = document.querySelector('#approval-requests');
    if (!approvalSection) return;
    
    const requestsList = approvalSection.querySelector('.requests-list') || 
                        document.createElement('div');
    requestsList.className = 'requests-list';
    requestsList.innerHTML = '';
    
    appState.approvalRequests.forEach(request => {
        const requestItem = document.createElement('div');
        requestItem.className = `request-item status-${request.status}`;
        requestItem.innerHTML = `
            <div class="request-header">
                <span class="request-id">${request.id}</span>
                <span class="request-status ${request.status}">${request.status}</span>
            </div>
            <div class="request-details">
                <p><strong>Resource:</strong> ${request.resource}</p>
                <p><strong>Relation:</strong> ${request.relation}</p>
                <p><strong>Requested:</strong> ${new Date(request.timestamp).toLocaleString()}</p>
            </div>
        `;
        requestsList.appendChild(requestItem);
    });
    
    if (!approvalSection.contains(requestsList)) {
        approvalSection.appendChild(requestsList);
    }
    }

// Initialize Auth0 login (replaces simulateLogin)
function initiateLogin() {
    // Redirect to server-side Auth0 login endpoint
    window.location.href = '/login';
}

// Logout function
function logout() {
    // Redirect to server-side logout endpoint
    window.location.href = '/logout';
}

// Enhanced approval request function
async function requestApproval(action, resource) {
    try {
        const response = await fetch('/api/async-approval', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                action: action,
                resource: resource || 'system',
                justification: `User requested ${action} approval`
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(`Approval request submitted (ID: ${data.request_id})`, 'info');
            
            appState.approvalRequests.push({
                id: data.request_id,
                resource: resource || 'system',
                relation: action,
                status: 'pending',
                timestamp: new Date().toISOString()
            });
            
            updateApprovalRequestsDisplay();
        }
    } catch (error) {
        console.error('Error requesting approval:', error);
        showNotification('Error requesting approval', 'error');
    }
}

// Export functions for global access
// Removed login modal and server-based login logic
// Export functions for global access
// window.showLoginModal = showLoginModal; // Removed
// window.hideLoginModal = hideLoginModal; // Removed
// window.initiateLogin = initiateLogin; // Removed
// window.initiateAuth0Login = initiateAuth0Login; // Removed
window.logout = logout;
window.showSection = showSection;
window.sendMessage = sendMessage;
window.requestApproval = requestApproval;
window.showCodeModal = showCodeModal;
window.hideCodeModal = hideCodeModal;
window.viewDocument = viewDocument;
window.refreshCalendarData = refreshCalendarData;
window.hasPermission = hasPermission;
window.getTokenVaultToken = getTokenVaultToken;