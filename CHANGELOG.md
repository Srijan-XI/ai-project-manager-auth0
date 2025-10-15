# Changelog

All notable changes to the AI Project Manager with Auth0 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-16

### Fixed
- **Auth0 SPA SDK Loading Issue**: Fixed Auth0 SDK not loading by downgrading from v2.1 to stable v1.22
- **Login Button Not Working**: Resolved client-side authentication initialization errors
- **Client Secret Exposure**: Removed `clientSecret` from browser-side configuration (security fix)
- **Redirect URI Mismatch**: Fixed redirect_uri to use config value instead of hardcoded origin
- **Script Loading Order**: Added proper script loading error handlers and logging

### Changed
- **Auth0 SDK Version**: Downgraded from 2.1 to 1.22 for better stability
- **Configuration Structure**: Cleaned up `auth0-config.js` to only include SPA-required fields
- **Error Handling**: Enhanced `auth0-spa-client.js` with comprehensive error checking and logging
- **Debug Tools**: Added onload/onerror handlers for Auth0 SDK script loading

### Added
- **Debug Page**: Created `client/debug.html` for troubleshooting authentication issues
- **Better Logging**: Added console logging for Auth0 client creation and initialization
- **Troubleshooting Guide**: Comprehensive troubleshooting section in README.md
- **Environment Setup**: Detailed environment variable documentation

### Security
- ⚠️ **CRITICAL**: Removed client secret from browser-side configuration
- 🔒 Enhanced security by separating server and client configurations
- ✅ Validated proper SPA authentication flow without exposing secrets

### Documentation
- Updated README.md with detailed troubleshooting section
- Added setup instructions for Single Page Applications
- Documented common issues and solutions
- Added environment variable requirements
- Created CHANGELOG.md for version tracking

## [1.0.0] - 2025-10-15

### Added
- Initial release with Auth0 for AI Agents integration
- Universal Login implementation
- Token Vault integration
- Fine-Grained Authorization (FGA)
- Asynchronous Authorization
- Post-Login Actions
- Express.js backend server
- Client-side SPA with Auth0 SDK
- Comprehensive documentation
- Vercel deployment configuration

### Features
- 🔐 Secure user authentication with OAuth 2.0
- 🎫 Token Vault for third-party API management
- 🔒 Fine-grained authorization with relationship-based permissions
- 🤝 Async authorization for human-in-the-loop workflows
- 📊 Security logging and audit trails
- 🎨 Modern, responsive UI
- 🚀 Production-ready architecture

### Infrastructure
- Node.js Express server
- Auth0 SPA SDK v2.0 (later downgraded to v1.22)
- JWT RS256 token validation
- Rate limiting and security headers
- Health check and metrics endpoints
- Vercel serverless deployment

---

## Migration Guide

### Upgrading from 1.0.0 to 1.1.0

1. **Update Dependencies**
```bash
npm install
```

2. **Clear Browser Cache**
```bash
# Hard refresh your browser: Ctrl+Shift+R
```

3. **Verify Auth0 Configuration**
- Check that your application type is **Single Page Application** in Auth0 Dashboard
- Verify callback URLs include both `/callback` and base URL
- Remove any client secrets from browser-side configuration

4. **Test Authentication**
```bash
npm start
# Visit http://localhost:3000 and test login
```

5. **Use Debug Page**
```
# If issues persist, check:
http://localhost:3000/debug.html
```

### Breaking Changes
- None in this release

### Deprecations
- Auth0 SPA SDK v2.0+ support temporarily removed due to compatibility issues
- Using stable v1.22 until v2.x issues are resolved

---

## Roadmap

### Upcoming Features (v1.2.0)
- [ ] Enhanced Token Vault UI with token status indicators
- [ ] Real-time FGA permission updates via WebSockets
- [ ] Improved async authorization dashboard
- [ ] Multi-factor authentication (MFA) integration
- [ ] Advanced audit logging with export functionality

### Future Considerations (v2.0.0)
- [ ] Machine learning-based permission recommendations
- [ ] Advanced AI agent orchestration
- [ ] Integration with additional Auth0 features
- [ ] Mobile application support
- [ ] GraphQL API layer

---

## Support

For issues or questions:
- 📝 GitHub Issues: https://github.com/Srijan-XI/ai-project-manager-auth0/issues
- 📚 Documentation: See README.md
- 🔍 Debug Tool: http://localhost:3000/debug.html

---

*Last Updated: October 16, 2025*
