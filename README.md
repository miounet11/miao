# Miaoda IDE (妙搭)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/miaoda/miaoda-ide/blob/main/LICENSE.txt)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](https://github.com/miaoda/miaoda-ide/releases)
[![Developer](https://img.shields.io/badge/developer-Coco%20%F0%9F%87%A8%F0%9F%87%B3-red.svg)](https://github.com/miaoda/miaoda-ide)

**Universal LLM Integration - Your Way** | **通用 LLM 集成 - 随心所欲**

Developed by Coco from China (来自中国)

## What is Miaoda IDE?

Miaoda (妙搭, meaning "wonderful assembly") is a powerful IDE with **universal LLM integration**. Connect to ANY language model with just an API key, URL, and model name. No vendor lock-in, no restrictions - just pure flexibility.

### Core Features

🌐 **Universal LLM Support**
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude Opus, Sonnet)
- Ollama (Local models)
- Azure OpenAI
- Google AI (Gemini)
- DeepSeek (深度求索)
- Any OpenAI-compatible API

⚙️ **3-Tier Configuration System**
1. **Cloud Defaults**: Pre-configured official models based on membership
2. **User Custom**: Your own API keys and endpoints (override cloud)
3. **Quick Presets**: One-click setup for popular providers

🔒 **Security First**
- API keys stored in system keychain
- Never logged or exposed
- HTTPS enforcement
- Encrypted token storage

🚀 **Developer Experience**
- Hot-swap models without restart
- Test connections before use
- Import/export configurations
- Bilingual support (English/Chinese)

## Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/miaoda/miaoda-ide.git
cd miaoda-ide

# Install dependencies
yarn install

# Build
yarn compile

# Run
./scripts/code.sh
```

### Configure Your First Model

1. Open Settings → Miaoda → Model Configuration
2. Choose a quick preset (e.g., OpenAI, Anthropic, Ollama)
3. Enter your API key
4. Click "Test Connection"
5. Start coding with AI!

## Documentation

- 📘 [Configuration Guide](docs/CONFIGURATION_GUIDE.md) - Complete configuration reference
- 🎨 [Branding Guide](docs/BRANDING.md) - Brand identity and assets
- 🔌 [API Providers](docs/API_PROVIDERS.md) - Provider-specific setup guides

## Architecture

Miaoda IDE is built on Visual Studio Code

### Configuration System

```typescript
// Example: Add custom model
const config = {
  name: "My GPT-4",
  provider: "openai",
  apiUrl: "https://api.openai.com/v1",
  apiKey: "sk-...",
  model: "gpt-4",
  maxTokens: 8192,
  temperature: 0.7,
  streaming: true
};

await configManager.addCustomModel(config);
```

### Supported Providers

| Provider | Type | Cost | Setup Time |
|----------|------|------|------------|
| OpenAI | Cloud | $$$ | 2 min |
| Anthropic | Cloud | $$$ | 2 min |
| Ollama | Local | Free | 5 min |
| Azure OpenAI | Cloud | $$$ | 10 min |
| Google AI | Cloud | $$ | 2 min |
| DeepSeek | Cloud | $ | 2 min |
| Custom | Any | Varies | 5 min |

## Contributing

We welcome contributions from the community!

### Ways to Contribute

* 🐛 [Report bugs](https://github.com/miaoda/miaoda-ide/issues/new?template=bug_report.md)
* 💡 [Request features](https://github.com/miaoda/miaoda-ide/issues/new?template=feature_request.md)
* 🔧 Submit pull requests
* 📖 Improve documentation
* 🌍 Add translations (Chinese/English)

### Development Setup

```bash
# Install dependencies
yarn install

# Watch mode (auto-compile)
yarn watch

# Run tests
yarn test

# Build extensions
yarn compile-extensions
```

### Project Structure

```
miaoda-ide/
├── extensions/
│   ├── shared-services/      # Core LLM integration
│   ├── agent-orchestrator/   # AI agent system
│   └── ...
├── src/                      # VS Code core
├── docs/                     # Documentation
├── resources/                # Brand assets
└── product.json             # Product configuration
```

## Community & Support

### Get Help

* 📚 [Documentation](https://docs.miaoda.dev)
* 💬 [Discord Community](https://discord.gg/miaoda)
* 🐛 [GitHub Issues](https://github.com/miaoda/miaoda-ide/issues)
* 📧 [Email Support](mailto:support@miaoda.dev)

### Stay Updated

* 🌟 Star this repository
* 👀 Watch for releases
* 🐦 Follow updates (coming soon)

### Language Support

- **English**: Full documentation and UI
- **中文**: 完整的文档和界面支持

## Related Projects

Many of the core components and extensions to VS Code live in their own repositories on GitHub. For example, the [node debug adapter](https://github.com/microsoft/vscode-node-debug) and the [mono debug adapter](https://github.com/microsoft/vscode-mono-debug) repositories are separate from each other. For a complete list, please visit the [Related Projects](https://github.com/microsoft/vscode/wiki/Related-Projects) page on our [wiki](https://github.com/microsoft/vscode/wiki).

## Bundled Extensions

VS Code includes a set of built-in extensions located in the [extensions](extensions) folder, including grammars and snippets for many languages. Extensions that provide rich language support (code completion, Go to Definition) for a language have the suffix `language-features`. For example, the `json` extension provides coloring for `JSON` and the `json-language-features` extension provides rich language support for `JSON`.

## Development Container

This repository includes a Visual Studio Code Dev Containers / GitHub Codespaces development container.

* For [Dev Containers](https://aka.ms/vscode-remote/download/containers), use the **Dev Containers: Clone Repository in Container Volume...** command which creates a Docker volume for better disk I/O on macOS and Windows.
  * If you already have VS Code and Docker installed, you can also click [here](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/microsoft/vscode) to get started. This will cause VS Code to automatically install the Dev Containers extension if needed, clone the source code into a container volume, and spin up a dev container for use.

* For Codespaces, install the [GitHub Codespaces](https://marketplace.visualstudio.com/items?itemName=GitHub.codespaces) extension in VS Code, and use the **Codespaces: Create New Codespace** command.

Docker / the Codespace should have at least **4 Cores and 6 GB of RAM (8 GB recommended)** to run full build. See the [development container README](.devcontainer/README.md) for more information.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## License

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under the [MIT](LICENSE.txt) license.
