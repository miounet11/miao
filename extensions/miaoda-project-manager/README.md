# Miaoda Project Manager

Intelligent project management system with file tracking, history, and session management.

## Features

- **Automatic Initialization**: Creates `.miaoda/` directory structure on project open
- **File Change Tracking**: Monitors and records all file modifications
- **Session Management**: Tracks development sessions with statistics
- **Structured Logging**: Comprehensive logging with rotation
- **Smart Storage Management**: Automatic compression and cleanup
- **Project Dashboard**: Visual overview of project statistics
- **History Tracking**: Complete history of changes with timestamps

## Directory Structure

```
.miaoda/
├── history/
│   ├── sessions/      # Development sessions
│   ├── changes/       # File change records
│   └── snapshots/     # Compressed snapshots
├── context/
│   ├── index.db       # Code index
│   └── embeddings.db  # Semantic vectors
├── logs/
│   ├── dev.log        # Development log
│   ├── ai.log         # AI interactions log
│   └── error.log      # Error log
├── cache/
│   ├── ast/           # AST cache
│   └── analysis/      # Analysis cache
└── config.json        # Project configuration
```

## Commands

- `Miaoda: Show Project Dashboard` - Display project statistics and recent changes
- `Miaoda: View Project History` - View detailed change history
- `Miaoda: Optimize Project Storage` - Compress old data and cleanup
- `Miaoda: Advanced Settings` - Configure project manager settings

## Configuration

Settings can be configured in VS Code settings:

```json
{
  "miaoda.project.autoInit": true,
  "miaoda.project.trackChanges": true,
  "miaoda.project.autoCompress": true,
  "miaoda.project.compressionThreshold": 2048
}
```

## Architecture

### ProjectManager
Core class that coordinates all managers and handles initialization.

### ChangeTracker
Monitors file system changes and records them with diffs.

### SessionManager
Tracks development sessions with statistics (files modified, AI conversations, commands run).

### LogManager
Structured logging with automatic rotation and cleanup.

### StorageManager
Manages storage, compression, and cleanup operations.

## Development

```bash
# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Run tests
npm test
```

## License

MIT
