#!/usr/bin/env node

/**
 * Quick External Setup Verification Script
 * This script helps verify and configure external services
 */

const https = require('https');
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

async function testConnection(url, description) {
    return new Promise((resolve) => {
        const request = https.get(url, (response) => {
            resolve({
                success: response.statusCode === 200 || response.statusCode === 302,
                status: response.statusCode,
                description
            });
        });

        request.on('error', () => {
            resolve({
                success: false,
                status: 'ERROR',
                description
            });
        });

        request.setTimeout(5000, () => {
            request.destroy();
            resolve({
                success: false,
                status: 'TIMEOUT',
                description
            });
        });
    });
}

async function validateAuth0Setup() {
    log('\n🔐 Validating Auth0 Setup', 'blue');
    log('================================', 'blue');
    
    const domain = await question('Enter your Auth0 domain (e.g., your-domain.auth0.com): ');
    
    if (!domain) {
        log('❌ Auth0 domain is required', 'red');
        return false;
    }
    
    // Test Auth0 domain accessibility
    const auth0Test = await testConnection(`https://${domain}/.well-known/jwks.json`, 'Auth0 JWKS Endpoint');
    
    if (auth0Test.success) {
        log('✅ Auth0 domain is accessible', 'green');
    } else {
        log(`❌ Auth0 domain test failed (${auth0Test.status})`, 'red');
        log('   Check if the domain is correct and publicly accessible', 'yellow');
        return false;
    }
    
    const clientId = await question('Enter your Auth0 Client ID: ');
    const hasClientSecret = await question('Do you have your Auth0 Client Secret? (y/n): ');
    
    if (!clientId) {
        log('❌ Auth0 Client ID is required', 'red');
        return false;
    }
    
    if (hasClientSecret.toLowerCase() !== 'y') {
        log('❌ Auth0 Client Secret is required for server-side authentication', 'red');
        return false;
    }
    
    log('✅ Auth0 credentials collected', 'green');
    return { domain, clientId };
}

async function validateFGASetup() {
    log('\n🔒 Validating Fine-Grained Authorization Setup', 'blue');
    log('===============================================', 'blue');
    
    const hasFGA = await question('Have you set up Auth0 FGA? (y/n): ');
    
    if (hasFGA.toLowerCase() !== 'y') {
        log('⚠️  FGA not set up - document permissions will not work', 'yellow');
        log('   Follow the FGA setup instructions in EXTERNAL_SETUP.md', 'yellow');
        return false;
    }
    
    const storeId = await question('Enter your FGA Store ID: ');
    const modelId = await question('Enter your FGA Authorization Model ID: ');
    
    if (!storeId || !modelId) {
        log('❌ FGA Store ID and Model ID are required', 'red');
        return false;
    }
    
    log('✅ FGA configuration collected', 'green');
    return { storeId, modelId };
}

async function validateTokenVaultSetup() {
    log('\n🔑 Validating Token Vault Setup', 'blue');
    log('===============================', 'blue');
    
    const hasGoogle = await question('Have you configured Google Calendar API? (y/n): ');
    const hasSlack = await question('Have you configured Slack API? (y/n): ');
    const hasGitHub = await question('Have you configured GitHub API? (y/n): ');
    
    let integrations = 0;
    if (hasGoogle.toLowerCase() === 'y') integrations++;
    if (hasSlack.toLowerCase() === 'y') integrations++;
    if (hasGitHub.toLowerCase() === 'y') integrations++;
    
    if (integrations === 0) {
        log('⚠️  No Token Vault integrations configured', 'yellow');
        log('   Third-party API features will use mock data', 'yellow');
    } else {
        log(`✅ ${integrations} Token Vault integration(s) configured`, 'green');
    }
    
    return {
        google: hasGoogle.toLowerCase() === 'y',
        slack: hasSlack.toLowerCase() === 'y',
        github: hasGitHub.toLowerCase() === 'y'
    };
}

async function validateExternalAPI() {
    log('\n📡 Validating External API Setup', 'blue');
    log('=================================', 'blue');
    
    const hasExternalAPI = await question('Have you set up an external API for user enrichment? (y/n): ');
    
    if (hasExternalAPI.toLowerCase() !== 'y') {
        log('⚠️  No external API configured - Post-Login Action will use mock data', 'yellow');
        return false;
    }
    
    const apiUrl = await question('Enter your external API URL: ');
    
    if (apiUrl) {
        try {
            const apiTest = await testConnection(apiUrl + '/health', 'External API Health Check');
            if (apiTest.success) {
                log('✅ External API is accessible', 'green');
            } else {
                log('⚠️  External API health check failed - verify the endpoint', 'yellow');
            }
        } catch (error) {
            log('⚠️  Could not test external API connectivity', 'yellow');
        }
    }
    
    return { url: apiUrl };
}

