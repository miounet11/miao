# Agent Chat Panel - Project Structure

## Created Files

### Source Files (src/)
- `src/extension.ts` - Extension entry point (updated)
- `src/ChatController.ts` - Chat logic controller (existing)
- `src/ChatViewProvider.ts` - **NEW** Webview provider for React UI
- `src/IChatController.ts` - Interface definitions (existing)
- `src/commands.ts` - Command handlers (existing)

### Webview Files (webview/)
- `webview/index.tsx` - **NEW** React entry point
- `webview/types.ts` - **NEW** TypeScript type definitions
- `webview/ChatView.tsx` - **NEW** Main chat container component
- `webview/MessageList.tsx` - **NEW** Message display component
- `webview/InputBox.tsx` - **NEW** Message input component
- `webview/HistorySidebar.tsx` - **NEW** History sidebar component
- `webview/ChatView.css` - **NEW** Main chat styles
- `webview/MessageList.css` - **NEW** Message list styles
- `webview/InputBox.css` - **NEW** Input box styles
- `webview/HistorySidebar.css` - **NEW** Sidebar styles

### Configuration Files
- `package.json` - **UPDATED** Added React dependencies and build scripts
- `tsconfig.json` - TypeScript config for extension (existing)
- `tsconfig.webview.json` - **NEW** TypeScript config for webview
- `webpack.config.js` - **NEW** Webpack configuration for bundling React

### Resources
- `resources/chat-icon.svg` - **NEW** Activity bar icon

### Documentation
- `README.md` - **NEW** Extension documentation
- `PROJECT_STRUCTURE.md` - **NEW** This file

## Build Output (out/)

### Extension Output (out/src/)
- `out/src/extension.js` - Compiled extension entry
- `out/src/ChatController.js` - Compiled controller
- `out/src/ChatViewProvider.js` - Compiled webview provider
- `out/src/IChatController.js` - Compiled interfaces
- `out/src/commands.js` - Compiled commands
- Plus corresponding `.d.ts` and `.js.map` files

### Webview Output (out/webview/)
- `out/webview/webview.js` - Bundled React application (177 KB)
- `out/webview/webview.js.map` - Source map
- `out/webview/webview.js.LICENSE.txt` - License information

## Dependencies Added

### Runtime
- `uuid@^9.0.0` - Generate unique IDs

### Development
- `react@^18.2.0` - UI framework
- `react-dom@^18.2.0` - React DOM renderer
- `@types/react@^18.2.0` - React type definitions
- `@types/react-dom@^18.2.0` - React DOM type definitions
- `webpack@^5.77.0` - Module bundler
- `webpack-cli@^5.0.1` - Webpack CLI
- `ts-loader@^9.4.2` - TypeScript loader for Webpack
- `css-loader@^6.7.3` - CSS loader for Webpack
- `style-loader@^3.3.2` - Style loader for Webpack

## Build Commands

```bash
# Install dependencies
npm install

# Build everything
npm run compile

# Build extension only
npm run compile:extension

# Build webview only
npm run compile:webview

# Watch mode (both)
npm run watch

# Watch extension only
npm run watch:extension

# Watch webview only
npm run watch:webview
```

## Integration Points

### VSCode Extension API
- `vscode.window.registerWebviewViewProvider()` - Register webview
- `vscode.commands.registerCommand()` - Register commands
- `webview.postMessage()` - Send messages to webview
- `webview.onDidReceiveMessage()` - Receive messages from webview

### Shared Services
- `getChatController()` - Chat logic and LLM integration
- `getChatHistoryStorage()` - Persistent storage
- `getLLMAdapter()` - LLM API calls
- `getContextAnalyzer()` - Context building

## Component Hierarchy

```
ChatView (Main Container)
├── Header
│   ├── History Toggle Button
│   ├── Title
│   └── New Chat Button
├── Error Banner (conditional)
├── Chat Container
│   ├── HistorySidebar (conditional)
│   │   ├── Header
│   │   ├── Search Input
│   │   └── Session List
│   │       └── Session Groups (by date)
│   │           └── Session Items
│   └── Chat Main
│       ├── MessageList
│       │   ├── Empty State (conditional)
│       │   ├── Messages
│       │   │   ├── Message Header (role + timestamp)
│       │   │   └── Message Content
│       │   └── Loading Indicator (conditional)
│       └── InputBox
│           ├── Textarea
│           ├── Send Button
│           └── Hint Text
```

## Message Flow

```
User Input → InputBox
    ↓
    postMessage('sendMessage')
    ↓
ChatViewProvider.handleMessage()
    ↓
ChatController.sendMessage()
    ↓
LLMAdapter.complete()
    ↓
ChatViewProvider.postMessage('newMessage')
    ↓
ChatView.handleMessage()
    ↓
MessageList (UI Update)
```

## Styling

All styles use VSCode CSS variables for theme integration:
- `--vscode-foreground`
- `--vscode-editor-background`
- `--vscode-input-background`
- `--vscode-button-background`
- `--vscode-panel-border`
- And many more...

## Security

- Content Security Policy (CSP) enabled
- Scripts require nonce
- Local resource roots restricted
- No inline scripts (except with nonce)
