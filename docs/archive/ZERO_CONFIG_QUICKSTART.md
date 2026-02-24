# Zero-Config Smart Defaults - Quick Start Guide

## For Users

### First Run

When you open Miaoda IDE for the first time:

1. **Automatic Detection** - The IDE automatically detects:
   - Your system language and theme preference
   - Your project type (Node.js, Python, Java, etc.)
   - Your code style (indentation, quotes, semicolons)
   - Your shell and terminal preferences

2. **Smart Defaults Applied** - All settings are automatically configured:
   - Editor optimized for your project type
   - Theme matches your system preference
   - Terminal configured for your shell
   - Git integration enabled
   - AI features ready to use

3. **No Configuration Needed** - Just start coding!

### Quick Actions

Access one-click operations via Command Palette (`Cmd+Shift+P`):

```
Miaoda: View Today's Work
Miaoda: Optimize Project
Miaoda: Generate Work Report
Miaoda: Reset to Defaults
Miaoda: Advanced Settings
```

### Storage Management

Miaoda automatically:
- Compresses old data when storage exceeds 2GB
- Cleans up temporary files
- Maintains 7 days of uncompressed history
- Notifies you before taking action

### Notifications

You'll see helpful notifications for:
- Storage space warnings
- Performance optimization opportunities
- Feature recommendations
- Setup completion

## For Developers

### Installation

1. **Files Created:**
   ```
   src/vs/miaoda/
   ├── common/
   │   ├── smartDefaults.ts
   │   ├── autoOptimizer.ts
   │   ├── firstRunExperience.ts
   │   ├── smartNotifications.ts
   │   ├── quickActions.ts
   │   ├── projectManager.ts
   │   └── index.ts
   ├── browser/
   │   ├── miaodaService.ts
   │   ├── miaoda.contribution.ts
   │   └── index.ts
   └── test/
       └── smartDefaults.test.ts
   ```

2. **Configuration Updated:**
   - `.vscode/settings.json` - Added smart defaults
   - `product.json` - Already configured for `.miaoda/` directory

### Using the Service

#### Get the Service

```typescript
import { IMiaodaService } from 'vs/miaoda/browser/miaodaService';

// In your class constructor
constructor(@IMiaodaService private miaodaService: IMiaodaService) {}
```

#### Initialize

```typescript
await this.miaodaService.initialize();
```

#### Access Components

```typescript
// Smart Defaults
const smartDefaults = this.miaodaService.getSmartDefaults();
const editorDefaults = smartDefaults.getEditorDefaults();

// Auto Optimizer
const optimizer = this.miaodaService.getAutoOptimizer();
const projectType = await optimizer.detectProjectType();

// First Run Experience
const fre = this.miaodaService.getFirstRunExperience();
const isFirstRun = await fre.isFirstRun();

// Smart Notifications
const notifications = this.miaodaService.getSmartNotifications();
await notifications.showSuccess('Operation completed!');

// Quick Actions
const actions = this.miaodaService.getQuickActions();
const todayWork = await actions.getTodayWork();

// Project Manager
const manager = this.miaodaService.getProjectManager();
const stats = await manager.getStorageStats();
```

### Common Tasks

#### Task 1: Show Today's Work

```typescript
const actions = this.miaodaService.getQuickActions();
const work = await actions.getTodayWork();

this.miaodaService.showNotification(
  `Today: ${work.filesModified} files, +${work.linesAdded} lines`,
  'info'
);
```

#### Task 2: Detect Project Type

```typescript
const optimizer = this.miaodaService.getAutoOptimizer();
const projectType = await optimizer.detectProjectType();

if (projectType === 'nodejs') {
  // Apply Node.js specific settings
}
```

#### Task 3: Check Storage

```typescript
const stats = await this.miaodaService.getStorageStats();
const notifications = this.miaodaService.getSmartNotifications();

await notifications.checkStorage(stats);
```

#### Task 4: Record File Change

```typescript
const manager = this.miaodaService.getProjectManager();

await manager.recordChange('src/app.ts', 'modify', {
  added: 45,
  removed: 12
});
```

#### Task 5: Generate Report

```typescript
const actions = this.miaodaService.getQuickActions();
const report = await actions.generateWorkReport(7);

console.log(report);
```

### Extending the System

#### Add New Smart Default

1. Update `ISmartDefaults` interface in `smartDefaults.ts`
2. Add to `SMART_DEFAULTS` constant
3. Add getter method
4. Update `.vscode/settings.json`

```typescript
// In smartDefaults.ts
export interface ISmartDefaults {
  // ... existing
  myFeature: IMyFeatureDefaults;
}

export interface IMyFeatureDefaults {
  enabled: boolean;
  option1: string;
}

export const SMART_DEFAULTS: ISmartDefaults = {
  // ... existing
  myFeature: {
    enabled: true,
    option1: 'value'
  }
};

getMyFeatureDefaults(): IMyFeatureDefaults {
  const config = this.configService.getValue<any>('miaoda.myFeature') || {};
  return { ...SMART_DEFAULTS.myFeature, ...config };
}
```

