import * as fs from 'fs';
import * as path from 'path';
import type { ProjectConfig, LogEntry } from '../types';

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

/**
 * LogManager - Structured logging with rotation
 */
export class LogManager {
  private config: ProjectConfig;
  private logsDir: string;
  private logStreams: Map<string, string> = new Map();
  private readonly LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

  constructor(config: ProjectConfig) {
    this.config = config;
    this.logsDir = path.join(config.miaodaDir, 'logs');
  }

  /**
   * Initialize the log manager
   */
  async initialize(): Promise<void> {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Log a debug message
   */
  debug(category: string, message: string, metadata?: Record<string, any>): void {
    this.log('debug', category, message, metadata);
  }

  /**
   * Log an info message
   */
  info(category: string, message: string, metadata?: Record<string, any>): void {
    this.log('info', category, message, metadata);
  }

  /**
   * Log a warning message
   */
  warn(category: string, message: string, metadata?: Record<string, any>): void {
    this.log('warn', category, message, metadata);
  }

  /**
   * Log an error message
   */
  error(category: string, message: string, metadata?: Record<string, any>): void {
    this.log('error', category, message, metadata);
  }

  /**
   * Internal log method
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    category: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      metadata,
    };

    // Determine log file
    const logFile = level === 'error' ? 'error.log' : level === 'warn' ? 'dev.log' : 'dev.log';
    this.writeLog(logFile, entry);

    // Also write to console in development
    console.log(`[${level.toUpperCase()}] [${category}] ${message}`, metadata || '');
  }

  /**
   * Write log entry to file
   */
  private writeLog(logFile: string, entry: LogEntry): void {
    const logPath = path.join(this.logsDir, logFile);

    try {
      // Check if rotation is needed
      if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath);
        if (stats.size > MAX_LOG_SIZE) {
          this.rotateLog(logFile);
        }
      }

      // Append log entry
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(logPath, line);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * Rotate log file
   */
  private rotateLog(logFile: string): void {
    const logPath = path.join(this.logsDir, logFile);
    const baseName = logFile.replace('.log', '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = path.join(this.logsDir, `${baseName}-${timestamp}.log`);

    try {
      fs.renameSync(logPath, rotatedPath);

      // Clean up old rotated files
      this.cleanupOldLogs(baseName);
    } catch (error) {
      console.error('Failed to rotate log:', error);
    }
  }

  /**
   * Clean up old log files
   */
  private cleanupOldLogs(baseName: string): void {
    try {
      const files = fs.readdirSync(this.logsDir);
      const logFiles = files
        .filter(f => f.startsWith(baseName) && f.endsWith('.log'))
        .sort()
        .reverse();

      // Keep only MAX_LOG_FILES
      for (let i = MAX_LOG_FILES; i < logFiles.length; i++) {
        const filePath = path.join(this.logsDir, logFiles[i]);
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Read logs
   */
  async readLogs(logFile: string, limit: number = 100): Promise<LogEntry[]> {
    const logPath = path.join(this.logsDir, logFile);

    if (!fs.existsSync(logPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      const entries: LogEntry[] = [];

      for (const line of lines) {
        try {
          entries.push(JSON.parse(line));
        } catch (error) {
          // Skip invalid lines
        }
      }

      return entries.slice(-limit);
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  /**
   * Clear logs older than specified time
   */
  async clearOldLogs(olderThanMs: number): Promise<number> {
    const cutoffTime = Date.now() - olderThanMs;
    let removed = 0;

    try {
      const files = fs.readdirSync(this.logsDir);
      for (const file of files) {
        if (!file.endsWith('.log')) {
          continue;
        }

        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filePath);
          removed++;
        }
      }
    } catch (error) {
      console.error('Failed to clear old logs:', error);
    }

    return removed;
  }

  /**
   * Get logs with filters
   */
  async getLogs(options: {
    category?: string;
    level?: 'debug' | 'info' | 'warn' | 'error';
    limit?: number;
  }): Promise<LogEntry[]> {
    const { category, level, limit = 100 } = options;
    const allLogs: LogEntry[] = [];

    try {
      const files = fs.readdirSync(this.logsDir);
      for (const file of files) {
        if (!file.endsWith('.log')) {
          continue;
        }

        const logs = await this.readLogs(file, 1000);
        allLogs.push(...logs);
      }

      // Filter logs
      let filtered = allLogs;

      if (category) {
        filtered = filtered.filter(log => log.category === category);
      }

      if (level) {
        filtered = filtered.filter(log => log.level === level);
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => b.timestamp - a.timestamp);

      return filtered.slice(0, limit);
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    this.logStreams.clear();
  }
}
