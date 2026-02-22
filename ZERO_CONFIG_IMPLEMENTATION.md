# Zero-Config Smart Defaults Implementation Guide

## Overview

This document describes the implementation of the zero-configuration smart defaults system for Miaoda IDE. The system provides intelligent, automatic configuration that works out-of-the-box while remaining deeply customizable for advanced users.

## Architecture

### Core Components

#### 1. SmartDefaults (`src/vs/miaoda/common/smartDefaults.ts`)

Manages intelligent default values for all IDE settings.

**Key Features:**
- Provides sensible defaults for editor, theme, terminal, git, AI, and project settings
- Merges user configuration with smart defaults
- Supports per-category default retrieval
- Allows reset to defaults

**Usage:**
```typescript
const smartDefaults = new SmartDefaults(configService);
await smartDefaults.applyDefaults();
const editorDefaults = smartDefaults.getEditorDefaults();
```

#### 2. AutoOptimizer (`src/vs/miaoda/common/autoOptimizer.ts`)

Automatically detects project characteristics and system preferences.

**Detection Capabilities:**
- **Project Type**: Node.js, Python, Java, Go, Rust, C#
- **Code Style**: Indentation, quotes, semicolons, trailing commas
- **System Info**: Language, theme preference, shell, platform

**Usage:**
```typescript
const optimizer = new AutoOptimizer(fileService, logService, workspaceRoot);
const projectType = await optimizer.detectProjectType();
const codeStyle = await optimizer.detectCodeStyle();
const systemInfo = await optimizer.detectSystemInfo();
```

#### 3. FirstRunExperience (`src/vs/miaoda/common/firstRunExperience.ts`)

Handles first-time setup and initialization.

**Features:**
- Detects first run
- Auto-applies system-detected settings
- Marks setup as complete
- Can be reset for re-initialization

**Usage:**
```typescript
const fre = new FirstRunExperience(storageService, configService, logService, optimizer, smartDefaults);
await fre.initialize();
const isFirstRun = await fre.isFirstRun();
```

#### 4. SmartNotifications (`src/vs/miaoda/common/smartNotifications.ts`)

Provides non-intrusive, intelligent notifications.

**Features:**
- Storage space warnings
- Performance optimization suggestions
- Feature recommendations
- Cooldown to prevent notification spam

**Usage:**
```typescript
const notifications = new SmartNotifications(logService, storageService);
await notifications.checkStorage(stats);
await notifications.suggestOptimizations(issues);
```

#### 5. QuickActions (`src/vs/miaoda/common/quickActions.ts`)

Provides one-click operations for common tasks.

**Features:**
- View today's work summary
- Restore to specific timestamp
- One-click project optimization
- Generate work reports

**Usage:**
```typescript
const actions = new QuickActions(logService, fileService, miaodaRoot);
const todayWork = await actions.getTodayWork();
await actions.optimizeProject();
const report = await actions.generateWorkReport(7);
```

#### 6. ProjectManager (`src/vs/miaoda/common/projectManager.ts`)

Manages the `.miaoda/` directory structure and project metadata.

**Features:**
- Initializes `.miaoda/` directory structure
- Manages project configuration
- Records file changes
- Tracks storage statistics
- Creates sessions and snapshots

**Directory Structure:**
```
.miaoda/
├── history/
│   ├── sessions/        # Development sessions
│   ├── changes/         # File change records
│   └── snapshots/       # Compressed snapshots
├── context/
│   ├── index.db         # Code index
│   ├── embeddings.db    # Semantic vectors
│   └── graph.json       # Dependency graph
├── logs/
│   ├── dev.log          # Development log
│   ├── ai.log           # AI interaction log
│   └── error.log        # Error log
├── cache/
│   ├── ast/             # AST cache
│   └── analysis/        # Analysis cache
├── config.json          # Project configuration
└── .gitignore           # Auto-generated
```

**Usage:**
```typescript
const manager = new ProjectManager(workspaceRoot, fileService, logService);
await manager.initialize(projectDefaults);
await manager.recordChange('src/app.ts', 'modify', { added: 45, removed: 12 });
const stats = await manager.getStorageStats();
```

#### 7. MiaodaService (`src/vs/miaoda/browser/miaodaService.ts`)

Main service that integrates all components.

**Features:**
- Singleton service registered with DI container
- Coordinates initialization of all components
- Provides unified API for all functionality
- Emits events for initialization and settings changes

**Usage:**
```typescript
const miaodaService = await instantiationService.invokeFunction(accessor => accessor.get(IMiaodaService));
await miaodaService.initialize();
const todayWork = await miaodaService.getTodayWork();
```

## Configuration Structure

### Smart Defaults Configuration

All smart defaults are stored under the `miaoda` namespace in VS Code settings:

```json
{
  "miaoda.editor.fontSize": 13,
  "miaoda.editor.tabSize": 2,
  "miaoda.editor.formatOnSave": true,
  "miaoda.editor.autoSave": "afterDelay",
  "miaoda.theme.colorTheme": "Miaoda Dark",
  "miaoda.theme.autoSwitch": true,
  "miaoda.terminal.fontSize": 12,
  "miaoda.terminal.shell": "auto",
  "miaoda.git.enabled": true,
  "miaoda.git.autoFetch": true,
  "miaoda.ai.enabled": true,
  "miaoda.project.autoInit": true,
  "miaoda.project.trackChanges": true,
  "miaoda.project.autoCompress": true,
  "miaoda.project.compressionThreshold": 2147483648,
  "miaoda.project.compressionAge": 30
}
```

