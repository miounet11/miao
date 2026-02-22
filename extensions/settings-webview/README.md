# Miaoda IDE Settings Webview

Beautiful settings UI for Miaoda IDE configuration management.

## Features

### Model Configuration Tab
- View all configured models in a beautiful grid layout
- Add new models with comprehensive form validation
- Edit existing model configurations
- Delete custom models
- Test connection to verify API endpoints
- Set active model with radio button selection
- Visual badges for different providers (OpenAI, Anthropic, Ollama, etc.)

### Quick Setup Tab
- Pre-configured provider templates
- One-click model setup for popular providers:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude Opus 4)
  - Ollama (Local models)
  - Google AI (Gemini)
  - DeepSeek
  - Azure OpenAI
- API key input with show/hide toggle
- Custom URL configuration
- Step-by-step instructions in English and Chinese

### Cloud Sync Tab
- Sign in to Miaoda Cloud
- View membership tier (Free, Pro, Enterprise, Custom)
- Sync official model configurations
- Auto-sync toggle
- Sync history with status indicators
- Upgrade prompts for premium features

### Import/Export Tab
- Export configuration as JSON file
- Import configuration from JSON
- Drag-and-drop file upload
- JSON preview and editing before import
- Backup and restore functionality
- Security notes about API key handling

### Advanced Settings Tab
- Custom HTTP headers configuration
- Proxy settings with enable/disable toggle
- Rate limiting controls (requests per minute)
- Connection timeout configuration
- Retry attempts setting
- Debug options:
  - Log API requests
  - Log API responses
  - Show detailed error messages

## UI Design

- Modern, clean interface with smooth animations
- Full VSCode theme integration using CSS variables
- Responsive layout that adapts to different screen sizes
- Loading states for async operations
- Success/error notifications with auto-dismiss
- Form validation with inline error messages
- Accessible components with proper ARIA labels

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Webpack** - Module bundling
- **CSS** - Styling with VSCode theme variables
- **VSCode Extension API** - Integration with IDE

## Commands

- `miaoda.settings.open` - Open settings panel
- `miaoda.settings.quickSetup` - Open quick setup wizard

## Integration

The extension integrates with:
- VSCode's `globalState` for persistent storage
- System keychain for secure API key storage (via KeychainService)
- ConfigurationManager from shared-services (planned)
- Message passing between webview and extension host

## Development

### Build

```bash
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Project Structure

```
settings-webview/
├── src/
│   ├── extension.ts           # Extension entry point
│   └── SettingsViewProvider.ts # Webview provider
├── webview/
│   ├── index.tsx              # React entry
│   ├── App.tsx                # Main app component
│   ├── types.ts               # TypeScript types
│   ├── components/
│   │   ├── ModelList.tsx      # Model list view
│   │   ├── ModelForm.tsx      # Add/edit model form
│   │   ├── QuickSetup.tsx     # Quick setup wizard
│   │   ├── CloudSync.tsx      # Cloud sync interface
│   │   ├── ImportExport.tsx   # Import/export tools
│   │   └── AdvancedSettings.tsx # Advanced options
│   └── styles/
│       ├── App.css            # Main app styles
│       └── components.css     # Component styles
├── resources/
│   └── settings-icon.svg      # Activity bar icon
├── package.json
├── tsconfig.json
├── tsconfig.webview.json
└── webpack.config.js
```

## Message Protocol

The webview communicates with the extension host using message passing:

### From Webview to Extension
- `getAllModels` - Request all configured models
- `getActiveModel` - Request active model ID
- `setActiveModel` - Set active model
- `addModel` - Add new model
- `updateModel` - Update existing model
- `deleteModel` - Delete model
- `testConnection` - Test model connection
- `getPresets` - Get provider presets
- `createFromPreset` - Create model from preset
- `exportConfig` - Export configuration
- `importConfig` - Import configuration
- `syncCloud` - Sync with cloud
- `getMembership` - Get membership tier

### From Extension to Webview
- `allModels` - All models data
- `activeModel` - Active model ID
- `modelAdded` - Model added successfully
- `modelUpdated` - Model updated successfully
- `modelDeleted` - Model deleted successfully
- `presets` - Provider presets data
- `membership` - Membership tier
- `success` - Operation success
- `error` - Operation error
- `showQuickSetup` - Show quick setup tab

## Styling

The extension uses VSCode theme variables for seamless integration:

```css
--vscode-editor-background
--vscode-editor-foreground
--vscode-button-background
--vscode-button-foreground
--vscode-input-background
--vscode-input-foreground
--vscode-panel-border
--vscode-sideBar-background
--vscode-list-hoverBackground
```

## Future Enhancements

- [ ] Full integration with ConfigurationManager
- [ ] Real cloud sync implementation
- [ ] Model usage statistics
- [ ] Cost tracking
- [ ] Model comparison tool
- [ ] Batch operations
- [ ] Search and filter models
- [ ] Model templates library
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements

## License

MIT
