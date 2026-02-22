# Migration Guide

Guide for migrating to Miaoda IDE's new configuration system.

## Overview

If you're upgrading from an earlier version or migrating from another IDE, this guide will help you transition to Miaoda's 3-tier configuration system.

## Migration Scenarios

### From VS Code with Extensions

**What carries over:**
- ✅ All your workspace settings
- ✅ Installed extensions (non-conflicting)
- ✅ Keybindings and preferences
- ✅ Git configuration

**What needs configuration:**
- ⚙️ LLM provider settings (new feature)
- ⚙️ Model configurations
- ⚙️ API keys (must be re-entered)

**Steps:**

1. **Install Miaoda IDE**
   ```bash
   # Your existing VS Code remains untouched
   git clone https://github.com/miaoda/miaoda-ide.git
   cd miaoda-ide
   yarn install && yarn compile
   ```

2. **Import VS Code Settings** (Optional)
   ```bash
   # Copy settings
   cp ~/.vscode/settings.json ~/.miaoda/settings.json
   ```

3. **Configure LLM Provider**
   - Open Miaoda IDE
   - Go to Settings → Miaoda → Model Configuration
   - Add your first model using Quick Presets

### From Cursor IDE

**Key Differences:**
- Cursor: Single provider (OpenAI/Anthropic)
- Miaoda: ANY provider with API key

**Migration Steps:**

1. **Export Cursor Settings** (if possible)
   - Note your current model preferences
   - Document any custom prompts

2. **Configure in Miaoda**
   ```typescript
   // If you were using GPT-4 in Cursor
   {
     "name": "GPT-4 (from Cursor)",
     "provider": "openai",
     "apiUrl": "https://api.openai.com/v1",
     "apiKey": "your-key",
     "model": "gpt-4"
   }
   ```

3. **Advantages in Miaoda**
   - Add multiple providers
   - Switch models without restart
   - Use local models (Ollama)
   - No vendor lock-in

### From GitHub Copilot

**Key Differences:**
- Copilot: GitHub account required, limited to GitHub's models
- Miaoda: Bring your own API keys, any model

**Migration Steps:**

1. **Decide on Provider**
   - Continue with OpenAI (GPT-4)
   - Try Anthropic (Claude)
   - Use local models (Ollama)
   - Mix and match

2. **Get API Keys**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/settings/keys

3. **Configure in Miaoda**
   - Use Quick Presets for easy setup
   - Test connection before use

### From Cody (Sourcegraph)

**Key Differences:**
- Cody: Sourcegraph account, limited model selection
- Miaoda: Direct API access, full control

**Migration Steps:**

1. **Choose Your Models**
   - Miaoda supports all models Cody does, plus more
   - Add custom endpoints

2. **Configure**
   ```typescript
   // Example: Using Anthropic (like Cody)
   {
     "name": "Claude Opus",
     "provider": "anthropic",
     "apiUrl": "https://api.anthropic.com/v1",
     "apiKey": "your-key",
     "model": "claude-opus-4"
   }
   ```

## Configuration Migration

### Exporting from Old System

If you have existing LLM configurations:

1. **Document Current Setup**
   - Provider name
   - API endpoint
   - Model identifier
   - Any custom settings

2. **Save API Keys Securely**
   - Export from old system
   - Store temporarily in password manager
   - Will be re-entered in Miaoda

### Importing to Miaoda

**Method 1: Quick Presets (Recommended)**

1. Open Settings → Miaoda → Model Configuration
2. Click "Quick Setup"
3. Select provider (OpenAI, Anthropic, etc.)
4. Enter API key
5. Click "Create"

**Method 2: Manual Configuration**

1. Open Settings → Miaoda → Model Configuration
2. Click "Add Custom Model"
3. Fill in details:
   - Name: Descriptive name
   - Provider: Select type
   - API URL: Endpoint
   - Model: Model identifier
   - API Key: Your key
4. Click "Test Connection"
5. Click "Save"

**Method 3: Import JSON**

```json
{
  "version": "1.0",
  "customModels": [
    {
      "id": "my-gpt4",
      "name": "My GPT-4",
      "provider": "openai",
      "apiUrl": "https://api.openai.com/v1",
      "model": "gpt-4",
      "source": "user",
      "enabled": true
    }
  ],
  "disabledCloudModels": [],
  "exportedAt": 1234567890
}
```

Save as `config.json` and import via Settings → Miaoda → Import Configuration.

**Note:** API keys are NOT included in JSON exports for security. You'll need to re-enter them.

## Data Migration

### Chat History

Miaoda stores chat history locally:

