#!/usr/bin/env node

/**
 * Deployment Setup Script for AI Project Manager with Auth0
 * This script helps set up the project for development or production
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(`${colors.cyan}${prompt}${colors.reset}`, resolve);
    });
}

async function setupEnvironment() {
    log('🚀 AI Project Manager with Auth0 Setup', 'magenta');
    log('=====================================\n', 'magenta');
    
    const config = {};
    
    // Auth0 Configuration
    log('📝 Auth0 Configuration', 'blue');
    log('Please provide your Auth0 application details:\n', 'white');
    
    config.AUTH0_DOMAIN = await question('Auth0 Domain (e.g., your-domain.auth0.com): ');
    config.AUTH0_CLIENT_ID = await question('Auth0 Client ID: ');
    config.AUTH0_CLIENT_SECRET = await question('Auth0 Client Secret: ');
    config.AUTH0_AUDIENCE = await question('Auth0 API Audience (optional, press Enter to skip): ') || 'https://api.ai-project-manager.com';
    
    // Application Configuration
    log('\n🔧 Application Configuration', 'blue');
    config.BASE_URL = await question('Base URL (default: http://localhost:3000): ') || 'http://localhost:3000';
    config.PORT = await question('Port (default: 3000): ') || '3000';
    config.SESSION_SECRET = generateRandomSecret();
    
    // FGA Configuration
    log('\n🔐 Fine-Grained Authorization Configuration', 'blue');
    const useFGA = await question('Do you want to set up FGA? (y/n): ');
    if (useFGA.toLowerCase() === 'y') {
        config.FGA_API_URL = await question('FGA API URL (default: https://api.fga.dev): ') || 'https://api.fga.dev';
        config.FGA_STORE_ID = await question('FGA Store ID: ');
        config.FGA_MODEL_ID = await question('FGA Authorization Model ID: ');
        config.FGA_CLIENT_ID = await question('FGA Client ID: ');
        config.FGA_CLIENT_SECRET = await question('FGA Client Secret: ');
    }
    
    // Token Vault Configuration
    log('\n🔑 Token Vault Configuration', 'blue');
    const useTokenVault = await question('Do you want to set up Token Vault integrations? (y/n): ');
    if (useTokenVault.toLowerCase() === 'y') {
        log('Google Calendar Integration:', 'yellow');
        config.GOOGLE_CLIENT_ID = await question('Google Client ID (optional): ');
        config.GOOGLE_CLIENT_SECRET = await question('Google Client Secret (optional): ');
        
        log('Slack Integration:', 'yellow');
        config.SLACK_CLIENT_ID = await question('Slack Client ID (optional): ');
        config.SLACK_CLIENT_SECRET = await question('Slack Client Secret (optional): ');
        
        log('GitHub Integration:', 'yellow');
        config.GITHUB_CLIENT_ID = await question('GitHub Client ID (optional): ');
        config.GITHUB_CLIENT_SECRET = await question('GitHub Client Secret (optional): ');
    }
    
    // External API Configuration (for Post-Login Action)
    log('\n📡 External API Configuration (for Post-Login Action)', 'blue');
    const useExternalAPI = await question('Do you have an external API for user data enrichment? (y/n): ');
    if (useExternalAPI.toLowerCase() === 'y') {
        config.EXTERNAL_API_URL = await question('External API URL: ');
        config.EXTERNAL_API_TOKEN = await question('External API Token (optional): ');
        config.EXTERNAL_API_KEY = await question('External API Key (optional): ');
    }
    
    // Generate .env file
    log('\n💾 Generating .env file...', 'green');
    await generateEnvFile(config);
    
    // Update Auth0 configuration file
    log('📝 Updating Auth0 configuration...', 'green');
    await updateAuth0Config(config);
    
    // Install dependencies
    log('\n📦 Installing dependencies...', 'green');
    await installDependencies();
    
    // Setup instructions
    log('\n✅ Setup Complete!', 'green');
    log('==================\n', 'green');
    
    log('Next steps:', 'yellow');
    log('1. Configure your Auth0 application:', 'white');
    log(`   - Allowed Callback URLs: ${config.BASE_URL}/callback`, 'white');
    log(`   - Allowed Logout URLs: ${config.BASE_URL}`, 'white');
    log(`   - Allowed Web Origins: ${config.BASE_URL}`, 'white');
    
    if (useFGA.toLowerCase() === 'y') {
        log('\n2. Set up your FGA authorization model:', 'white');
        log('   - Create tuples for your test users and documents', 'white');
        log('   - See README.md for sample authorization model', 'white');
    }
    
    log('\n3. Deploy the Post-Login Action:', 'white');
    log('   - Copy code from auth0-post-login-action.js', 'white');
    log('   - Create action in Auth0 Dashboard > Actions > Flows > Login', 'white');
    log('   - Add action to your Login flow', 'white');
    
    log('\n4. Start the application:', 'white');
    log('   npm start', 'cyan');
    log(`   Open ${config.BASE_URL}`, 'cyan');
    
    log('\n📚 For detailed instructions, see README.md', 'yellow');
}

function generateRandomSecret() {
    return require('crypto').randomBytes(64).toString('hex');
}

async function generateEnvFile(config) {
    const envContent = `# Auth0 Configuration
AUTH0_DOMAIN=${config.AUTH0_DOMAIN || ''}
AUTH0_CLIENT_ID=${config.AUTH0_CLIENT_ID || ''}
AUTH0_CLIENT_SECRET=${config.AUTH0_CLIENT_SECRET || ''}
AUTH0_AUDIENCE=${config.AUTH0_AUDIENCE || ''}
AUTH0_REDIRECT_URI=${config.BASE_URL}/callback

# Session Configuration
SESSION_SECRET=${config.SESSION_SECRET}
BASE_URL=${config.BASE_URL}

# Fine-Grained Authorization (FGA) Configuration
FGA_API_URL=${config.FGA_API_URL || ''}
FGA_STORE_ID=${config.FGA_STORE_ID || ''}
FGA_MODEL_ID=${config.FGA_MODEL_ID || ''}
FGA_CLIENT_ID=${config.FGA_CLIENT_ID || ''}
FGA_CLIENT_SECRET=${config.FGA_CLIENT_SECRET || ''}

# Token Vault Configuration
TOKEN_VAULT_BASE_URL=https://api.auth0.com/api/v2
TOKEN_VAULT_CLIENT_ID=${config.AUTH0_CLIENT_ID || ''}
TOKEN_VAULT_CLIENT_SECRET=${config.AUTH0_CLIENT_SECRET || ''}

# External API Configuration (for Post-Login Action)
EXTERNAL_API_URL=${config.EXTERNAL_API_URL || ''}
EXTERNAL_API_TOKEN=${config.EXTERNAL_API_TOKEN || ''}
EXTERNAL_API_KEY=${config.EXTERNAL_API_KEY || ''}

# Application Configuration
NODE_ENV=development
PORT=${config.PORT}
LOG_LEVEL=debug

# Google Calendar API (for Token Vault integration)
GOOGLE_CLIENT_ID=${config.GOOGLE_CLIENT_ID || ''}
GOOGLE_CLIENT_SECRET=${config.GOOGLE_CLIENT_SECRET || ''}

# Slack API (for Token Vault integration)
SLACK_CLIENT_ID=${config.SLACK_CLIENT_ID || ''}
SLACK_CLIENT_SECRET=${config.SLACK_CLIENT_SECRET || ''}

# GitHub API (for Token Vault integration)
GITHUB_CLIENT_ID=${config.GITHUB_CLIENT_ID || ''}
GITHUB_CLIENT_SECRET=${config.GITHUB_CLIENT_SECRET || ''}
`;

    fs.writeFileSync('.env', envContent);
}

async function updateAuth0Config(config) {
    const configContent = `/**
 * Auth0 Configuration for AI Project Manager
 * This file contains all Auth0-related configurations and integrations
 */

