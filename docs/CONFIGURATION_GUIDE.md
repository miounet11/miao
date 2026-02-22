# Miaoda IDE Configuration Guide

## Overview

Miaoda IDE features a flexible 3-tier configuration system that allows you to use ANY language model with the correct API credentials.

## 3-Tier Configuration System

### Tier 1: Cloud Defaults (Official)

**What it is**: Pre-configured models provided by Miaoda based on your membership level.

**Features**:
- Automatic updates from cloud
- Optimized settings for each model
- No manual configuration needed
- Based on membership tier (Free, Pro, Enterprise)

**How it works**:
1. Miaoda fetches model configurations from cloud endpoint
2. Models are filtered by your membership level
3. Configurations are cached locally (1 hour TTL)
4. Automatic fallback to local defaults if cloud is unavailable

**Membership Tiers**:
- **Free**: Basic models (GPT-3.5, Claude Instant)
- **Pro**: Advanced models (GPT-4, Claude Opus)
- **Enterprise**: All models + custom deployment options

### Tier 2: User Custom (Override)

**What it is**: Your own API keys and custom endpoints that override cloud defaults.

**Features**:
- Add ANY third-party API
- Store API keys securely in system keychain
- Full control over model parameters
- Priority over cloud defaults

**How to add**:
1. Open Settings → Miaoda → Model Configuration
2. Click "Add Custom Model"
3. Fill in:
   - Model Name
   - Provider Type
   - API URL
   - API Key (stored securely)
   - Model Identifier
   - Optional: Max Tokens, Temperature, Headers
4. Click "Save"

### Tier 3: Quick Presets (Templates)

**What it is**: One-click configuration templates for popular providers.

**Available Presets**:
- OpenAI
- Anthropic
- Ollama (Local)
- Azure OpenAI
- Google AI
- DeepSeek

**How to use**:
1. Open Settings → Miaoda → Model Configuration
2. Click "Quick Setup"
3. Select a preset
4. Enter your API key (if required)
5. Optionally customize endpoint URL
6. Click "Create"

## Configuration Schema

### Model Configuration Object

```typescript
interface ModelConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  nameCN?: string;               // Chinese name
  provider: ProviderType;        // Provider type
  apiKey?: string;               // API key (stored in keychain)
  apiUrl: string;                // API endpoint
  model: string;                 // Model identifier
  maxTokens?: number;            // Max tokens (1-1000000)
  temperature?: number;          // Temperature (0-2)
  streaming?: boolean;           // Enable streaming
  headers?: Record<string, string>; // Custom headers
  membership?: MembershipTier;   // Required tier
  source: 'cloud' | 'user' | 'preset'; // Config source
  enabled?: boolean;             // Is enabled
  contextWindow?: number;        // Context window size
  supportsVision?: boolean;      // Supports images
  supportsFunctions?: boolean;   // Supports function calling
  description?: string;          // Description
  descriptionCN?: string;        // Chinese description
}
```

### Provider Types

- `openai` - OpenAI API
- `anthropic` - Anthropic API
- `ollama` - Ollama (local)
- `azure` - Azure OpenAI
- `google` - Google AI
- `deepseek` - DeepSeek
- `custom` - Custom provider

## Security

### API Key Storage

**Secure Storage**:
- API keys are stored in system keychain/credential manager
- Never stored in plain text
- Never logged or transmitted except to configured endpoint

**Platform-specific**:
- **macOS**: Keychain Access
- **Windows**: Windows Credential Manager
- **Linux**: Secret Service API (libsecret)

### HTTPS Enforcement

- All cloud API calls use HTTPS
- Custom endpoints should use HTTPS (warning shown for HTTP)
- Exception: Ollama local endpoints (localhost/127.0.0.1)

### Token Security

- Session tokens encrypted in memory
- Automatic token refresh
- Tokens cleared on logout

## Configuration Management

### Export Configuration

```bash
# Export your custom models and settings
Settings → Miaoda → Export Configuration
```

Exported JSON includes:
- Custom models (without API keys)
- Disabled cloud models
- Active model selection
- Timestamp

### Import Configuration

```bash
# Import configuration from JSON file
Settings → Miaoda → Import Configuration
```

