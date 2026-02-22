# Quick Start Guide - Enhanced Storage System

## Installation

The enhanced storage system is already integrated into the `shared-services` package. No additional installation required.

## 5-Minute Setup

### Step 1: Initialize Storage

```typescript
import { getUnifiedStorage, autoMigrate } from 'shared-services';

// In your extension's activate() function
export async function activate(context: vscode.ExtensionContext) {
  // Initialize unified storage
  const storage = getUnifiedStorage(context);
  await storage.initialize();

  // Auto-migrate existing data (if any)
  await autoMigrate(context);

  // Storage is now ready to use!
}
```

### Step 2: Use Enhanced Chat History

```typescript
import { getEnhancedChatHistoryStorage } from 'shared-services';

// Get chat storage instance
const chatStorage = getEnhancedChatHistoryStorage(context);
await chatStorage.initialize();

// Use it exactly like the old ChatHistoryStorage
await chatStorage.saveSession(session);
const sessions = await chatStorage.listSessions();

// Or use advanced features
const results = await chatStorage.searchAdvanced('authentication', {
  useSemanticSearch: true
});
```

### Step 3: Enable Project Context (Optional)

```typescript
import { ProjectContextManager } from 'shared-services';

const contextManager = new ProjectContextManager(storage);

// Analyze current workspace
const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
if (workspaceFolder) {
  await contextManager.analyzeProject(workspaceFolder.uri.fsPath);
}
```

## Common Use Cases

### Use Case 1: Search Chat History

```typescript
// Simple text search
const sessions = await chatStorage.searchSessions('error handling');

// Advanced semantic search
const results = await chatStorage.searchAdvanced('how to fix bugs', {
  useSemanticSearch: true,
  projectPath: workspacePath,
  limit: 10
});
```

### Use Case 2: Get Relevant Context

```typescript
// Get context for current file
const recommendations = await contextManager.getRelevantContext(
  'implement user authentication',
  currentFilePath,
  projectPath
);

// Use recommendations to enhance AI prompts
for (const rec of recommendations) {
  console.log(`${rec.context.content} (relevance: ${rec.relevance})`);
}
```

### Use Case 3: Index Code

```typescript
import { CodeIndexRecord } from 'shared-services';
import { randomUUID } from 'crypto';

// Index a function
const codeIndex: CodeIndexRecord = {
  id: randomUUID(),
  file_path: filePath,
  project_path: projectPath,
  symbol_name: 'myFunction',
  symbol_type: 'function',
  signature: 'function myFunction(arg: string): void',
  doc_comment: 'Does something useful',
  updated_at: Date.now()
};

await storage.saveCodeIndex(codeIndex, true);

// Search indexed code
const results = await storage.searchCodeIndex('useful function', projectPath);
```

### Use Case 4: Session Summaries

```typescript
// Generate summary for a session
const summary = await chatStorage.summarizeSession(sessionId);

console.log('Topics:', summary.topics);
console.log('Key Decisions:', summary.keyDecisions);
console.log('Code Changes:', summary.codeChanges);
console.log('Next Steps:', summary.nextSteps);
```

## Migration from Old Storage

### Automatic Migration

The system automatically detects and migrates old JSON-based chat history:

```typescript
import { autoMigrate } from 'shared-services';

// This runs automatically on first initialization
const result = await autoMigrate(context);

if (result) {
  console.log(`Migrated ${result.migratedSessions} sessions in ${result.duration}ms`);
}
```

### Manual Migration

For more control:

```typescript
import { DataMigration } from 'shared-services';

const migration = new DataMigration(context);

// Check if migration is needed
const status = await migration.getMigrationStatus();

if (status.needsMigration) {
  // Dry run first
  const dryRunResult = await migration.migrateChatHistory({ dryRun: true });
  console.log('Dry run:', dryRunResult);

  // Actual migration
  const result = await migration.migrateChatHistory({
    backupBeforeMigration: true,
    deleteOldData: false
  });
}
```

## Configuration

### Minimal Configuration

```typescript
const storage = getUnifiedStorage(context);
await storage.initialize();
```

### Full Configuration

```typescript
import { UnifiedStorage } from 'shared-services';

const storage = new UnifiedStorage(context, {
  enableSemanticSearch: true,  // Enable AI-powered search
  enableCache: true,           // Enable LRU caching
  cacheSize: 200,             // Cache up to 200 items
  autoSave: true              // Auto-save every 5 seconds
});

await storage.initialize();
```

## Performance Tips

1. **Use caching** - Enabled by default, keeps frequently accessed data in memory
2. **Batch operations** - Use transactions for multiple writes
3. **Lazy embeddings** - Only generate embeddings when semantic search is needed
4. **Limit results** - Use appropriate limits for search queries

```typescript
// Good: Limited search
const results = await storage.searchCodeIndex('function', projectPath, true);

// Better: Use transactions for batch operations
await storage.transaction(async () => {
  for (const item of items) {
    await storage.saveCodeIndex(item);
  }
});
```

## Troubleshooting

### Issue: Semantic search not working

**Solution**: Check if semantic search is available:

```typescript
if (!storage.isSemanticSearchAvailable()) {
  console.log('Semantic search not available, using text search');
}
```

### Issue: Migration fails

**Solution**: Use dry-run mode first:

```typescript
const result = await migration.migrateChatHistory({ dryRun: true });
if (result.errors.length > 0) {
  console.error('Migration would fail:', result.errors);
}
```

### Issue: Performance slow

**Solution**: Disable semantic search for simple queries:

```typescript
// Fast text search
const results = await storage.searchChatHistory(query, projectPath, false);

// Slower semantic search (use when needed)
const semanticResults = await storage.searchChatHistory(query, projectPath, true);
```

## Next Steps

1. Read the [full documentation](./STORAGE_SYSTEM.md)
2. Check out the [API reference](./index.ts)
3. See [example implementations](./examples/)
4. Review the [migration guide](./MIGRATION.md)

## Support

For issues or questions:
1. Check the [troubleshooting section](./STORAGE_SYSTEM.md#troubleshooting)
2. Review existing code in `__tests__/` directory
3. Open an issue in the repository
