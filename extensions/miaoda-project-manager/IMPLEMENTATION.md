# Miaoda Project Manager - Implementation Guide

## Overview

The Miaoda Project Manager is a comprehensive project management system that automatically tracks file changes, manages development sessions, and optimizes storage.

## Core Components

### 1. ProjectManager (src/managers/ProjectManager.ts)

**Responsibilities:**
- Initialize `.miaoda/` directory structure
- Coordinate all sub-managers
- Setup file watchers
- Manage periodic tasks
- Provide high-level API

**Key Methods:**
- `initialize()` - Initialize the project manager
- `getProjectStats()` - Get project statistics
- `getStorageStats()` - Get storage usage
- `getRecentChanges()` - Get recent file changes
- `optimizeStorage()` - Trigger storage optimization
- `dispose()` - Cleanup resources

### 2. ChangeTracker (src/trackers/ChangeTracker.ts)

**Responsibilities:**
- Monitor file system changes
- Calculate diffs for modified files
- Store change records
- Query changes by date or time range

**Key Methods:**
- `trackChange()` - Record a file change
- `getAllChanges()` - Get all recorded changes
- `getRecentChanges()` - Get recent changes
- `getChangesForDate()` - Get changes for specific date
- `clearOldChanges()` - Remove old change records

**Storage Format:**
```
.miaoda/history/changes/
├── 2026-02-21/
│   ├── 14-30-45-123.json
│   └── 15-20-10-456.json
└── 2026-02-20/
    └── ...
```

### 3. SessionManager (src/managers/SessionManager.ts)

**Responsibilities:**
- Track development sessions
- Record session statistics
- Persist session data
- Query sessions by date

**Key Methods:**
- `startSession()` - Begin a new session
- `endSession()` - End current session
- `getCurrentSession()` - Get active session
- `recordFileModification()` - Increment file count
- `recordAIConversation()` - Increment AI count
- `recordCommandExecution()` - Increment command count
- `getSessionsForDate()` - Get sessions for specific date

**Storage Format:**
```
.miaoda/history/sessions/
├── 2026-02-21.json  # Array of SessionRecord
└── 2026-02-20.json
```

### 4. LogManager (src/managers/LogManager.ts)

**Responsibilities:**
- Structured logging
- Log rotation
- Log cleanup
- Error tracking

**Key Methods:**
- `debug()`, `info()`, `warn()`, `error()` - Log messages
- `readLogs()` - Read log entries
- `clearOldLogs()` - Remove old logs

**Log Files:**
- `dev.log` - Development activities
- `ai.log` - AI interactions
- `error.log` - Error messages

**Log Rotation:**
- Max file size: 10MB
- Max files: 5 per type
- Automatic rotation when size exceeded

### 5. StorageManager (src/managers/StorageManager.ts)

**Responsibilities:**
- Monitor storage usage
- Compress old data
- Cleanup old files
- Manage compression settings

**Key Methods:**
- `getStorageStats()` - Get storage usage
- `checkAndCompress()` - Check and compress if needed
- `cleanup()` - Execute cleanup tasks
- `updateCompressionOptions()` - Update settings

**Compression Rules:**
- Trigger: Size > 2GB OR data > 30 days old
- Target: Compress to 200MB
- Keep recent: 7 days uncompressed

**Cleanup Rules:**
- Old snapshots: Delete after 90 days
- Temp files: Delete after 1 day
- Error logs: Delete after 30 days

## Data Flow

### File Change Tracking

```
File System Change
    ↓
File Watcher (VSCode)
    ↓
ChangeTracker.trackChange()
    ↓
Calculate Diff
    ↓
Save to Disk (.miaoda/history/changes/)
    ↓
Update Cache
    ↓
SessionManager.recordFileModification()
```

### Storage Optimization

```
Periodic Task (5 min interval)
    ↓
StorageManager.checkAndCompress()
    ↓
Check Size & Age
    ↓
Compress Old Data
    ↓
Cleanup Old Files
    ↓
Log Results
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_CONFIG: ProjectConfig = {
  projectRoot: '',
  miaodaDir: '',
  autoInit: true,
  trackChanges: true,
  autoCompress: true,
  autoCleanup: true,
};
```

### Compression Options

```typescript
const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  targetSize: 200 * 1024 * 1024,        // 200MB
  keepRecent: 7 * 24 * 60 * 60 * 1000,  // 7 days
  compressionLevel: 6,                   // 1-9
};
```

### Cleanup Rules

```typescript
const DEFAULT_CLEANUP_RULES: CleanupRules = {
  oldSnapshots: 90 * 24 * 60 * 60 * 1000,  // 90 days
  tempFiles: 1 * 24 * 60 * 60 * 1000,      // 1 day
  errorLogs: 30 * 24 * 60 * 60 * 1000,     // 30 days
};
```

## Extension Commands

### Dashboard

```
Command: miaoda.project.dashboard
Handler: handleDashboard()
Output: Markdown document with statistics
```

### History

```
Command: miaoda.project.history
Handler: handleHistory()
Output: Markdown document with today's changes
```

### Optimize

```
Command: miaoda.project.optimize
Handler: handleOptimize()
Action: Compress and cleanup storage
```

### Settings

```
Command: miaoda.project.settings
Handler: handleSettings()
Output: Quick pick for settings categories
```

## Error Handling

### File Operations
- Try-catch blocks around all file I/O
- Graceful degradation on errors
- Error logging for debugging

### Directory Creation
- Recursive directory creation
- Check existence before operations
- Handle permission errors

### Data Persistence
- JSON serialization with error handling
- Fallback to defaults on parse errors
- Atomic writes where possible

## Performance Considerations

### Caching
- In-memory cache for recent changes
- Lazy loading of historical data
- Cache invalidation on updates

### Async Operations
- All I/O operations are async
- Non-blocking file watchers
- Periodic tasks run in background

### Storage Optimization
- Compression runs periodically (5 min)
- Cleanup runs with compression
- Configurable thresholds

## Testing

### Test Files
- `ProjectManager.test.ts` - Core functionality
- `ChangeTracker.test.ts` - Change tracking
- `SessionManager.test.ts` - Session management
- `LogManager.test.ts` - Logging
- `StorageManager.test.ts` - Storage operations

### Test Coverage
- Initialization
- File operations
- Data persistence
- Error handling
- Configuration

## Future Enhancements

1. **Database Integration**
   - Replace JSON with SQLite for better performance
   - Indexed queries for faster searches
   - Transaction support

2. **Advanced Compression**
   - Implement actual tar.gz compression
   - Delta compression for similar files
   - Configurable compression algorithms

3. **AI Integration**
   - Generate summaries of changes
   - Suggest optimizations
   - Semantic search

4. **Visualization**
   - Timeline view
   - Change statistics
   - Storage usage charts

5. **Backup & Recovery**
   - Automatic backups
   - Point-in-time recovery
   - Backup verification

## Troubleshooting

### High Memory Usage
- Reduce cache size
- Increase compression threshold
- Run cleanup more frequently

### Slow Performance
- Check file watcher configuration
- Verify storage I/O
- Review log file sizes

### Missing Changes
- Verify file watcher is active
- Check .gitignore patterns
- Review error logs

## References

- ZERO_CONFIG_DESIGN.md - Design specification
- types.ts - Type definitions
- Extension API - VSCode documentation
