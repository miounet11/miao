/**
 * Project Manager Types and Interfaces
 */

export interface ProjectConfig {
  projectRoot: string;
  miaodaDir: string;
  autoInit: boolean;
  trackChanges: boolean;
  autoCompress: boolean;
  autoCleanup: boolean;
}

export interface FileChange {
  file: string;
  timestamp: number;
  type: 'create' | 'modify' | 'delete' | 'rename';
  diff: {
    added: number;
    removed: number;
    content?: string;
  };
  snapshotId?: string;
}

export interface TimelineEvent {
  timestamp: number;
  type: 'edit' | 'save' | 'commit' | 'ai-chat' | 'command';
  description: string;
  files?: string[];
  metadata?: Record<string, any>;
}

export interface SessionRecord {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  filesModified: number;
  aiConversations: number;
  commandsRun: number;
  summary?: string;
}

export interface StorageStats {
  totalSize: number;
  historySize: number;
  contextSize: number;
  logsSize: number;
  cacheSize: number;
  lastUpdated: number;
}

export interface CompressionOptions {
  targetSize: number;
  keepRecent: number; // milliseconds
  compressionLevel?: number; // 1-9
}

export interface CleanupRules {
  oldSnapshots: number; // milliseconds
  tempFiles: number; // milliseconds
  errorLogs: number; // milliseconds
}

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface ProjectStats {
  totalFiles: number;
  totalChanges: number;
  activeTime: number; // milliseconds
  lastModified: number;
  storageUsed: StorageStats;
}
