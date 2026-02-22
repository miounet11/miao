/**
 * SQLite Storage Implementation
 * Provides persistent storage with full-text search and transaction support
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import {
  SCHEMA_SQL,
  DATABASE_VERSION,
  ProjectContext,
  ChatHistoryRecord,
  ChatSessionRecord,
  CodeIndexRecord,
  KnowledgeGraphRecord,
  EmbeddingRecord,
  SearchResult
} from './DatabaseSchema';

export class SQLiteStorage {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private dbPath: string;
  private saveTimer: NodeJS.Timeout | null = null;
  private isDirty = false;

  constructor(private context: vscode.ExtensionContext) {
    const storageDir = path.join(context.globalStorageUri.fsPath, 'database');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.dbPath = path.join(storageDir, 'miaoda.db');
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    try {
      // Initialize SQL.js
      this.SQL = await initSqlJs({
        locateFile: (file: string) => {
          // Use the wasm file from node_modules
          return path.join(__dirname, '../../node_modules/sql.js/dist', file);
        }
      });

      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(buffer);
        await this.migrate();
      } else {
        this.db = new this.SQL.Database();
        await this.createSchema();
      }

      // Setup auto-save
      this.setupAutoSave();
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      // Fallback: create in-memory database
      if (this.SQL) {
        this.db = new this.SQL.Database();
        await this.createSchema();
      }
    }
  }

  /**
   * Create database schema
   */
  private async createSchema(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.exec(SCHEMA_SQL);
      this.markDirty();
    } catch (error) {
      console.error('Failed to create schema:', error);
      throw error;
    }
  }

  /**
   * Migrate database schema
   */
  private async migrate(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const result = this.db.exec('SELECT value FROM metadata WHERE key = "schema_version"');
      const currentVersion = result.length > 0 ? parseInt(result[0].values[0][0] as string) : 0;

      if (currentVersion < DATABASE_VERSION) {
        // Run migrations
        console.log(`Migrating database from version ${currentVersion} to ${DATABASE_VERSION}`);
        // Add migration logic here as schema evolves
        this.db.exec(`UPDATE metadata SET value = '${DATABASE_VERSION}', updated_at = ${Date.now()} WHERE key = 'schema_version'`);
        this.markDirty();
      }
    } catch (error) {
      console.error('Migration failed:', error);
      // If migration fails, recreate schema
      await this.createSchema();
    }
  }

  /**
   * Setup auto-save mechanism
   */
  private setupAutoSave(): void {
    // Save every 5 seconds if dirty
    setInterval(() => {
      if (this.isDirty) {
        this.save();
      }
    }, 5000);

    // Save on extension deactivation
    this.context.subscriptions.push({
      dispose: () => {
        this.save();
      }
    });
  }

  /**
   * Mark database as dirty (needs saving)
   */
  private markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Save database to disk
   */
  save(): void {
    if (!this.db || !this.isDirty) {
      return;
    }

    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, data);
      this.isDirty = false;
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  /**
   * Execute a query
   */
  private exec(sql: string, params?: any[]): any[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);
      if (params) {
        stmt.bind(params);
      }

      const results: any[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();

      return results;
    } catch (error) {
      console.error('Query execution failed:', sql, error);
      throw error;
    }
  }

  /**
   * Execute a write query
   */
  private run(sql: string, params?: any[]): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.run(sql, params);
      this.markDirty();
    } catch (error) {
      console.error('Write query failed:', sql, error);
      throw error;
    }
  }

  // ==================== Project Context Operations ====================

  async saveProjectContext(context: ProjectContext): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO project_context
      (id, project_path, context_type, content, metadata, embedding_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    this.run(sql, [
      context.id,
      context.project_path,
      context.context_type,
      context.content,
      context.metadata ? JSON.stringify(context.metadata) : null,
      context.embedding_id || null,
      context.created_at,
      context.updated_at
    ]);
  }

  async getProjectContext(id: string): Promise<ProjectContext | null> {
    const results = this.exec('SELECT * FROM project_context WHERE id = ?', [id]);
    if (results.length === 0) {
      return null;
    }
    return this.parseProjectContext(results[0]);
  }

  async listProjectContexts(projectPath: string, contextType?: string): Promise<ProjectContext[]> {
    let sql = 'SELECT * FROM project_context WHERE project_path = ?';
    const params: any[] = [projectPath];

    if (contextType) {
      sql += ' AND context_type = ?';
      params.push(contextType);
    }

    sql += ' ORDER BY updated_at DESC';

    const results = this.exec(sql, params);
    return results.map(r => this.parseProjectContext(r));
  }

  private parseProjectContext(row: any): ProjectContext {
    return {
      id: row.id,
      project_path: row.project_path,
      context_type: row.context_type,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      embedding_id: row.embedding_id || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  // ==================== Chat History Operations ====================

  async saveChatMessage(message: ChatHistoryRecord): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO chat_history
      (id, session_id, project_path, role, content, tokens, model, metadata, embedding_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    this.run(sql, [
      message.id,
      message.session_id,
      message.project_path || null,
      message.role,
      message.content,
      message.tokens || null,
      message.model || null,
      message.metadata ? JSON.stringify(message.metadata) : null,
      message.embedding_id || null,
      message.created_at
    ]);
  }

  async getChatMessages(sessionId: string): Promise<ChatHistoryRecord[]> {
    const results = this.exec(
      'SELECT * FROM chat_history WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );
    return results.map(r => this.parseChatMessage(r));
  }

  async saveChatSession(session: ChatSessionRecord): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO chat_sessions
      (id, title, project_path, created_at, updated_at, message_count, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    this.run(sql, [
      session.id,
      session.title,
      session.project_path || null,
      session.created_at,
      session.updated_at,
      session.message_count,
      session.summary || null
    ]);
  }

  async getChatSession(sessionId: string): Promise<ChatSessionRecord | null> {
    const results = this.exec('SELECT * FROM chat_sessions WHERE id = ?', [sessionId]);
    if (results.length === 0) {
      return null;
    }
    return this.parseChatSession(results[0]);
  }

  async listChatSessions(projectPath?: string): Promise<ChatSessionRecord[]> {
    let sql = 'SELECT * FROM chat_sessions';
    const params: any[] = [];

    if (projectPath) {
      sql += ' WHERE project_path = ?';
      params.push(projectPath);
    }

    sql += ' ORDER BY updated_at DESC';

    const results = this.exec(sql, params);
    return results.map(r => this.parseChatSession(r));
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    this.run('DELETE FROM chat_history WHERE session_id = ?', [sessionId]);
    this.run('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);
  }

  async searchChatHistory(query: string, projectPath?: string): Promise<SearchResult<ChatHistoryRecord>[]> {
    // Use FTS5 for full-text search
    let sql = `
      SELECT h.*, rank
      FROM chat_history h
      JOIN chat_fts ON chat_fts.rowid = h.rowid
      WHERE chat_fts MATCH ?
    `;
    const params: any[] = [query];

    if (projectPath) {
      sql += ' AND h.project_path = ?';
      params.push(projectPath);
    }

    sql += ' ORDER BY rank LIMIT 50';

    const results = this.exec(sql, params);
    return results.map(r => ({
      item: this.parseChatMessage(r),
      score: -r.rank // FTS5 rank is negative, lower is better
    }));
  }

  private parseChatMessage(row: any): ChatHistoryRecord {
    return {
      id: row.id,
      session_id: row.session_id,
      project_path: row.project_path || undefined,
      role: row.role,
      content: row.content,
      tokens: row.tokens || undefined,
      model: row.model || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      embedding_id: row.embedding_id || undefined,
      created_at: row.created_at
    };
  }

  private parseChatSession(row: any): ChatSessionRecord {
    return {
      id: row.id,
      title: row.title,
      project_path: row.project_path || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      message_count: row.message_count,
      summary: row.summary || undefined
    };
  }

  // ==================== Code Index Operations ====================

  async saveCodeIndex(code: CodeIndexRecord): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO code_index
      (id, file_path, project_path, symbol_name, symbol_type, line_start, line_end,
       signature, doc_comment, references, embedding_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    this.run(sql, [
      code.id,
      code.file_path,
      code.project_path,
      code.symbol_name,
      code.symbol_type,
      code.line_start || null,
      code.line_end || null,
      code.signature || null,
      code.doc_comment || null,
      code.references ? JSON.stringify(code.references) : null,
      code.embedding_id || null,
      code.updated_at
    ]);
  }

  async searchCodeIndex(query: string, projectPath?: string): Promise<SearchResult<CodeIndexRecord>[]> {
    let sql = `
      SELECT c.*, rank
      FROM code_index c
      JOIN code_fts ON code_fts.rowid = c.rowid
      WHERE code_fts MATCH ?
    `;
    const params: any[] = [query];

    if (projectPath) {
      sql += ' AND c.project_path = ?';
      params.push(projectPath);
    }

    sql += ' ORDER BY rank LIMIT 50';

    const results = this.exec(sql, params);
    return results.map(r => ({
      item: this.parseCodeIndex(r),
      score: -r.rank
    }));
  }

  private parseCodeIndex(row: any): CodeIndexRecord {
    return {
      id: row.id,
      file_path: row.file_path,
      project_path: row.project_path,
      symbol_name: row.symbol_name,
      symbol_type: row.symbol_type,
      line_start: row.line_start || undefined,
      line_end: row.line_end || undefined,
      signature: row.signature || undefined,
      doc_comment: row.doc_comment || undefined,
      references: row.references ? JSON.parse(row.references) : undefined,
      embedding_id: row.embedding_id || undefined,
      updated_at: row.updated_at
    };
  }

  // ==================== Knowledge Graph Operations ====================

  async saveKnowledgeGraphEdge(edge: KnowledgeGraphRecord): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO knowledge_graph
      (id, project_path, entity_type, entity_id, relation_type, target_id, weight, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    this.run(sql, [
      edge.id,
      edge.project_path,
      edge.entity_type,
      edge.entity_id,
      edge.relation_type,
      edge.target_id,
      edge.weight,
      edge.metadata ? JSON.stringify(edge.metadata) : null,
      edge.created_at
    ]);
  }

  async getKnowledgeGraphEdges(entityId: string, projectPath?: string): Promise<KnowledgeGraphRecord[]> {
    let sql = 'SELECT * FROM knowledge_graph WHERE entity_id = ?';
    const params: any[] = [entityId];

    if (projectPath) {
      sql += ' AND project_path = ?';
      params.push(projectPath);
    }

    const results = this.exec(sql, params);
    return results.map(r => this.parseKnowledgeGraph(r));
  }

  private parseKnowledgeGraph(row: any): KnowledgeGraphRecord {
    return {
      id: row.id,
      project_path: row.project_path,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      relation_type: row.relation_type,
      target_id: row.target_id,
      weight: row.weight,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: row.created_at
    };
  }

  // ==================== Embeddings Operations ====================

  async saveEmbedding(embedding: EmbeddingRecord): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO embeddings
      (id, source_type, source_id, vector, dimension, model, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    // Serialize Float32Array to Buffer
    const buffer = Buffer.from(embedding.vector.buffer);
    this.run(sql, [
      embedding.id,
      embedding.source_type,
      embedding.source_id,
      buffer,
      embedding.dimension,
      embedding.model,
      embedding.created_at
    ]);
  }

  async getEmbedding(id: string): Promise<EmbeddingRecord | null> {
    const results = this.exec('SELECT * FROM embeddings WHERE id = ?', [id]);
    if (results.length === 0) {
      return null;
    }
    return this.parseEmbedding(results[0]);
  }

  async getEmbeddingsBySource(sourceId: string): Promise<EmbeddingRecord[]> {
    const results = this.exec('SELECT * FROM embeddings WHERE source_id = ?', [sourceId]);
    return results.map(r => this.parseEmbedding(r));
  }

  private parseEmbedding(row: any): EmbeddingRecord {
    // Deserialize Buffer to Float32Array
    const buffer = row.vector as Uint8Array;
    const vector = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);

    return {
      id: row.id,
      source_type: row.source_type,
      source_id: row.source_id,
      vector,
      dimension: row.dimension,
      model: row.model,
      created_at: row.created_at
    };
  }

  // ==================== Utility Methods ====================

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.run('BEGIN TRANSACTION');
      const result = await callback();
      this.db.run('COMMIT');
      this.markDirty();
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Close the database
   */
  close(): void {
    this.save();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
