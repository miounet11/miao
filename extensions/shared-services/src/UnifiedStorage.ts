/**
 * Unified Storage Interface
 * Provides a single API that routes to appropriate storage layers
 * Implements intelligent caching and data synchronization
 */

import * as vscode from 'vscode';
import { SQLiteStorage } from './SQLiteStorage';
import { SemanticSearch } from './SemanticSearch';
import {
  ProjectContext,
  ChatHistoryRecord,
  ChatSessionRecord,
  CodeIndexRecord,
  KnowledgeGraphRecord,
  SearchResult,
  SemanticSearchResult
} from './DatabaseSchema';

export interface UnifiedStorageConfig {
  enableSemanticSearch?: boolean;
  enableCache?: boolean;
  cacheSize?: number;
  autoSave?: boolean;
}

/**
 * LRU Cache implementation
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to end
    this.cache.set(key, value);

    // Evict oldest if over size
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value as K;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: K): void {
    this.cache.delete(key);
  }
}

/**
 * Unified Storage - Single interface for all storage operations
 */
export class UnifiedStorage {
  private sqliteStorage: SQLiteStorage;
  private semanticSearch: SemanticSearch | null = null;
  private config: Required<UnifiedStorageConfig>;

  // Caches
  private sessionCache: LRUCache<string, ChatSessionRecord>;
  private contextCache: LRUCache<string, ProjectContext>;
  private codeCache: LRUCache<string, CodeIndexRecord>;

  constructor(
    private context: vscode.ExtensionContext,
    config: UnifiedStorageConfig = {}
  ) {
    this.config = {
      enableSemanticSearch: config.enableSemanticSearch ?? true,
      enableCache: config.enableCache ?? true,
      cacheSize: config.cacheSize ?? 100,
      autoSave: config.autoSave ?? true
    };

    // Initialize storage layers
    this.sqliteStorage = new SQLiteStorage(context);

    // Initialize caches
    this.sessionCache = new LRUCache(this.config.cacheSize);
    this.contextCache = new LRUCache(this.config.cacheSize);
    this.codeCache = new LRUCache(this.config.cacheSize);
  }

  /**
   * Initialize all storage layers
   */
  async initialize(): Promise<void> {
    await this.sqliteStorage.initialize();

    if (this.config.enableSemanticSearch) {
      try {
        this.semanticSearch = new SemanticSearch(this.sqliteStorage);
        await this.semanticSearch.initialize();
      } catch (error) {
        console.error('Failed to initialize semantic search:', error);
        // Continue without semantic search
        this.semanticSearch = null;
      }
    }
  }

  // ==================== Project Context Operations ====================

  async saveProjectContext(context: ProjectContext, generateEmbedding = true): Promise<void> {
    await this.sqliteStorage.saveProjectContext(context);

    // Update cache
    if (this.config.enableCache) {
      this.contextCache.set(context.id, context);
    }

    // Generate embedding if enabled
    if (generateEmbedding && this.semanticSearch && !context.embedding_id) {
      try {
        const embeddingId = await this.semanticSearch.saveEmbedding(
          'context',
          context.id,
          context.content
        );
        context.embedding_id = embeddingId;
        await this.sqliteStorage.saveProjectContext(context);
      } catch (error) {
        console.error('Failed to generate embedding for context:', error);
      }
    }
  }

  async getProjectContext(id: string): Promise<ProjectContext | null> {
    // Check cache first
    if (this.config.enableCache && this.contextCache.has(id)) {
      return this.contextCache.get(id) || null;
    }

    // Fetch from storage
    const context = await this.sqliteStorage.getProjectContext(id);
    if (context && this.config.enableCache) {
      this.contextCache.set(id, context);
    }

    return context;
  }

  async listProjectContexts(projectPath: string, contextType?: string): Promise<ProjectContext[]> {
    return this.sqliteStorage.listProjectContexts(projectPath, contextType);
  }

  async searchProjectContext(
    query: string,
    projectPath?: string,
    useSemanticSearch = true
  ): Promise<SearchResult<ProjectContext>[]> {
    if (useSemanticSearch && this.semanticSearch) {
      try {
        return await this.semanticSearch.findRelatedContext(query, projectPath);
      } catch (error) {
        console.error('Semantic search failed, falling back to text search:', error);
      }
    }

    // Fallback to text search
    const contexts = await this.listProjectContexts(projectPath || '');
    const lowerQuery = query.toLowerCase();
    return contexts
      .filter(ctx => ctx.content.toLowerCase().includes(lowerQuery))
      .map(ctx => ({ item: ctx, score: 1.0 }));
  }

  // ==================== Chat History Operations ====================

  async saveChatMessage(message: ChatHistoryRecord, generateEmbedding = false): Promise<void> {
    await this.sqliteStorage.saveChatMessage(message);

    // Generate embedding if enabled and requested
    if (generateEmbedding && this.semanticSearch && !message.embedding_id) {
      try {
        const embeddingId = await this.semanticSearch.saveEmbedding(
          'chat',
          message.id,
          message.content
        );
        message.embedding_id = embeddingId;
        await this.sqliteStorage.saveChatMessage(message);
      } catch (error) {
        console.error('Failed to generate embedding for chat message:', error);
      }
    }
  }