## Integration Points

### 1. Workbench Initialization

The service is registered as a workbench contribution and automatically initialized during the Ready lifecycle phase:

```typescript
// src/vs/miaoda/browser/miaoda.contribution.ts
registerSingleton(IMiaodaService, MiaodaService, true);
workbenchRegistry.registerWorkbenchContribution(MiaodaWorkbenchContribution, LifecyclePhase.Ready);
```

### 2. Configuration Service Integration

The service listens to configuration changes and emits events:

```typescript
this._register(
  this.configService.onDidChangeConfiguration(e => {
    this._onDidChangeSettings.fire(e);
  })
);
```

### 3. File Service Integration

Used for:
- Reading project files to detect type and style
- Managing `.miaoda/` directory structure
- Recording file changes
- Calculating storage statistics

## Usage Examples

### Example 1: Initialize on Startup

```typescript
const miaodaService = accessor.get(IMiaodaService);
await miaodaService.initialize();

if (await miaodaService.isFirstRun()) {
  // Show welcome screen
  showWelcomeScreen();
}
```

### Example 2: Apply Smart Defaults

```typescript
const smartDefaults = miaodaService.getSmartDefaults();
await smartDefaults.applyDefaults();

// Get specific defaults
const editorDefaults = smartDefaults.getEditorDefaults();
const themeDefaults = smartDefaults.getThemeDefaults();
```

### Example 3: Auto-Detect Project Settings

```typescript
const optimizer = miaodaService.getAutoOptimizer();
const projectType = await optimizer.detectProjectType();
const codeStyle = await optimizer.detectCodeStyle();
const systemInfo = await optimizer.detectSystemInfo();

// Apply detected settings
applyProjectSettings(projectType, codeStyle);
```

### Example 4: Show Smart Notifications

```typescript
const notifications = miaodaService.getSmartNotifications();
const stats = await miaodaService.getStorageStats();

await notifications.checkStorage(stats);
await notifications.suggestOptimizations(performanceIssues);
```

### Example 5: Quick Actions

```typescript
const actions = miaodaService.getQuickActions();

// View today's work
const todayWork = await actions.getTodayWork();
console.log(`Modified ${todayWork.filesModified} files today`);

// One-click optimization
await actions.optimizeProject();

// Generate report
const report = await actions.generateWorkReport(7);
console.log(report);
```

## Testing

Unit tests are provided in `src/vs/miaoda/test/smartDefaults.test.ts`.

**Run tests:**
```bash
npm test -- src/vs/miaoda/test/smartDefaults.test.ts
```

**Test coverage includes:**
- Default value validation
- Per-category default retrieval
- Configuration merging
- Reset functionality

## Performance Considerations

### 1. Lazy Initialization

Components are only initialized when needed:

```typescript
getSmartDefaults(): SmartDefaults {
  if (!this.smartDefaults) {
    throw new Error('Miaoda service not initialized');
  }
  return this.smartDefaults;
}
```

### 2. Caching

- Project configuration is cached after first load
- System info is detected once and reused
- Storage stats are calculated on-demand

### 3. Async Operations

All I/O operations are async to prevent blocking:

```typescript
async detectProjectType(): Promise<ProjectType>
async recordChange(...): Promise<void>
async getStorageStats(): Promise<IStorageStats>
```

## Security Considerations

### 1. File Access

- All file operations use the IFileService abstraction
- No direct filesystem access
- Respects VS Code's file access permissions

### 2. Configuration Storage

- Settings stored in VS Code's configuration system
- Sensitive data not stored in `.miaoda/`
- `.gitignore` prevents accidental commits

### 3. Logging

- All operations logged through ILogService
- Errors logged without exposing sensitive data
- Debug logs available for troubleshooting

## Future Enhancements

### Phase 2: Advanced Features

1. **AI-Powered Suggestions**
   - Analyze code patterns
   - Suggest optimizations
   - Recommend best practices

2. **Smart Compression**
   - Intelligent snapshot creation
   - Incremental backups
   - Automatic cleanup

3. **Timeline Visualization**
   - Interactive project timeline
   - Visual change history
   - One-click restore

4. **Work Analytics**
   - Productivity metrics
   - Time tracking
   - Contribution analysis

### Phase 3: Collaboration

1. **Team Settings**
   - Shared project configuration
   - Team defaults
   - Conflict resolution

2. **Remote Sync**
   - Cloud backup
   - Cross-device sync
   - Collaborative history

## Troubleshooting

### Issue: Service not initializing

**Solution:**
1. Check logs: `View > Output > Miaoda`
2. Verify workspace root is set
3. Check file permissions on `.miaoda/` directory

### Issue: Settings not applying

**Solution:**
1. Verify settings are in correct namespace (`miaoda.*`)
2. Check configuration service is initialized
3. Reload window: `Cmd+Shift+P > Developer: Reload Window`

### Issue: Storage stats incorrect

**Solution:**
1. Run optimization: `Miaoda: Optimize Project`
2. Check `.miaoda/` directory permissions
3. Verify file service is working

## References

- [ZERO_CONFIG_DESIGN.md](./ZERO_CONFIG_DESIGN.md) - Design specification
- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Configuration](https://code.visualstudio.com/docs/getstarted/settings)