#### Add New Detection

1. Add method to `AutoOptimizer` class
2. Call from `detectSystemInfo()` or create new method
3. Use in `FirstRunExperience.applySystemSettings()`

```typescript
// In autoOptimizer.ts
async detectMyFeature(): Promise<IMyFeatureConfig> {
  // Implementation
}
```

#### Add New Notification Type

1. Add method to `SmartNotifications` class
2. Call from appropriate component

```typescript
// In smartNotifications.ts
async suggestMyFeature(data: any): Promise<void> {
  await this.showNotification({
    type: 'tip',
    message: 'Check out this feature!',
    actions: [/* ... */]
  });
}
```

### Testing

#### Run Tests

```bash
npm test -- src/vs/miaoda/test/smartDefaults.test.ts
```

#### Add New Test

```typescript
test('should do something', () => {
  const result = smartDefaults.getSomething();
  assert.strictEqual(result.property, expectedValue);
});
```

### Debugging

#### Enable Debug Logging

```typescript
this.logService.debug('Debug message', data);
```

#### View Logs

1. Open Output panel: `View > Output`
2. Select "Miaoda" from dropdown
3. View real-time logs

#### Check Configuration

```typescript
const config = this.configService.getValue<any>('miaoda');
console.log('Miaoda config:', config);
```

## File Structure Reference

### `.miaoda/` Directory

```
.miaoda/
├── config.json                    # Project configuration
├── .gitignore                     # Auto-generated
├── history/
│   ├── sessions/
│   │   ├── 2026-02-21.json       # Today's session
│   │   └── ...
│   ├── changes/
│   │   ├── 2026-02-21/
│   │   │   ├── 1708521600000.json
│   │   │   └── ...
│   │   └── ...
│   └── snapshots/
│       ├── 2026-02-14.tar.gz
│       └── ...
├── context/
│   ├── index.db                  # Code index
│   ├── embeddings.db             # Semantic vectors
│   └── graph.json                # Dependency graph
├── logs/
│   ├── dev.log                   # Development log
│   ├── ai.log                    # AI interaction log
│   └── error.log                 # Error log
└── cache/
    ├── ast/                      # AST cache
    └── analysis/                 # Analysis cache
```

## Configuration Reference

### Editor Settings

```json
"miaoda.editor.fontSize": 13,
"miaoda.editor.tabSize": 2,
"miaoda.editor.formatOnSave": true,
"miaoda.editor.autoSave": "afterDelay",
"miaoda.editor.minimap": { "enabled": true },
"miaoda.editor.wordWrap": "on",
"miaoda.editor.renderWhitespace": "selection"
```

### Theme Settings

```json
"miaoda.theme.colorTheme": "Miaoda Dark",
"miaoda.theme.autoSwitch": true,
"miaoda.theme.iconTheme": "vs-seti",
"miaoda.theme.preferDarkMode": true
```

### Terminal Settings

```json
"miaoda.terminal.fontSize": 12,
"miaoda.terminal.shell": "auto",
"miaoda.terminal.cursorStyle": "line",
"miaoda.terminal.cursorBlink": true,
"miaoda.terminal.scrollback": 1000
```

### Git Settings

```json
"miaoda.git.enabled": true,
"miaoda.git.autoFetch": true,
"miaoda.git.autoPush": false,
"miaoda.git.confirmSync": true,
"miaoda.git.autoStash": true
```

### AI Settings

```json
"miaoda.ai.enabled": true,
"miaoda.ai.autoContext": true,
"miaoda.ai.semanticSearch": true,
"miaoda.ai.smartSuggestions": true,
"miaoda.ai.codeAnalysis": true
```

### Project Settings

```json
"miaoda.project.autoInit": true,
"miaoda.project.trackChanges": true,
"miaoda.project.autoCompress": true,
"miaoda.project.autoCleanup": true,
"miaoda.project.compressionThreshold": 2147483648,
"miaoda.project.compressionAge": 30
```

## Next Steps

1. **Review Implementation** - Read `ZERO_CONFIG_IMPLEMENTATION.md`
2. **Integrate Service** - Add `IMiaodaService` to your components
3. **Add Commands** - Create VS Code commands for quick actions
4. **Build UI** - Create webview panels for dashboard and settings
5. **Test Thoroughly** - Run tests and manual testing
6. **Deploy** - Package and release

## Support

For issues or questions:
1. Check logs: `View > Output > Miaoda`
2. Review implementation guide
3. Check test cases for usage examples
4. Open an issue on GitHub
