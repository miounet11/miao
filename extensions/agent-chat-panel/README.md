# Agent Chat Panel Extension

AI-powered chat interface for natural language development in Miaoda IDE.

## Features

- **Interactive Chat Interface**: Modern React-based UI with VSCode theme integration
- **Message History**: Persistent chat sessions with search and filtering
- **Context-Aware**: Automatically includes active file and selected code in conversations
- **Session Management**: Create, load, and delete chat sessions
- **Real-time Updates**: Streaming responses with loading indicators

## Architecture

### Extension Structure

```
agent-chat-panel/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── ChatController.ts     # Chat logic and LLM integration
│   ├── ChatViewProvider.ts   # Webview provider
│   ├── IChatController.ts    # Interface definitions
│   └── commands.ts           # Command handlers
├── webview/
│   ├── index.tsx            # React entry point
│   ├── ChatView.tsx         # Main chat component
│   ├── MessageList.tsx      # Message display component
│   ├── InputBox.tsx         # Input component
│   ├── HistorySidebar.tsx   # History sidebar component
│   ├── types.ts             # TypeScript types
│   └── *.css                # Component styles
├── resources/
│   └── chat-icon.svg        # Activity bar icon
└── webpack.config.js        # Webpack configuration
```

### Components

#### ChatView
Main container component that manages:
- Message state
- Session state
- Communication with extension host
- Error handling

#### MessageList
Displays conversation history with:
- User and assistant messages
- Timestamps
- Loading indicators
- Empty state

#### InputBox
Message input with:
- Auto-resizing textarea
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- Send button
- Disabled state during loading

#### HistorySidebar
Session management with:
- Session list grouped by date
- Search functionality
- Load and delete actions
- Active session highlighting

### Communication Flow

1. **Webview → Extension**: User sends message via `vscode.postMessage()`
2. **Extension**: ChatController processes message with LLM
3. **Extension → Webview**: Response sent back via `webview.postMessage()`
4. **Webview**: UI updates with new message

### Message Types

- `ready`: Webview initialized, request initial state
- `init`: Send initial session data to webview
- `sendMessage`: User sent a message
- `newMessage`: New message from assistant
- `newSession`: Create new chat session
- `loadSession`: Load existing session
- `loadSessions`: Request all sessions
- `deleteSession`: Delete a session
- `error`: Error occurred

## Development

### Build

```bash
npm install
npm run compile
```

### Watch Mode

```bash
npm run watch
```

This runs both TypeScript and Webpack in watch mode.

### Scripts

- `compile`: Build both extension and webview
- `compile:extension`: Build TypeScript extension code
- `compile:webview`: Build React webview with Webpack
- `watch`: Watch both extension and webview
- `watch:extension`: Watch TypeScript extension code
- `watch:webview`: Watch React webview

## Dependencies

### Runtime
- `uuid`: Generate unique IDs for messages and sessions

### Development
- `react` & `react-dom`: UI framework
- `typescript`: Type checking
- `webpack`: Bundle webview code
- `ts-loader`: TypeScript loader for Webpack
- `css-loader` & `style-loader`: CSS processing

## Configuration

The extension uses VSCode's webview API with:
- Content Security Policy for security
- Local resource roots for asset loading
- Theme variable integration for consistent styling

## Integration

The extension integrates with:
- **shared-services**: LLM adapter, context analyzer, chat history storage
- **VSCode API**: Webview, commands, workspace, window

## Commands

- `miaoda.chat.open`: Open chat panel
- `miaoda.chat.clear`: Clear current session
- `miaoda.chat.new`: Create new session
- `miaoda.chat.loadHistory`: Load chat history
- `miaoda.chat.searchHistory`: Search chat history
- `miaoda.chat.deleteSession`: Delete session
- `miaoda.chat.exportSession`: Export session
