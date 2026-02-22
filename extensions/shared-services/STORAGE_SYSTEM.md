# Enhanced Persistent Storage System

## Overview

The Enhanced Persistent Storage System provides a three-layer architecture for Miaoda IDE:

1. **SQLite Layer** - Structured data storage with full-text search
2. **Semantic Search Layer** - Vector embeddings and similarity search using Transformers.js
3. **Unified Storage API** - Single interface with intelligent routing and caching

## Architecture

```
┌─────────────────────────────────────────────┐
│           Miaoda IDE Application            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      UnifiedStorage (Unified API)           │
│  - Auto-routing                             │
│  - Intelligent caching (LRU)                │
│  - Data synchronization                     │
└─────────────────────────────────────────────┘
         ↓              ↓              ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  SQLite      │ │  Semantic    │ │  Project     │
│  Storage     │ │  Search      │ │  Context     │
│              │ │              │ │  Manager     │
│  - FTS5      │ │  - Embeddings│ │  - Analysis  │
│  - Indexes   │ │  - Similarity│ │  - Dep Graph │
│  - ACID      │ │  - Local AI  │ │  - Context   │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Components

### 1. DatabaseSchema.ts

Defines the database schema with the following tables:

- **project_context** - Project-level context and metadata
- **chat_history** - Individual chat messages with embeddings
- **chat_sessions** - Chat session metadata and summaries
- **code_index** - Code symbols, signatures, and documentation
- **knowledge_graph** - Relationships between code entities
- **embeddings** - Vector embeddings for semantic search
- **chat_fts** - Full-text search index for chat messages
- **code_fts** - Full-text search index for code

### 2. SQLiteStorage.ts

Core SQLite database implementation:

- Uses `sql.js` (pure JavaScript, no native compilation)
- Auto-save mechanism (every 5 seconds)
- Transaction support
- Full-text search with FTS5
- JSON fallback for compatibility

**Key Features:**
- Zero native dependencies
- ACID transactions
- Automatic schema migration
- Persistent storage to disk

### 3. SemanticSearch.ts

Semantic search using Transformers.js:

- Model: `Xenova/all-MiniLM-L6-v2` (lightweight, 384 dimensions)
- Local execution (no API calls)
- Cosine similarity search
- Batch embedding generation

**Key Features:**
- Runs entirely in Node.js
- No external API dependencies
- ~50MB model size
- Fast inference (~100ms per embedding)

### 4. UnifiedStorage.ts

Unified API with intelligent routing:

- LRU caching for frequently accessed data
- Automatic embedding generation
- Seamless fallback between search methods
- Transaction support

**Key Features:**
- Single API for all storage operations
- Automatic cache management
- Configurable semantic search
- Performance optimized

### 5. ProjectContextManager.ts

Project analysis and context management:

- File scanning and indexing
- Symbol extraction (functions, classes, interfaces)
- Dependency graph construction
- Intelligent context recommendations

**Key Features:**
- Automatic project analysis
- Import/dependency tracking
- Context-aware recommendations
- Incremental updates

### 6. EnhancedChatHistoryStorage.ts

Backward-compatible chat history storage:

- Implements original `IChatHistoryStorage` interface
- SQLite backend with semantic search
- Session summarization
- Time-decay weighting
- Export to Markdown

**Key Features:**
- Drop-in replacement for `ChatHistoryStorage`
- Advanced search capabilities
- Automatic session summaries
- Similar conversation discovery

### 7. DataMigration.ts

Migration utility for existing data:

- Automatic migration from JSON to SQLite
- Backup before migration
- Verification after migration
- Rollback capability

**Key Features:**
- Safe migration with backups
- Dry-run mode
- Verification checks
- Automatic cleanup

## Usage

### Basic Setup

```typescript
import { UnifiedStorage, getUnifiedStorage } from 'shared-services';

// Initialize storage
const storage = getUnifiedStorage(context, {
  enableSemanticSearch: true,
  enableCache: true,
  cacheSize: 100
});

await storage.initialize();
```

### Chat History

```typescript
import { EnhancedChatHistoryStorage } from 'shared-services';

const chatStorage = new EnhancedChatHistoryStorage(context, storage);
await chatStorage.initialize();

// Save session (backward compatible)
await chatStorage.saveSession(session);

// Advanced search with semantic similarity
const results = await chatStorage.searchAdvanced('how to implement authentication', {
  useSemanticSearch: true,
  limit: 10,
  timeDecay: true
});

// Generate session summary
const summary = await chatStorage.summarizeSession(sessionId);
```

### Project Context

```typescript
import { ProjectContextManager } from 'shared-services';

const contextManager = new ProjectContextManager(storage);

// Analyze project
await contextManager.analyzeProject('/path/to/project', {
  includeNodeModules: false,
  maxFiles: 1000
});

// Get relevant context
const recommendations = await contextManager.getRelevantContext(
  'authentication implementation',
  currentFile,
  projectPath
);
```

### Semantic Search

```typescript
const semanticSearch = storage.getSemanticSearch();

if (semanticSearch) {
  // Search similar code
  const results = await semanticSearch.searchSimilarCode(
    'user authentication function',
    projectPath
  );

  // Calculate similarity
  const similarity = await semanticSearch.calculateSimilarity(
    'login function',
    'authentication handler'
  );
}
```

### Code Indexing

```typescript
import { CodeIndexRecord } from 'shared-services';

