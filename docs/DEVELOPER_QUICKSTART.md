# Developer Quick Start Guide

Get started with Miaoda IDE development in 5 minutes.

## Prerequisites

- Node.js 18.x or later
- Yarn package manager
- Git
- 8GB+ RAM recommended

## Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/miaoda/miaoda-ide.git
cd miaoda-ide

# 2. Install dependencies
yarn install

# 3. Compile
yarn compile

# 4. Run
./scripts/code.sh  # macOS/Linux
# or
.\scripts\code.bat  # Windows
```

## Development Workflow

### Watch Mode (Recommended)

```bash
# Terminal 1: Watch and auto-compile
yarn watch

# Terminal 2: Run Miaoda
./scripts/code.sh
```

Changes will auto-compile. Reload window (Cmd+R / Ctrl+R) to see updates.

### Testing

```bash
# Run all tests
yarn test

# Run specific test
yarn test-node
yarn test-browser

# Run extension tests
cd extensions/shared-services
yarn test
```

## Project Structure

```
miaoda-ide/
├── src/                    # VS Code core source
├── extensions/
│   ├── shared-services/    # 🔥 LLM integration core
│   ├── agent-orchestrator/ # AI agent system
│   └── .../                # Other extensions
├── resources/              # Brand assets
├── docs/                   # Documentation
├── product.json           # Product configuration
└── package.json           # Dependencies
```

## Key Components

### Configuration System

**Location**: `extensions/shared-services/src/`

```typescript
// Import configuration manager
import { ConfigurationManager } from 'shared-services';

// Initialize
const manager = new ConfigurationManager();
await manager.initialize();

// Add model
const model = await manager.addCustomModel({
  name: 'GPT-4',
  provider: 'openai',
  apiUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-...',
  model: 'gpt-4'
});

// Get all models
const models = await manager.getAllModels();

// Test connection
const result = await manager.testConnection(model.id);
```

### LLM Adapter

**Location**: `extensions/shared-services/src/LLMAdapter.ts`

```typescript
import { getLLMAdapter } from 'shared-services';

const adapter = getLLMAdapter();

// Configure provider
adapter.setProvider({
  type: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-4'
});