async function generateEnvTemplate(config) {
    log('\n💾 Generating Environment Template', 'blue');
    log('=================================', 'blue');
    
    const envTemplate = `# Auth0 Configuration
AUTH0_DOMAIN=${config.auth0?.domain || 'your-domain.auth0.com'}
AUTH0_CLIENT_ID=${config.auth0?.clientId || 'your_client_id'}
AUTH0_CLIENT_SECRET=your_client_secret_here
AUTH0_AUDIENCE=https://api.ai-project-manager.com
AUTH0_REDIRECT_URI=http://localhost:3000/callback

# Session Configuration
SESSION_SECRET=${require('crypto').randomBytes(32).toString('hex')}
BASE_URL=http://localhost:3000
PORT=3000

# Fine-Grained Authorization Configuration
FGA_API_URL=https://api.fga.dev
FGA_STORE_ID=${config.fga?.storeId || 'your_fga_store_id'}
FGA_MODEL_ID=${config.fga?.modelId || 'your_fga_model_id'}
FGA_CLIENT_ID=your_fga_client_id
FGA_CLIENT_SECRET=your_fga_client_secret

# External API Configuration
EXTERNAL_API_URL=${config.externalAPI?.url || 'https://your-api.com'}
EXTERNAL_API_TOKEN=your_api_token
EXTERNAL_API_KEY=your_api_key

# Google Calendar API (if configured)
GOOGLE_CLIENT_ID=${config.tokenVault?.google ? 'your_google_client_id' : ''}
GOOGLE_CLIENT_SECRET=${config.tokenVault?.google ? 'your_google_client_secret' : ''}

# Slack API (if configured)
SLACK_CLIENT_ID=${config.tokenVault?.slack ? 'your_slack_client_id' : ''}
SLACK_CLIENT_SECRET=${config.tokenVault?.slack ? 'your_slack_client_secret' : ''}

# GitHub API (if configured)
GITHUB_CLIENT_ID=${config.tokenVault?.github ? 'your_github_client_id' : ''}
GITHUB_CLIENT_SECRET=${config.tokenVault?.github ? 'your_github_client_secret' : ''}

# Application Configuration
NODE_ENV=development
LOG_LEVEL=debug
`;

    require('fs').writeFileSync('.env.template', envTemplate);
    log('✅ Environment template saved to .env.template', 'green');
    log('   Copy this to .env and fill in your actual secrets', 'yellow');
}

async function showNextSteps(config) {
    log('\n🎯 Next Steps', 'magenta');
    log('=============', 'magenta');
    
    log('\n1. Complete Environment Setup:', 'yellow');
    log('   • Copy .env.template to .env', 'white');
    log('   • Fill in all your actual API keys and secrets', 'white');
    
    if (!config.auth0) {
        log('\n2. Complete Auth0 Setup:', 'yellow');
        log('   • Create Auth0 application', 'white');
        log('   • Configure callback URLs', 'white');
        log('   • Set up Post-Login Action', 'white');
    }
    
    if (!config.fga) {
        log('\n3. Set Up Fine-Grained Authorization:', 'yellow');
        log('   • Create FGA store in Auth0 Dashboard', 'white');
        log('   • Deploy authorization model', 'white');
        log('   • Create test relationship tuples', 'white');
    }
    
    if (!config.tokenVault?.google && !config.tokenVault?.slack && !config.tokenVault?.github) {
        log('\n4. Configure Token Vault Integrations:', 'yellow');
        log('   • Set up Google Calendar API', 'white');
        log('   • Configure Slack API (optional)', 'white');
        log('   • Set up GitHub API (optional)', 'white');
    }
    
    log('\n5. Deploy Post-Login Action:', 'yellow');
    log('   • Copy code from auth0-post-login-action.js', 'white');
    log('   • Create action in Auth0 Dashboard', 'white');
    log('   • Add to Login flow', 'white');
    
    log('\n6. Test the Application:', 'yellow');
    log('   npm install', 'cyan');
    log('   npm start', 'cyan');
    log('   Open http://localhost:3000', 'cyan');
    
    log('\n📖 For detailed instructions, see EXTERNAL_SETUP.md', 'blue');
}

async function runSetupValidation() {
    try {
        log('🚀 Auth0 AI Project Manager - External Setup Validation', 'magenta');
        log('=====================================================', 'magenta');
        log('This tool helps verify your external service configurations\n', 'white');
        
        const config = {};
        
        // Validate each service
        config.auth0 = await validateAuth0Setup();
        config.fga = await validateFGASetup();
        config.tokenVault = await validateTokenVaultSetup();
        config.externalAPI = await validateExternalAPI();
        
        // Generate environment template
        await generateEnvTemplate(config);
        
        // Show next steps
        await showNextSteps(config);
        
        log('\n✅ Setup validation complete!', 'green');
        
    } catch (error) {
        log(`\n❌ Error during setup validation: ${error.message}`, 'red');
    } finally {
        rl.close();
    }
}

// Run if called directly
if (require.main === module) {
    runSetupValidation();
}

module.exports = {
    validateAuth0Setup,
    validateFGASetup,
    validateTokenVaultSetup,
    validateExternalAPI,
    generateEnvTemplate
};