// Auth0 Configuration
const AUTH0_CONFIG = {
    domain: '${config.AUTH0_DOMAIN}',
    clientId: '${config.AUTH0_CLIENT_ID}',
    clientSecret: '${config.AUTH0_CLIENT_SECRET}', // Server-side only
    audience: '${config.AUTH0_AUDIENCE}',
    scope: 'openid profile email read:projects write:projects manage:calendar',
    redirectUri: '${config.BASE_URL}/callback'
};

// Token Vault Configuration
const TOKEN_VAULT_CONFIG = {
    googleCalendar: {
        scope: 'https://www.googleapis.com/auth/calendar',
        tokenEndpoint: '/api/tokens/google-calendar'
    },
    slack: {
        scope: 'chat:write,channels:read',
        tokenEndpoint: '/api/tokens/slack'
    },
    github: {
        scope: 'repo,read:org',
        tokenEndpoint: '/api/tokens/github'
    }
};

// Fine-Grained Authorization Configuration
const FGA_CONFIG = {
    store: {
        id: '${config.FGA_STORE_ID || ''}',
        authorizationModelId: '${config.FGA_MODEL_ID || ''}'
    },
    relations: {
        document: ['viewer', 'editor', 'owner'],
        project: ['member', 'manager', 'owner'],
        calendar: ['reader', 'writer']
    }
};

// Export configurations
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AUTH0_CONFIG,
        TOKEN_VAULT_CONFIG,
        FGA_CONFIG
    };
} else {
    // Browser environment
    window.AUTH0_CONFIG = AUTH0_CONFIG;
    window.TOKEN_VAULT_CONFIG = TOKEN_VAULT_CONFIG;
    window.FGA_CONFIG = FGA_CONFIG;
}`;

    fs.writeFileSync('auth0-config.js', configContent);
}

async function installDependencies() {
    return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const npm = spawn('npm', ['install'], { stdio: 'inherit' });
        
        npm.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`npm install failed with code ${code}`));
            }
        });
    });
}

// Run setup if called directly
if (require.main === module) {
    setupEnvironment()
        .then(() => {
            rl.close();
            process.exit(0);
        })
        .catch((error) => {
            log(`Error: ${error.message}`, 'red');
            rl.close();
            process.exit(1);
        });
}

module.exports = {
    setupEnvironment,
    generateRandomSecret,
    generateEnvFile,
    updateAuth0Config
};