**Note**: API keys are NOT included in exports for security. You'll need to re-enter them after import.

### Sync Across Devices

**Cloud Sync** (Coming Soon):
- Sync custom model configurations
- Sync preferences
- API keys remain local (never synced)

## Advanced Configuration

### Custom Headers

Some APIs require custom headers:

```json
{
  "headers": {
    "X-API-Version": "2024-01",
    "X-Custom-Header": "value"
  }
}
```

### Proxy Support

Configure proxy in VS Code settings:

```json
{
  "http.proxy": "http://proxy.example.com:8080",
  "http.proxyStrictSSL": true
}
```

### Rate Limiting

Configure rate limits per model:

```json
{
  "miaoda.rateLimits": {
    "requestsPerMinute": 60,
    "tokensPerMinute": 90000
  }
}
```

## Testing Configuration

### Test Connection

1. Open Settings → Miaoda → Model Configuration
2. Select a model
3. Click "Test Connection"
4. View results:
   - ✅ Success: Connection OK, latency shown
   - ❌ Error: Error message displayed

### Validation

Automatic validation checks:
- ✅ Valid URL format
- ✅ Required fields present
- ✅ Token limits within range
- ✅ Temperature within range (0-2)
- ⚠️ Warnings for unusual configurations

## Troubleshooting

### Common Issues

**"No provider configured"**
- Solution: Add at least one model configuration
- Go to Settings → Miaoda → Add Custom Model

**"Authentication failed"**
- Check API key is correct
- Verify API key has required permissions
- Check API endpoint URL

**"Connection timeout"**
- Check internet connection
- Verify API endpoint is accessible
- Check firewall/proxy settings

**"Model not found"**
- Verify model identifier is correct
- Check model is available in your API account
- Try listing available models

### Debug Mode

Enable debug logging:

```json
{
  "miaoda.debug": true,
  "miaoda.logLevel": "debug"
}
```

View logs:
- **Output Panel**: View → Output → Miaoda
- **Developer Tools**: Help → Toggle Developer Tools → Console

## Examples

### Example 1: OpenAI Configuration

```json
{
  "name": "GPT-4 Turbo",
  "provider": "openai",
  "apiUrl": "https://api.openai.com/v1",
  "model": "gpt-4-turbo-preview",
  "apiKey": "sk-...",
  "maxTokens": 4096,
  "temperature": 0.7,
  "streaming": true
}
```

### Example 2: Ollama Local

```json
{
  "name": "Llama 2 Local",
  "provider": "ollama",
  "apiUrl": "http://localhost:11434",
  "model": "llama2",
  "streaming": true
}
```

### Example 3: Azure OpenAI

```json
{
  "name": "Azure GPT-4",
  "provider": "azure",
  "apiUrl": "https://myresource.openai.azure.com",
  "model": "gpt-4",
  "apiKey": "...",
  "headers": {
    "api-version": "2024-02-01"
  }
}
```

### Example 4: Custom OpenAI-Compatible API

```json
{
  "name": "Custom LLM",
  "provider": "custom",
  "apiUrl": "https://api.custom.com/v1",
  "model": "custom-model-name",
  "apiKey": "...",
  "headers": {
    "X-Custom-Auth": "token"
  }
}
```

## Best Practices

1. **Use Cloud Defaults First**: Try official configurations before custom
2. **Secure API Keys**: Never commit API keys to version control
3. **Test Connections**: Always test after adding new configuration
4. **Export Regularly**: Backup your configurations
5. **Monitor Usage**: Track token usage to avoid unexpected costs
6. **Use Presets**: Start with presets for common providers
7. **Name Clearly**: Use descriptive names for custom models
8. **Document Custom**: Add descriptions to custom configurations

## API Reference

For programmatic access, see:
- [ConfigurationManager API](../extensions/shared-services/src/ConfigurationManager.ts)
- [ModelConfigSchema](../extensions/shared-services/src/ModelConfigSchema.ts)
- [CloudConfigService](../extensions/shared-services/src/CloudConfigService.ts)

## Support

- **Documentation**: https://docs.miaoda.dev
- **Issues**: https://github.com/miaoda/miaoda-ide/issues
- **Community**: https://discord.gg/miaoda
- **Email**: support@miaoda.dev
