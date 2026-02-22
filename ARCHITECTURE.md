# Miaoda IDE Architecture

## Overview

Miaoda IDE is an AI-powered development environment built on VSCode, featuring autonomous agents, natural language interaction, and browser automation.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Miaoda IDE (VSCode Fork)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Chat Panel   │  │ Orchestrator │  │ Skills Mgr   │    │
│  │              │  │              │  │              │    │
│  │ - Webview UI │  │ - Task Queue │  │ - Registry   │    │
│  │ - History    │  │ - Execution  │  │ - Execution  │    │
│  │ - Commands   │  │ - Monitoring │  │ - Lifecycle  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │             │
│         └─────────────────┼─────────────────┘             │
│                           │                               │
│  ┌────────────────────────┴────────────────────────┐     │
│  │          Shared Services Layer                  │     │
│  │                                                  │     │
│  │  • Event Bus (Pub/Sub)                          │     │
│  │  • LLM Adapter (OpenAI/Anthropic/Ollama)        │     │
│  │  • Context Analyzer (Token counting)            │     │
│  │  • Keychain Service (Secure storage)            │     │
│  │  • Capability Registry (Client caps)            │     │
│  │  • Chat History Storage (JSON files)            │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────┐                                          │
│  │ Browser      │                                          │
│  │ Bridge       │                                          │
│  │              │                                          │
│  │ - Playwright │                                          │
│  │ - Recorder   │                                          │
│  │ - Automation │                                          │
│  └──────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Agent Chat Panel
**Purpose**: Natural language interface for AI interaction

**Features**:
- React-based Webview UI
- Message history with persistence
- Context-aware conversations
- Session management (save/load/search)
- Export to Markdown/JSON

**Key Files**:
- `ChatController.ts` - Message handling and LLM integration
- `ChatViewProvider.ts` - VSCode Webview provider
- `commands.ts` - Command registration
- `webview/` - React UI components

### 2. Agent Orchestrator
**Purpose**: Manages agent task lifecycle and execution

**Features**:
- Priority-based task queue
- Concurrent task execution (max 3)
- Task state management (pending/running/completed/failed/cancelled)
- Step-by-step execution tracking
- Event-driven updates

**Key Files**:
- `AgentOrchestrator.ts` - Core orchestration logic
- `IAgentOrchestrator.ts` - Interface definitions

**Task States**:
```
PENDING → RUNNING → COMPLETED
                  ↘ FAILED
                  ↘ CANCELLED
```

### 3. Skills Manager
**Purpose**: Extensible skill system for agent capabilities

**Features**:
- Skill registration and discovery
- Lifecycle management (register/unregister/execute)
- Built-in skills:
  - File operations (read/write/delete)
  - Code analysis (parse/analyze)
  - Git operations (commit/push/branch)
  - Terminal execution
- Timeout and error handling

**Key Files**:
- `SkillsManager.ts` - Skill registry and execution
- `ISkillsManager.ts` - Interface definitions
- `skills/` - Built-in skill implementations

### 4. Browser Bridge
**Purpose**: Browser automation via Playwright

**Features**:
- Multi-browser support (Chromium/Firefox/WebKit)
- Action recording and playback
- Screenshot capture
- Script generation (Playwright/TypeScript)
- Headless and headed modes

**Key Files**:
- `BrowserBridge.ts` - Playwright wrapper
- `BrowserRecorder.ts` - Action recording
- `IBrowserBridge.ts` - Interface definitions

### 5. Shared Services
**Purpose**: Common utilities and infrastructure

**Components**:

#### Event Bus
- Pub/sub pattern for inter-extension communication
- Request/response support
- Disposable subscriptions

#### LLM Adapter
- Multi-provider support (OpenAI, Anthropic, Ollama)
- Streaming responses
- Token counting
- Error handling and retries

#### Context Analyzer
- File content extraction
- Token counting (cl100k_base)
- Glob pattern exclusion
- Context truncation