  async getChatMessages(sessionId: string): Promise<ChatHistoryRecord[]> {
    return this.sqliteStorage.getChatMessages(sessionId);
  }

  async saveChatSession(session: ChatSessionRecord): Promise<void> {
    await this.sqliteStorage.saveChatSession(session);

    // Update cache
    if (this.config.enableCache) {
      this.sessionCache.set(session.id, session);
    }
  }

  async getChatSession(sessionId: string): Promise<ChatSessionRecord | null> {
    // Check cache first
    if (this.config.enableCache && this.sessionCache.has(sessionId)) {
      return this.sessionCache.get(sessionId) || null;
    }

    // Fetch from storage
    const session = await this.sqliteStorage.getChatSession(sessionId);
    if (session && this.config.enableCache) {
      this.sessionCache.set(sessionId, session);
    }

    return session;
  }

  async listChatSessions(projectPath?: string): Promise<ChatSessionRecord[]> {
    return this.sqliteStorage.listChatSessions(projectPath);
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    await this.sqliteStorage.deleteChatSession(sessionId);

    // Clear from cache
    if (this.config.enableCache) {
      this.sessionCache.delete(sessionId);
    }
  }

  async searchChatHistory(
    query: string,
    projectPath?: string,
    useSemanticSearch = false
  ): Promise<SearchResult<ChatHistoryRecord>[]> {
    if (useSemanticSearch && this.semanticSearch) {
      try {
        return await this.semanticSearch.searchSimilarChats(query, projectPath);
      } catch (error) {
        console.error('Semantic search failed, falling back to FTS:', error);
      }
    }

    // Use full-text search
    return this.sqliteStorage.searchChatHistory(query, projectPath);
  }

  // ==================== Code Index Operations ====================

  async saveCodeIndex(code: CodeIndexRecord, generateEmbedding = true): Promise<void> {
    await this.sqliteStorage.saveCodeIndex(code);

    // Update cache
    if (this.config.enableCache) {
      this.codeCache.set(code.id, code);
    }

    // Generate embedding if enabled
    if (generateEmbedding && this.semanticSearch && !code.embedding_id) {
      try {
        // Combine symbol name, signature, and doc comment for embedding
        const text = [
          code.symbol_name,
          code.signature || '',
          code.doc_comment || ''
        ].filter(Boolean).join(' ');

        const embeddingId = await this.semanticSearch.saveEmbedding(
          'code',
          code.id,
          text
        );
        code.embedding_id = embeddingId;
        await this.sqliteStorage.saveCodeIndex(code);
      } catch (error) {
        console.error('Failed to generate embedding for code:', error);
      }
    }
  }

  async searchCodeIndex(
    query: string,
    projectPath?: string,
    useSemanticSearch = true
  ): Promise<SearchResult<CodeIndexRecord>[]> {
    if (useSemanticSearch && this.semanticSearch) {
      try {
        return await this.semanticSearch.searchSimilarCode(query, projectPath);
      } catch (error) {
        console.error('Semantic search failed, falling back to FTS:', error);
      }
    }

    // Use full-text search
    return this.sqliteStorage.searchCodeIndex(query, projectPath);
  }

  // ==================== Knowledge Graph Operations ====================

  async saveKnowledgeGraphEdge(edge: KnowledgeGraphRecord): Promise<void> {
    await this.sqliteStorage.saveKnowledgeGraphEdge(edge);
  }

  async getKnowledgeGraphEdges(
    entityId: string,
    projectPath?: string
  ): Promise<KnowledgeGraphRecord[]> {
    return this.sqliteStorage.getKnowledgeGraphEdges(entityId, projectPath);
  }

  // ==================== Utility Methods ====================

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return this.sqliteStorage.transaction(callback);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.sessionCache.clear();
    this.contextCache.clear();
    this.codeCache.clear();
  }

  /**
   * Save all pending changes
   */
  save(): void {
    this.sqliteStorage.save();
  }

  /**
   * Get semantic search instance
   */
  getSemanticSearch(): SemanticSearch | null {
    return this.semanticSearch;
  }

  /**
   * Check if semantic search is available
   */
  isSemanticSearchAvailable(): boolean {
    return this.semanticSearch !== null;
  }

  /**
   * Close storage and cleanup
   */
  close(): void {
    this.save();
    this.sqliteStorage.close();
    this.clearCache();
  }
}

/**
 * Singleton instance
 */
let storageInstance: UnifiedStorage | undefined;

export function getUnifiedStorage(
  context: vscode.ExtensionContext,
  config?: UnifiedStorageConfig
): UnifiedStorage {
  if (!storageInstance) {
    storageInstance = new UnifiedStorage(context, config);
  }
  return storageInstance;
}

export function resetUnifiedStorage(): void {
  if (storageInstance) {
    storageInstance.close();
  }
  storageInstance = undefined;
}
