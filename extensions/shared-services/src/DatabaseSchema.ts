/**
 * Database Schema for Enhanced Persistent Storage
 * Three-layer architecture: SQLite + Vector Search + File Index
 */

export const DATABASE_VERSION = 1;

/**
 * SQL schema for all tables
 */
export const SCHEMA_SQL = `
-- Project Context Table
CREATE TABLE IF NOT EXISTS project_context (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  context_type TEXT NOT NULL, -- 'file' | 'symbol' | 'dependency' | 'config'
  content TEXT NOT NULL,
  metadata TEXT, -- JSON string
  embedding_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_context_path ON project_context(project_path);
CREATE INDEX IF NOT EXISTS idx_project_context_type ON project_context(context_type);
CREATE INDEX IF NOT EXISTS idx_project_context_updated ON project_context(updated_at);

-- Enhanced Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_path TEXT,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  tokens INTEGER,
  model TEXT,
  metadata TEXT, -- JSON string
  embedding_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_project ON chat_history(project_path);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_history(created_at);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  project_path TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  message_count INTEGER DEFAULT 0,
  summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_updated ON chat_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_session_project ON chat_sessions(project_path);

-- Code Index Table
CREATE TABLE IF NOT EXISTS code_index (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  project_path TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  symbol_type TEXT NOT NULL, -- 'function' | 'class' | 'variable' | 'interface' | 'type'
  line_start INTEGER,
  line_end INTEGER,
  signature TEXT,
  doc_comment TEXT,
  references TEXT, -- JSON array of reference locations
  embedding_id TEXT,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_code_file ON code_index(file_path);
CREATE INDEX IF NOT EXISTS idx_code_project ON code_index(project_path);
CREATE INDEX IF NOT EXISTS idx_code_symbol ON code_index(symbol_name);
CREATE INDEX IF NOT EXISTS idx_code_type ON code_index(symbol_type);

-- Knowledge Graph Table
CREATE TABLE IF NOT EXISTS knowledge_graph (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'file' | 'function' | 'class' | 'module' | 'concept'
  entity_id TEXT NOT NULL,
  relation_type TEXT NOT NULL, -- 'imports' | 'calls' | 'extends' | 'implements' | 'uses' | 'related'
  target_id TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  metadata TEXT, -- JSON string
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kg_project ON knowledge_graph(project_path);
CREATE INDEX IF NOT EXISTS idx_kg_entity ON knowledge_graph(entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_target ON knowledge_graph(target_id);
CREATE INDEX IF NOT EXISTS idx_kg_relation ON knowledge_graph(relation_type);

-- Embeddings Table (Vector Storage)
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL, -- 'code' | 'chat' | 'doc' | 'context'
  source_id TEXT NOT NULL,
  vector BLOB NOT NULL, -- Float32Array serialized
  dimension INTEGER NOT NULL,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_embedding_source ON embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_embedding_type ON embeddings(source_type);

-- Full-Text Search Virtual Tables
CREATE VIRTUAL TABLE IF NOT EXISTS chat_fts USING fts5(
  content,
  content_rowid=id,
  tokenize='porter unicode61'
);

CREATE VIRTUAL TABLE IF NOT EXISTS code_fts USING fts5(
  symbol_name,
  doc_comment,
  signature,
  content_rowid=id,
  tokenize='porter unicode61'
);

-- Metadata Table
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Insert initial metadata
INSERT OR REPLACE INTO metadata (key, value, updated_at)
VALUES ('schema_version', '${DATABASE_VERSION}', ${Date.now()});
`;

/**
 * Database interfaces
 */
export interface ProjectContext {
  id: string;
  project_path: string;
  context_type: 'file' | 'symbol' | 'dependency' | 'config';
  content: string;
  metadata?: Record<string, any>;
  embedding_id?: string;
  created_at: number;
  updated_at: number;
}

export interface ChatHistoryRecord {
  id: string;
  session_id: string;
  project_path?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens?: number;
  model?: string;
  metadata?: Record<string, any>;
  embedding_id?: string;
  created_at: number;
}

export interface ChatSessionRecord {
  id: string;
  title: string;
  project_path?: string;
  created_at: number;
  updated_at: number;
  message_count: number;
  summary?: string;
}

export interface CodeIndexRecord {
  id: string;
  file_path: string;
  project_path: string;
  symbol_name: string;
  symbol_type: 'function' | 'class' | 'variable' | 'interface' | 'type';
  line_start?: number;
  line_end?: number;
  signature?: string;
  doc_comment?: string;
  references?: Array<{ file: string; line: number }>;
  embedding_id?: string;
  updated_at: number;
}

export interface KnowledgeGraphRecord {
  id: string;
  project_path: string;
  entity_type: 'file' | 'function' | 'class' | 'module' | 'concept';
  entity_id: string;
  relation_type: 'imports' | 'calls' | 'extends' | 'implements' | 'uses' | 'related';
  target_id: string;
  weight: number;
  metadata?: Record<string, any>;
  created_at: number;
}

export interface EmbeddingRecord {
  id: string;
  source_type: 'code' | 'chat' | 'doc' | 'context';
  source_id: string;
  vector: Float32Array;
  dimension: number;
  model: string;
  created_at: number;
}

/**
 * Search result interfaces
 */
export interface SearchResult<T> {
  item: T;
  score: number;
  highlights?: string[];
}

export interface SemanticSearchResult<T> extends SearchResult<T> {
  similarity: number;
}
