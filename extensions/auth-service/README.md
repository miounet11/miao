# Auth Service Extension

Authentication and authorization service for Miaoda IDE.

## Features

- **Email/Password Login**: Traditional authentication
- **OAuth Support**: GitHub, Google, Microsoft
- **Secure Token Storage**: Uses VS Code SecretStorage API
- **Auto Token Refresh**: Automatically refreshes access tokens before expiration
- **Status Bar Integration**: Shows login status in status bar

## Architecture

```
auth-service/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── auth-manager.ts        # Core authentication logic
│   ├── token-storage.ts       # Secure token storage (SecretStorage)
│   ├── oauth-handler.ts       # OAuth flow handler
│   ├── status-bar.ts          # Status bar UI
│   ├── webview/
│   │   └── login-panel.ts     # Login/Register UI
│   └── types/
│       └── auth.ts            # Type definitions
└── package.json
```

## Configuration

```json
{
  "miaoda.auth.apiBaseUrl": "https://api.miaoda.com",
  "miaoda.auth.autoRefresh": true
}
```

## Commands

- `miaoda.auth.login` - Open login panel
- `miaoda.auth.logout` - Logout current user
- `miaoda.auth.showStatus` - Show authentication status

## API for Other Extensions

```typescript
const authService = vscode.extensions.getExtension('miaoda.auth-service');
if (authService) {
  const api = authService.exports;
  const token = await api.getAccessToken();
  const isAuth = api.isAuthenticated();
}
```

## Backend API Integration

### Endpoints Used

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `GET /api/v1/auth/me` - Get user info
- `GET /api/v1/auth/oauth/:provider` - OAuth login
- `POST /api/v1/auth/oauth/callback` - OAuth callback

### Token Management

- **Access Token**: 15 minutes expiry
- **Refresh Token**: 30 days expiry
- **Auto Refresh**: 2 minutes before expiry
- **Storage**: VS Code SecretStorage (encrypted)

## Security

- Tokens stored in VS Code SecretStorage (OS keychain)
- HTTPS only for API calls
- CSRF protection for OAuth (state parameter)
- Auto logout on token refresh failure

## Development

```bash
npm install
npm run compile
npm run watch
```
