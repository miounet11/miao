# Quick Start Guide - Settings Webview Extension

## 🚀 Getting Started in 5 Minutes

### Prerequisites

- Node.js 16+ installed
- VSCode or Miaoda IDE
- Basic knowledge of TypeScript and React

### Installation

```bash
cd /Users/lu/ide/miaoda-ide/extensions/settings-webview
npm install
```

### Development

```bash
# Watch mode (auto-recompile on changes)
npm run watch

# Or compile once
npm run compile
```

### Testing

1. Open Miaoda IDE
2. Press `F5` to launch Extension Development Host
3. In the new window:
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Miaoda: Open Settings"
   - Press Enter

### Project Structure

```
settings-webview/
├── src/                    # Extension host code
│   ├── extension.ts        # Entry point
│   └── SettingsViewProvider.ts  # Webview logic
├── webview/                # React UI code
│   ├── App.tsx             # Main component
│   ├── components/         # UI components
│   └── styles/             # CSS files
├── out/                    # Compiled output
└── package.json            # Dependencies
```

## 📝 Common Tasks

### Add a New Component

1. Create file in `webview/components/`:

```typescript
// webview/components/MyComponent.tsx
import React from 'react';
import '../styles/components.css';

interface MyComponentProps {
  title: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return (
    <div className="my-component">
      <h3>{title}</h3>
    </div>
  );
};

export default MyComponent;
```

2. Import in `App.tsx`:

```typescript
import MyComponent from './components/MyComponent';
```

3. Add styles in `webview/styles/components.css`:

```css
.my-component {
  padding: 20px;
  background-color: var(--secondary-bg);
}
```

### Add a New Message Type

1. Update `webview/types.ts`:

```typescript
export interface Message {
  type: 'myNewMessage' | 'getAllModels' | ...;
  data?: any;
}
```

2. Handle in `SettingsViewProvider.ts`:

```typescript
switch (message.type) {
  case 'myNewMessage':
    this._handleMyNewMessage(message.data);
    break;
  // ...
}
```

3. Send from React:

```typescript
vscode.postMessage({ type: 'myNewMessage', data: myData });
```

### Add a New Tab

1. Update `App.tsx` tab type:

```typescript
type Tab = 'models' | 'quick-setup' | 'my-new-tab' | ...;
```

2. Add tab button:

```tsx
<button
  className={`tab ${activeTab === 'my-new-tab' ? 'active' : ''}`}
  onClick={() => setActiveTab('my-new-tab')}
>
  My New Tab
</button>
```

3. Add tab content:

```tsx
{activeTab === 'my-new-tab' && (
  <MyNewTabComponent />
)}
```

## 🎨 Styling Guide

### Use VSCode Theme Variables

```css
.my-element {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  border: 1px solid var(--vscode-panel-border);
}
```

### Available Variables

- `--vscode-editor-background`
- `--vscode-editor-foreground`
- `--vscode-button-background`
- `--vscode-button-foreground`
- `--vscode-input-background`
- `--vscode-input-foreground`
- `--vscode-panel-border`
- `--vscode-sideBar-background`
- `--vscode-list-hoverBackground`

### Custom Variables

```css
:root {
  --primary-color: var(--vscode-button-background);
  --success-color: #4caf50;
  --error-color: #f44336;
}
```

## 🔧 Debugging

### Extension Host

1. Set breakpoints in `src/` files
2. Press `F5` to start debugging
3. Breakpoints will hit in main VSCode window

### Webview

1. Open Extension Development Host
2. Press `Cmd+Shift+P` → "Developer: Open Webview Developer Tools"
3. Use Chrome DevTools to debug React code
4. Check Console for errors
5. Inspect Elements

### Common Issues

**Webview not loading?**
- Check `out/webview/webview.js` exists
- Run `npm run compile:webview`
- Check browser console for errors

**TypeScript errors?**
- Run `npm run compile:extension`
- Check `tsconfig.json` settings
- Ensure all imports are correct

**Styles not applying?**
- Check CSS is imported in component
- Verify VSCode theme variables
- Inspect element in DevTools

## 📦 Building for Production

```bash
# Clean build
rm -rf out/
npm run compile

# Verify output
ls -la out/src/
ls -la out/webview/
```

## 🧪 Testing Checklist

- [ ] All tabs load correctly
- [ ] Forms validate input
- [ ] Buttons trigger correct actions
- [ ] Notifications appear and dismiss
- [ ] Theme colors match VSCode
- [ ] Responsive on different sizes
- [ ] No console errors
- [ ] TypeScript compiles without errors

## 📚 Key Files Reference

### Extension Host

- `src/extension.ts` - Extension activation
- `src/SettingsViewProvider.ts` - Webview provider and message handling

### React UI

- `webview/index.tsx` - React entry point
- `webview/App.tsx` - Main app component with tab logic
- `webview/types.ts` - TypeScript interfaces

### Components

- `webview/components/ModelList.tsx` - Display models
- `webview/components/ModelForm.tsx` - Add/edit form
- `webview/components/QuickSetup.tsx` - Provider templates
- `webview/components/CloudSync.tsx` - Cloud integration
- `webview/components/ImportExport.tsx` - Backup/restore
- `webview/components/AdvancedSettings.tsx` - Advanced options

### Styles

- `webview/styles/App.css` - Main app styles
- `webview/styles/components.css` - Component styles

### Configuration

- `package.json` - Extension manifest
- `tsconfig.json` - TypeScript config (extension)
- `tsconfig.webview.json` - TypeScript config (webview)
- `webpack.config.js` - Webpack bundler config

## 🎯 Next Steps

1. **Integrate ConfigurationManager**
   - Replace `globalState` with ConfigurationManager
   - Use KeychainService for API keys

2. **Implement Real Cloud Sync**
   - Connect to actual API endpoints
   - Handle authentication
   - Sync data bidirectionally

3. **Add Connection Testing**
   - Implement real API calls
   - Show latency and status
   - Handle errors gracefully

4. **Enhance Validation**
   - Add more validation rules
   - Test API URLs
   - Validate model identifiers

5. **Add More Features**
   - Model usage statistics
   - Cost tracking
   - Search and filter
   - Keyboard shortcuts

## 💡 Tips

- Use `console.log()` in webview code (visible in Webview DevTools)
- Use `console.log()` in extension code (visible in Debug Console)
- Hot reload: Save files in watch mode to auto-recompile
- Test in both light and dark themes
- Keep components small and focused
- Use TypeScript for type safety
- Follow existing code patterns

## 🆘 Getting Help

- Check `README.md` for detailed documentation
- Review `PROJECT_SUMMARY.md` for architecture overview
- See `UI_SHOWCASE.md` for design patterns
- Look at existing components for examples

## ✅ You're Ready!

You now have everything you need to develop and extend the Settings Webview extension. Happy coding! 🚀
