# Miaoda Project Manager - Quick Start Guide

## Installation

1. The extension is located at:
   ```
   /Users/lu/ide/miaoda-ide/extensions/miaoda-project-manager/
   ```

2. Install dependencies:
   ```bash
   cd /Users/lu/ide/miaoda-ide/extensions/miaoda-project-manager
   npm install
   ```

3. Compile TypeScript:
   ```bash
   npm run compile
   ```

## Usage

### Commands

Access commands via `Cmd+Shift+P` (or `Ctrl+Shift+P` on Linux/Windows):

1. **Miaoda: Show Project Dashboard**
   - Displays project statistics
   - Shows storage usage
   - Lists recent changes

2. **Miaoda: View Project History**
   - Shows today's changes
   - Displays file modifications
   - Shows change details

3. **Miaoda: Optimize Project Storage**
   - Compresses old data
   - Cleans up temporary files
   - Removes old logs

4. **Miaoda: Advanced Settings**
   - Configure compression
   - Adjust cleanup rules
   - Modify tracking settings

### Automatic Features

- **Auto-initialization**: `.miaoda/` directory created on project open
- **File tracking**: All changes automatically recorded
- **Session tracking**: Development sessions tracked automatically
- **Storage optimization**: Runs every 5 minutes
- **Log rotation**: Automatic when files exceed 10MB

## Configuration

Edit VS Code settings (`settings.json`):

```json
{
  "miaoda.project.autoInit": true,
  "miaoda.project.trackChanges": true,
  "miaoda.project.autoCompress": true,
  "miaoda.project.compressionThreshold": 2048
}
```

## Directory Structure

After initialization, `.miaoda/` contains:

```
.miaoda/
├── history/
│   ├── sessions/      # Daily session records
│   ├── changes/       # File change records
│   └── snapshots/     # Compressed archives
├── context/           # Code index and embeddings
├── logs/              # Application logs
├── cache/             # Temporary cache
└── config.json        # Configuration
```

## Data Storage

### Changes
- Location: `.miaoda/history/changes/YYYY-MM-DD/`
- Format: JSON files with timestamps
- Contains: File path, change type, diff info

### Sessions
- Location: `.miaoda/history/sessions/YYYY-MM-DD.json`
- Format: Array of session records
- Contains: Start/end time, file count, AI conversations, commands

### Logs
- Location: `.miaoda/logs/`
- Files: `dev.log`, `ai.log`, `error.log`
- Format: JSON lines (one entry per line)
- Rotation: Automatic at 10MB

## Performance

- **Memory**: Minimal overhead with caching
- **Disk**: Automatic compression keeps size manageable
- **CPU**: Background tasks run periodically
- **I/O**: Async operations prevent blocking

## Troubleshooting

### Extension not activating
- Check VS Code console for errors
- Verify workspace folder is open
- Reload VS Code window

### High disk usage
- Run "Optimize Project Storage" command
- Check `.miaoda/` directory size
- Review compression settings

### Missing changes
- Verify file watcher is active
- Check if files are in `.gitignore`
- Review error logs

## Development

### Build
```bash
npm run compile      # One-time build
npm run watch        # Watch mode
```

### Testing
```bash
npm test             # Run tests
```

### Debugging
- Check logs in `.miaoda/logs/`
- Use VS Code debug console
- Enable debug logging in settings

## API Reference

### ProjectManager

```typescript
const manager = new ProjectManager(projectRoot);
await manager.initialize();

// Get statistics
const stats = await manager.getProjectStats();
const storage = await manager.getStorageStats();

// Get changes
const recent = await manager.getRecentChanges(50);
const today = await manager.getChangesForDate(new Date());

// Optimize
await manager.optimizeStorage();

// Cleanup
await manager.dispose();
```

### ChangeTracker

```typescript
const tracker = manager.getChangeTracker();

// Track changes
await tracker.trackChange(filePath);

// Query changes
const all = await tracker.getAllChanges();
const recent = await tracker.getRecentChanges(10);
const today = await tracker.getChangesForDate(new Date());
```

### SessionManager

```typescript
const sessions = manager.getSessionManager();

// Session lifecycle
await sessions.startSession();
await sessions.recordFileModification();
await sessions.recordAIConversation();
await sessions.endSession();

// Query sessions
const current = await sessions.getCurrentSession();
const today = await sessions.getSessionsForDate(new Date());
```

### LogManager

```typescript
const logs = manager.getLogManager();

// Logging
logs.info('category', 'message', { metadata });
logs.warn('category', 'message');
logs.error('category', 'message', { error });

// Query logs
const entries = await logs.readLogs('dev.log', 100);
```

## Next Steps

1. Open a project in VS Code
2. Run "Miaoda: Show Project Dashboard"
3. Make some file changes
4. Run "Miaoda: View Project History"
5. Check `.miaoda/` directory structure

## Support

For issues or questions:
1. Check error logs in `.miaoda/logs/`
2. Review IMPLEMENTATION.md for technical details
3. Check README.md for feature overview

