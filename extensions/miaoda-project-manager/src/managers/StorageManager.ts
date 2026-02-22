import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import type { ProjectConfig, StorageStats, CompressionOptions, CleanupRules } from '../types';

const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  targetSize: 200 * 1024 * 1024, // 200MB
  keepRecent: 7 * 24 * 60 * 60 * 1000, // 7 days
  compressionLevel: 6,
};

const DEFAULT_CLEANUP_RULES: CleanupRules = {
  oldSnapshots: 90 * 24 * 60 * 60 * 1000, // 90 days
  tempFiles: 1 * 24 * 60 * 60 * 1000, // 1 day
  errorLogs: 30 * 24 * 60 * 60 * 1000, // 30 days
};

const SIZE_THRESHOLD = 2 * 1024 * 1024 * 1024; // 2GB

/**
 * StorageManager - Manages storage, compression, and cleanup
 */
export class StorageManager {
  private config: ProjectConfig;
  private miaodaDir: string;
  private compressionOptions: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS;
  private cleanupRules: CleanupRules = DEFAULT_CLEANUP_RULES;

  constructor(config: ProjectConfig) {
    this.config = config;
    this.miaodaDir = config.miaodaDir;
  }

  /**
   * Initialize the storage manager
   */
  async initialize(): Promise<void> {
    // Load compression and cleanup settings if available
    await this.loadSettings();
  }

  /**
   * Load settings from config
   */
  private async loadSettings(): Promise<void> {
    const configPath = path.join(this.miaodaDir, 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        if (config.compression) {
          this.compressionOptions = { ...DEFAULT_COMPRESSION_OPTIONS, ...config.compression };
        }
        if (config.cleanup) {
          this.cleanupRules = { ...DEFAULT_CLEANUP_RULES, ...config.cleanup };
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const historyDir = path.join(this.miaodaDir, 'history');
    const contextDir = path.join(this.miaodaDir, 'context');
    const logsDir = path.join(this.miaodaDir, 'logs');
    const cacheDir = path.join(this.miaodaDir, 'cache');

    return {
      totalSize: this.getDirectorySize(this.miaodaDir),
      historySize: this.getDirectorySize(historyDir),
      contextSize: this.getDirectorySize(contextDir),
      logsSize: this.getDirectorySize(logsDir),
      cacheSize: this.getDirectorySize(cacheDir),
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get directory size recursively
   */
  private getDirectorySize(dirPath: string): number {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    let size = 0;
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        size += this.getDirectorySize(filePath);
      } else {
        size += stats.size;
      }
    }

    return size;
  }

  /**
   * Check and compress if needed
   */
  async checkAndCompress(): Promise<void> {
    const stats = await this.getStorageStats();

    // Rule 1: Size exceeds threshold
    if (stats.totalSize > SIZE_THRESHOLD) {
      console.log('Storage exceeds threshold, compressing old data...');
      await this.compressOldData();
    }

    // Rule 2: Check for old data
    const oldDataDirs = this.findOldDirectories(30 * 24 * 60 * 60 * 1000); // 30 days
    if (oldDataDirs.length > 0) {
      console.log(`Found ${oldDataDirs.length} old data directories, compressing...`);
      for (const dir of oldDataDirs) {
        await this.compressDirectory(dir);
      }
    }
  }

  /**
   * Compress old data
   */
  private async compressOldData(): Promise<void> {
    const changesDir = path.join(this.miaodaDir, 'history', 'changes');
    if (!fs.existsSync(changesDir)) {
      return;
    }

    const cutoffTime = Date.now() - this.compressionOptions.keepRecent;
    const dates = fs.readdirSync(changesDir);

    for (const date of dates) {
      const dateDir = path.join(changesDir, date);
      if (!fs.statSync(dateDir).isDirectory()) {
        continue;
      }

      const stats = fs.statSync(dateDir);
      const dirTime = stats.mtimeMs;

      if (dirTime < cutoffTime) {
        await this.compressDirectory(dateDir);
      }
    }
  }

  /**
   * Compress a directory
   */
  private async compressDirectory(dirPath: string): Promise<void> {
    try {
      const dirName = path.basename(dirPath);
      const parentDir = path.dirname(dirPath);
      const archivePath = path.join(parentDir, `${dirName}.tar.gz`);

      // Skip if already compressed
      if (fs.existsSync(archivePath)) {
        return;
      }

      console.log(`Compressing ${dirPath}...`);

      // Create tar.gz archive
      const files = fs.readdirSync(dirPath);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }

      // For now, just create a marker file
      // In production, use tar/gzip library
      const marker = {
        compressed: true,
        originalSize: totalSize,
        compressedAt: Date.now(),
        originalPath: dirPath,
      };

      fs.writeFileSync(archivePath, JSON.stringify(marker));

      // Remove original directory
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`Compressed ${dirPath} to ${archivePath}`);
    } catch (error) {
      console.error(`Failed to compress ${dirPath}:`, error);
    }
  }