#### Keychain Service
- Native OS keychain integration
- Secure credential storage
- Fallback to in-memory storage

#### Chat History Storage
- JSON file-based persistence
- Session search
- Export/import

## Data Flow

### Chat Workflow
```
1. User sends message
   ↓
2. ChatController receives message
   ↓
3. Context Analyzer builds context
   ↓
4. LLM Adapter calls AI model
   ↓
5. Response returned to user
   ↓
6. History saved to storage
   ↓
7. Agent task detected (optional)
   ↓
8. Task submitted to Orchestrator
```

### Agent Task Execution
```
1. Task submitted to Orchestrator
   ↓
2. Added to priority queue
   ↓
3. Queue sorted by priority
   ↓
4. Task picked for execution
   ↓
5. Steps generated and executed
   ↓
6. Progress updates emitted
   ↓
7. Result returned
   ↓
8. Next task started
```

## Event System

### Event Types

**Chat Events**:
- `chat.message.sent` - User message sent
- `chat.message.received` - AI response received
- `chat.session.created` - New session started
- `chat.session.loaded` - Session loaded from history

**Agent Events**:
- `agent.task.submitted` - Task submitted
- `agent.task.updated` - Task state changed
- `agent.task.completed` - Task finished successfully
- `agent.task.failed` - Task failed

**Skill Events**:
- `skill.registered` - New skill registered
- `skill.executed` - Skill executed
- `skill.failed` - Skill execution failed

## Testing Strategy

### Unit Tests
- Each component has dedicated test suite
- Mock VSCode API
- Property-based testing with fast-check
- 113+ test cases

### Integration Tests
- Cross-component workflows
- Event bus communication
- End-to-end scenarios

### Performance Tests
- 100 concurrent events < 100ms
- 50 concurrent tasks < 1s
- Large sessions (100 msgs) < 500ms

## Configuration

### Extension Settings
```json
{
  "miaoda.llm.provider": "openai",
  "miaoda.llm.model": "gpt-4",
  "miaoda.llm.apiKey": "<stored in keychain>",
  "miaoda.agent.maxConcurrentTasks": 3,
  "miaoda.browser.defaultBrowser": "chromium",
  "miaoda.browser.headless": true
}
```

## Commands

### Chat Commands
- `miaoda.chat.open` - Open chat panel
- `miaoda.chat.new` - New chat session
- `miaoda.chat.loadHistory` - Load history
- `miaoda.chat.searchHistory` - Search history
- `miaoda.chat.deleteSession` - Delete session
- `miaoda.chat.exportSession` - Export session

### Agent Commands
- `miaoda.agent.submitTask` - Submit task
- `miaoda.agent.listTasks` - List tasks
- `miaoda.agent.cancelTask` - Cancel task

### Skills Commands
- `miaoda.skills.list` - List skills
- `miaoda.skills.execute` - Execute skill
- `miaoda.skills.register` - Register skill

### Browser Commands
- `miaoda.browser.launch` - Launch browser
- `miaoda.browser.record` - Record actions
- `miaoda.browser.screenshot` - Take screenshot
- `miaoda.browser.close` - Close browser

## Performance Metrics

| Operation | Target | Actual |
|-----------|--------|--------|
| Event emission (100x) | < 100ms | ~10ms |
| Task submission (50x) | < 1s | ~200ms |
| Session save (100 msgs) | < 500ms | ~100ms |
| Session load (100 msgs) | < 200ms | ~50ms |
| LLM response | < 5s | ~2s |

## Security

- API keys stored in OS keychain
- No credentials in code or config
- Sandboxed browser execution
- Input validation on all commands

## Future Enhancements

1. **Multi-agent collaboration** - Agents working together
2. **Custom skill marketplace** - Community skills
3. **Advanced context management** - RAG, embeddings
4. **Real-time collaboration** - Multi-user sessions
5. **Mobile companion app** - Remote control