**Location:**
- macOS: `~/Library/Application Support/Miaoda/chat-history/`
- Windows: `%APPDATA%\Miaoda\chat-history\`
- Linux: `~/.config/Miaoda/chat-history/`

**Format:** JSON files, one per conversation

**Migration:**
```bash
# If migrating from another system
# Convert your chat logs to Miaoda format
# See ChatHistoryStorage.ts for schema
```

### API Keys

API keys are stored in system keychain:

**Security:**
- macOS: Keychain Access
- Windows: Credential Manager
- Linux: Secret Service (libsecret)

**Migration:**
- Keys must be re-entered (cannot be exported)
- Use password manager for temporary storage
- Enter once in Miaoda, stored securely

## Verification

### Test Your Configuration

1. **Connection Test**
   - Settings → Miaoda → Model Configuration
   - Select each model
   - Click "Test Connection"
   - Verify ✅ success

2. **Functionality Test**
   - Open a code file
   - Try AI completion
   - Test chat interface
   - Verify responses

3. **Performance Test**
   - Check response latency
   - Verify streaming works
   - Test model switching

### Troubleshooting

**"No provider configured"**
- Add at least one model
- Set as active model

**"Authentication failed"**
- Verify API key is correct
- Check key permissions
- Test with provider's playground

**"Connection timeout"**
- Check internet connection
- Verify firewall settings
- Try different endpoint region

## Rollback Plan

If you need to revert:

1. **Keep Old IDE Installed**
   - Miaoda doesn't replace VS Code/Cursor
   - Both can coexist

2. **Export Miaoda Config**
   - Before uninstalling
   - Save for future use

3. **Uninstall Miaoda**
   ```bash
   # Remove application
   rm -rf /path/to/miaoda-ide

   # Remove config (optional)
   rm -rf ~/.miaoda
   ```

## Best Practices

### During Migration

1. **Start Small**
   - Configure one model first
   - Test thoroughly
   - Add more models gradually

2. **Document Everything**
   - Keep notes on configurations
   - Save working setups
   - Export configs regularly

3. **Test in Non-Critical Project**
   - Don't migrate during deadline
   - Test on side project first
   - Verify all features work

### After Migration

1. **Regular Backups**
   - Export configuration monthly
   - Save to cloud storage
   - Keep API keys in password manager

2. **Monitor Usage**
   - Check API usage dashboards
   - Set spending alerts
   - Optimize model selection

3. **Stay Updated**
   - Watch for Miaoda updates
   - Review new features
   - Update configurations as needed

## Common Migration Patterns

### Pattern 1: Single Provider

**Before (Cursor):**
- One provider (OpenAI)
- One model (GPT-4)

**After (Miaoda):**
```typescript
// Same setup, but with flexibility
{
  "name": "GPT-4",
  "provider": "openai",
  "model": "gpt-4"
}
```

### Pattern 2: Multi-Provider

**Before (Multiple tools):**
- Copilot for code
- ChatGPT for chat
- Claude for analysis

**After (Miaoda):**
```typescript
// All in one IDE
[
  { "name": "GPT-4 Code", "provider": "openai", "model": "gpt-4" },
  { "name": "Claude Analysis", "provider": "anthropic", "model": "claude-opus-4" },
  { "name": "Local Llama", "provider": "ollama", "model": "llama2" }
]
```

### Pattern 3: Cost Optimization

**Before:**
- Always using GPT-4 (expensive)

**After (Miaoda):**
```typescript
// Use appropriate model for task
[
  { "name": "GPT-3.5 Fast", "model": "gpt-3.5-turbo" },  // Quick tasks
  { "name": "GPT-4 Complex", "model": "gpt-4" },        // Complex tasks
  { "name": "Ollama Free", "model": "llama2" }          // Development
]
```

## Support

Need help with migration?

- 📚 [Configuration Guide](CONFIGURATION_GUIDE.md)
- 🔌 [API Providers Guide](API_PROVIDERS.md)
- 💬 [Discord Community](https://discord.gg/miaoda)
- 📧 [Email Support](mailto:support@miaoda.dev)
- 🐛 [GitHub Issues](https://github.com/miaoda/miaoda-ide/issues)

## FAQ

**Q: Will I lose my VS Code settings?**
A: No, Miaoda uses separate config directory (~/.miaoda)

**Q: Can I use both VS Code and Miaoda?**
A: Yes, they can coexist peacefully

**Q: Do I need to pay for Miaoda?**
A: Miaoda is free and open source. You pay only for API usage.

**Q: Can I migrate back to VS Code?**
A: Yes, anytime. Your VS Code installation is untouched.

**Q: How do I transfer API keys?**
A: API keys must be re-entered for security. Use password manager for temporary storage.

**Q: What about my extensions?**
A: Most VS Code extensions work in Miaoda. Some may need updates.

**Q: Is my data safe?**
A: Yes. API keys in keychain, data stays local, HTTPS for API calls.