const codeIndex: CodeIndexRecord = {
  id: randomUUID(),
  file_path: '/src/auth.ts',
  project_path: projectPath,
  symbol_name: 'authenticate',
  symbol_type: 'function',
  line_start: 10,
  line_end: 25,
  signature: 'async function authenticate(user: User): Promise<Token>',
  doc_comment: 'Authenticates a user and returns a JWT token',
  updated_at: Date.now()
};

await storage.saveCodeIndex(codeIndex, true); // true = generate embedding

// Search code
const results = await storage.searchCodeIndex(
  'authentication',
  projectPath,
  true // use semantic search
);
```

## Migration

### Automatic Migration

```typescript
import { autoMigrate } from 'shared-services';

// In extension activation
const result = await autoMigrate(context, {
  backupBeforeMigration: true,
  deleteOldData: false
});

if (result) {
  console.log(`Migrated ${result.migratedSessions} sessions`);
}
```

### Manual Migration

```typescript
import { DataMigration } from 'shared-services';

const migration = new DataMigration(context);

// Check status
const status = await migration.getMigrationStatus();

if (status.needsMigration) {
  // Perform migration
  const result = await migration.migrateChatHistory({
    backupBeforeMigration: true,
    deleteOldData: false,
    dryRun: false
  });
}

// Rollback if needed
if (result.errors.length > 0) {
  await migration.rollbackMigration();
}
```

## Performance

### Expected Performance Metrics

| Operation | Target | Typical |
|-----------|--------|----------|
| Full-text search | < 100ms | ~50ms |
| Semantic search | < 500ms | ~200ms |
| Context load | < 200ms | ~100ms |
| Project analysis | < 30s | ~10s |
| Embedding generation | < 200ms | ~100ms |
| Database save | < 50ms | ~20ms |

### Optimization Tips

1. **Enable Caching**: Set `enableCache: true` for frequently accessed data
2. **Batch Operations**: Use transactions for multiple writes
3. **Lazy Loading**: Only generate embeddings when needed
4. **Incremental Analysis**: Update only changed files
5. **Limit Results**: Use appropriate limits for search queries

## Configuration

### UnifiedStorage Options

```typescript
interface UnifiedStorageConfig {
  enableSemanticSearch?: boolean; // Default: true
  enableCache?: boolean;          // Default: true
  cacheSize?: number;             // Default: 100
  autoSave?: boolean;             // Default: true
}
```

### Project Analysis Options

```typescript
interface ProjectAnalysisOptions {
  includeNodeModules?: boolean;   // Default: false
  maxFiles?: number;              // Default: 1000
  filePatterns?: string[];        // Default: ['**/*.ts', '**/*.js', ...]
  excludePatterns?: string[];     // Default: ['**/node_modules/**', ...]
}
```

## Database Schema

### Tables

#### project_context
```sql
CREATE TABLE project_context (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  context_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  embedding_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

#### chat_history
```sql
CREATE TABLE chat_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_path TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER,
  model TEXT,
  metadata TEXT,
  embedding_id TEXT,
  created_at INTEGER NOT NULL
);
```

#### code_index
```sql
CREATE TABLE code_index (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  project_path TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  symbol_type TEXT NOT NULL,
  line_start INTEGER,
  line_end INTEGER,
  signature TEXT,
  doc_comment TEXT,
  references TEXT,
  embedding_id TEXT,
  updated_at INTEGER NOT NULL
);
```

## Troubleshooting

### Common Issues

1. **Database not initializing**
   - Check storage directory permissions
   - Verify sql.js installation
   - Check for disk space

2. **Semantic search not working**
   - Verify @xenova/transformers installation
   - Check network for first-time model download
   - Ensure sufficient memory (~500MB)

3. **Migration fails**
   - Check backup directory permissions
   - Verify old data format
   - Use dry-run mode first

4. **Performance issues**
   - Enable caching
   - Reduce search limits
   - Disable semantic search for simple queries
   - Use incremental project analysis

### Debug Mode

```typescript
// Enable verbose logging
console.log('Storage initialized:', storage);
console.log('Semantic search available:', storage.isSemanticSearchAvailable());

// Check database status
const stats = await contextManager.getProjectStats(projectPath);
console.log('Project stats:', stats);
```

## Future Enhancements

### Planned Features

1. **Vector Database Integration** (Optional)
   - Chroma or Qdrant for large-scale deployments
   - Automatic fallback to SQLite for small projects

2. **Advanced AST Parsing**
   - TypeScript Compiler API integration
   - Better symbol extraction
   - Type information indexing

3. **Knowledge Graph Visualization**
   - Interactive dependency graphs
   - Code relationship explorer
   - Impact analysis

4. **Cloud Sync** (Optional)
   - Sync chat history across devices
   - Team knowledge sharing
   - Privacy-preserving encryption

5. **Incremental Updates**
   - File watcher integration
   - Real-time index updates
   - Efficient re-analysis

## API Reference

See individual component files for detailed API documentation:

- [DatabaseSchema.ts](./DatabaseSchema.ts) - Schema definitions
- [SQLiteStorage.ts](./SQLiteStorage.ts) - Database operations
- [SemanticSearch.ts](./SemanticSearch.ts) - Semantic search API
- [UnifiedStorage.ts](./UnifiedStorage.ts) - Unified storage API
- [ProjectContextManager.ts](./ProjectContextManager.ts) - Project analysis
- [EnhancedChatHistoryStorage.ts](./EnhancedChatHistoryStorage.ts) - Chat storage
- [DataMigration.ts](./DataMigration.ts) - Migration utilities

## License

Same as Miaoda IDE