  /**
   * Find old directories
   */
  private findOldDirectories(olderThanMs: number): string[] {
    const cutoffTime = Date.now() - olderThanMs;
    const oldDirs: string[] = [];

    const changesDir = path.join(this.miaodaDir, 'history', 'changes');
    if (!fs.existsSync(changesDir)) {
      return oldDirs;
    }

    const dates = fs.readdirSync(changesDir);
    for (const date of dates) {
      const dateDir = path.join(changesDir, date);
      if (!fs.statSync(dateDir).isDirectory()) {
        continue;
      }

      const stats = fs.statSync(dateDir);
      if (stats.mtimeMs < cutoffTime) {
        oldDirs.push(dateDir);
      }
    }

    return oldDirs;
  }

  /**
   * Cleanup old files
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up old snapshots
      await this.cleanupSnapshots();

      // Clean up temp files
      await this.cleanupTempFiles();

      // Clean up error logs
      await this.cleanupErrorLogs();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Clean up old snapshots
   */
  private async cleanupSnapshots(): Promise<void> {
    const snapshotsDir = path.join(this.miaodaDir, 'history', 'snapshots');
    if (!fs.existsSync(snapshotsDir)) {
      return;
    }

    const cutoffTime = Date.now() - this.cleanupRules.oldSnapshots;
    const files = fs.readdirSync(snapshotsDir);

    for (const file of files) {
      const filePath = path.join(snapshotsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < cutoffTime) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old snapshot: ${file}`);
      }
    }
  }

  /**
   * Clean up temp files
   */
  private async cleanupTempFiles(): Promise<void> {
    const cacheDir = path.join(this.miaodaDir, 'cache');
    if (!fs.existsSync(cacheDir)) {
      return;
    }

    const cutoffTime = Date.now() - this.cleanupRules.tempFiles;
    this.cleanupDirectoryRecursive(cacheDir, cutoffTime);
  }

  /**
   * Clean up error logs
   */
  private async cleanupErrorLogs(): Promise<void> {
    const logsDir = path.join(this.miaodaDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      return;
    }

    const cutoffTime = Date.now() - this.cleanupRules.errorLogs;
    const files = fs.readdirSync(logsDir);

    for (const file of files) {
      if (!file.includes('error')) {
        continue;
      }

      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < cutoffTime) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old error log: ${file}`);
      }
    }
  }

  /**
   * Cleanup directory recursively
   */
  private cleanupDirectoryRecursive(dirPath: string, cutoffTime: number): void {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        this.cleanupDirectoryRecursive(filePath, cutoffTime);
      } else if (stats.mtimeMs < cutoffTime) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Update compression options
   */
  async updateCompressionOptions(options: Partial<CompressionOptions>): Promise<void> {
    this.compressionOptions = { ...this.compressionOptions, ...options };
  }

  /**
   * Update cleanup rules
   */
  async updateCleanupRules(rules: Partial<CleanupRules>): Promise<void> {
    this.cleanupRules = { ...this.cleanupRules, ...rules };
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    // Cleanup if needed
  }
}