// Send request
const response = await adapter.complete({
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

// Stream response
for await (const chunk of adapter.stream(request)) {
  console.log(chunk.content);
}
```

## Common Tasks

### Add New Provider

1. **Update Schema**
   ```typescript
   // extensions/shared-services/src/ModelConfigSchema.ts
   export type ProviderType =
     | 'openai'
     | 'anthropic'
     | 'your-provider';  // Add here
   ```

2. **Add Preset**
   ```typescript
   export const PROVIDER_PRESETS: ProviderPreset[] = [
     // ... existing presets
     {
       id: 'your-provider',
       name: 'Your Provider',
       provider: 'your-provider',
       defaultApiUrl: 'https://api.yourprovider.com',
       defaultModel: 'model-name',
       requiresApiKey: true,
       instructions: 'Setup instructions',
       instructionsCN: '设置说明'
     }
   ];
   ```

3. **Implement Provider**
   ```typescript
   // extensions/shared-services/src/LLMAdapter.ts
   class YourProvider extends BaseLLMProvider {
     async complete(request: LLMRequest): Promise<LLMResponse> {
       // Implementation
     }
   }
   ```

### Add Configuration Option

1. **Update Interface**
   ```typescript
   // ModelConfigSchema.ts
   export interface ModelConfig {
     // ... existing fields
     yourNewField?: string;
   }
   ```

2. **Update Validation**
   ```typescript
   // ConfigurationManager.ts
   private validateModelConfig(config: ModelConfig): ValidationResult {
     // Add validation for new field
   }
   ```

3. **Update Tests**
   ```typescript
   // __tests__/ConfigurationManager.test.ts
   it('should validate new field', () => {
     // Test new field
   });
   ```

### Add Documentation

1. **User Docs**: `docs/` directory
2. **Code Comments**: JSDoc format
3. **Examples**: In documentation files

## Debugging

### VS Code Debug

1. Open Miaoda in VS Code
2. Press F5 or Run → Start Debugging
3. New window opens with debugger attached
4. Set breakpoints in source

### Console Logging

```typescript
// Development logging
console.log('Debug info:', data);
console.error('Error:', error);

// Production logging (use sparingly)
if (process.env.NODE_ENV === 'development') {
  console.log('Dev only:', data);
}
```

### Developer Tools

- **Open**: Help → Toggle Developer Tools
- **Console**: View logs and errors
- **Network**: Monitor API calls
- **Sources**: Debug with breakpoints

## Code Style

### TypeScript

```typescript
// Use interfaces for public APIs
export interface ModelConfig {
  id: string;
  name: string;
}

// Use types for unions
export type ProviderType = 'openai' | 'anthropic';

// Use async/await
async function fetchData(): Promise<Data> {
  const response = await fetch(url);
  return response.json();
}

// Error handling
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error(`Failed: ${error}`);
}
```

### Naming Conventions

- **Interfaces**: `IEventBus`, `ModelConfig`
- **Classes**: `ConfigurationManager`, `LLMAdapter`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `PascalCase.ts` for classes, `camelCase.ts` for utilities

### Comments

```typescript
/**
 * Add custom model configuration
 * @param config Model configuration (without id)
 * @returns Created model with generated id
 * @throws Error if validation fails
 */
async addCustomModel(
  config: Omit<ModelConfig, 'id'>
): Promise<ModelConfig> {
  // Implementation
}
```

## Testing

### Unit Tests

```typescript
// __tests__/YourFeature.test.ts
import { YourFeature } from '../YourFeature';

describe('YourFeature', () => {
  let feature: YourFeature;

  beforeEach(() => {
    feature = new YourFeature();
  });

  it('should do something', () => {
    const result = feature.doSomething();
    expect(result).toBe(expected);
  });

  it('should handle errors', () => {
    expect(() => feature.invalid()).toThrow();
  });
});
```

### Integration Tests

```typescript
// Test with real dependencies
it('should integrate with ConfigurationManager', async () => {
  const manager = new ConfigurationManager();
  await manager.initialize();

  const model = await manager.addCustomModel(config);
  expect(model.id).toBeDefined();
});
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes
# ... edit files ...

# Commit
git add .
git commit -m "feat: add your feature"

# Push
git push origin feature/your-feature

# Create pull request on GitHub
```

### Commit Messages

```
feat: add new provider support
fix: resolve connection timeout issue
docs: update configuration guide
test: add tests for ConfigurationManager
refactor: simplify validation logic
style: format code
chore: update dependencies
```

## Building for Production

```bash
# Clean build
yarn gulp clean

# Full build
yarn gulp compile

# Create distributable
yarn gulp vscode-darwin-x64  # macOS
yarn gulp vscode-win32-x64   # Windows
yarn gulp vscode-linux-x64   # Linux
```

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf node_modules out
yarn install
yarn compile
```

### TypeScript Errors

```bash
# Check types
yarn tsc --noEmit

# Fix auto-fixable issues
yarn eslint --fix src/
```

### Extension Not Loading

1. Check `extensions/shared-services/package.json`
2. Verify `out/` directory exists
3. Rebuild: `cd extensions/shared-services && yarn compile`
4. Reload window: Cmd+R / Ctrl+R

## Resources

### Documentation

- [Configuration Guide](CONFIGURATION_GUIDE.md)
- [API Providers](API_PROVIDERS.md)
- [Branding Guide](BRANDING.md)
- [Migration Guide](MIGRATION_GUIDE.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)

### VS Code Extension API

- [Extension API](https://code.visualstudio.com/api)
- [Extension Guides](https://code.visualstudio.com/api/extension-guides/overview)
- [UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview)

### Community

- GitHub: https://github.com/miaoda/miaoda-ide
- Discord: https://discord.gg/miaoda
- Email: dev@miaoda.dev

## Quick Reference

### Useful Commands

```bash
# Development
yarn watch              # Watch and compile
yarn compile            # One-time compile
yarn test               # Run tests

# Code Quality
yarn eslint             # Lint code
yarn format             # Format code

# Building
yarn gulp compile       # Full build
yarn gulp watch         # Watch build

# Extensions
cd extensions/shared-services
yarn compile            # Compile extension
yarn test               # Test extension
```

### File Locations

```
Configuration:     extensions/shared-services/src/ConfigurationManager.ts
LLM Adapter:       extensions/shared-services/src/LLMAdapter.ts
Schemas:           extensions/shared-services/src/ModelConfigSchema.ts
Cloud Service:     extensions/shared-services/src/CloudConfigService.ts
Tests:             extensions/shared-services/src/__tests__/
Docs:              docs/
Brand Assets:      resources/branding/
Product Config:    product.json
```

## Next Steps

1. ✅ Read [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
2. ✅ Explore codebase structure
3. ✅ Run tests to verify setup
4. ✅ Make a small change and test
5. ✅ Read [Configuration Guide](CONFIGURATION_GUIDE.md)
6. ✅ Join Discord community
7. ✅ Start contributing!

---

**Happy Coding!** 🚀

Developed by Coco 🇨🇳 | Miaoda IDE - Universal LLM Integration
