import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from './storageService';

/**
 * Cleanup configuration
 */
export interface CleanupConfig {
  oldSnapshotsAge: number; // milliseconds (default: 90 days)
  tempFilesAge: number; // milliseconds (default: 1 day)
  errorLogsAge: number; // milliseconds (default: 30 days)
  enableAutoCleanup: boolean; // default: true
  cleanupInterval: number; // milliseconds (default: 1 hour)
}

/**
 * Cleanup report
 */
export interface CleanupReport {
  success: boolean;
  snapshotsDeleted: number;
  tempFilesDeleted: number;
  errorLogsDeleted: number;
  totalSpaceFreed: number;
  duration: number; // milliseconds
  error?: string;
}

/**
 * Cleanup manager for automatic cleanup tasks
 */
export class CleanupManager {
  private config: CleanupConfig;
  private miaodaDir: string;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(miaodaDir: string, config?: Partial<CleanupConfig>) {
    this.miaodaDir = miaodaDir;

    // Default configuration
    this.config = {
      oldSnapshotsAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      tempFilesAge: 1 * 24 * 60 * 60 * 1000, // 1 day
      errorLogsAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      enableAutoCleanup: true,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      ...config,
    };
  }

  /**
   * Start automatic cleanup
   */
  startAutoCleanup(): void {
    if (!this.config.enableAutoCleanup) {
      return;
    }

    // Run cleanup immediately
    this.runCleanup().catch((err) => {
      console.error('Cleanup failed:', err);
    });

    // Schedule periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.runCleanup().catch((err) => {
        console.error('Scheduled cleanup failed:', err);
      });
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Run cleanup tasks
   */
  async runCleanup(): Promise<CleanupReport> {
    const startTime = Date.now();

    try {
      let snapshotsDeleted = 0;
      let tempFilesDeleted = 0;
      let errorLogsDeleted = 0;
      let totalSpaceFreed = 0;

      // Clean old snapshots
      const snapshotResult = await this.cleanOldSnapshots();
      snapshotsDeleted = snapshotResult.deleted;
      totalSpaceFreed += snapshotResult.spaceFreed;

      // Clean temp files
      const tempResult = await this.cleanTempFiles();
      tempFilesDeleted = tempResult.deleted;
      totalSpaceFreed += tempResult.spaceFreed;

      // Clean error logs
      const errorResult = await this.cleanErrorLogs();
      errorLogsDeleted = errorResult.deleted;
      totalSpaceFreed += errorResult.spaceFreed;

      return {
        success: true,
        snapshotsDeleted,
        tempFilesDeleted,
        errorLogsDeleted,
        totalSpaceFreed,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        snapshotsDeleted: 0,
        tempFilesDeleted: 0,
        errorLogsDeleted: 0,
        totalSpaceFreed: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean old snapshots
   */
  private async cleanOldSnapshots(): Promise<{
    deleted: number;
    spaceFreed: number;
  }> {
    const snapshotsDir = path.join(this.miaodaDir, 'history', 'snapshots');

    if (!fs.existsSync(snapshotsDir)) {
      return { deleted: 0, spaceFreed: 0 };
    }

    const cutoffTime = Date.now() - this.config.oldSnapshotsAge;
    let deleted = 0;
    let spaceFreed = 0;

    const files = fs.readdirSync(snapshotsDir);

    for (const file of files) {
      if (file === '.metadata.json') continue;

      const filePath = path.join(snapshotsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < cutoffTime) {
        try {
          spaceFreed += stats.size;
          fs.unlinkSync(filePath);
          deleted++;
        } catch (err) {
          console.error(`Failed to delete snapshot ${file}:`, err);
        }
      }
    }

    // Clean up metadata for deleted snapshots
    if (deleted > 0) {
      this.cleanupSnapshotMetadata();
    }

    return { deleted, spaceFreed };
  }

  /**
   * Clean temp files
   */
  private async cleanTempFiles(): Promise<{
    deleted: number;
    spaceFreed: number;
  }> {
    const tempDir = path.join(this.miaodaDir, 'temp');

    if (!fs.existsSync(tempDir)) {
      return { deleted: 0, spaceFreed: 0 };
    }

    const cutoffTime = Date.now() - this.config.tempFilesAge;
    let deleted = 0;
    let spaceFreed = 0;

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const stats = fs.statSync(fullPath);

        if (stats.mtimeMs < cutoffTime) {
          try {
            if (entry.isDirectory()) {
              this.removeDirectory(fullPath);
            } else {
              spaceFreed += stats.size;
              fs.unlinkSync(fullPath);
            }
            deleted++;
          } catch (err) {
            console.error(`Failed to delete temp file ${fullPath}:`, err);
          }
        } else if (entry.isDirectory()) {
          walk(fullPath);
        }
      }
    };

    walk(tempDir);
    return { deleted, spaceFreed };
  }

  /**
   * Clean error logs
   */
  private async cleanErrorLogs(): Promise<{
    deleted: number;
    spaceFreed: number;
  }> {
    const logsDir = path.join(this.miaodaDir, 'logs');

    if (!fs.existsSync(logsDir)) {
      return { deleted: 0, spaceFreed: 0 };
    }

    const cutoffTime = Date.now() - this.config.errorLogsAge;
    let deleted = 0;
    let spaceFreed = 0;

    const files = fs.readdirSync(logsDir);

    for (const file of files) {
      // Only clean error logs
      if (!file.includes('error')) continue;

      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < cutoffTime) {
        try {
          spaceFreed += stats.size;
          fs.unlinkSync(filePath);
          deleted++;
        } catch (err) {
          console.error(`Failed to delete error log ${file}:`, err);
        }
      }
    }

    return { deleted, spaceFreed };
  }

  /**
   * Clean up snapshot metadata
   */
  private cleanupSnapshotMetadata(): void {
    const metadataFile = path.join(
      this.miaodaDir,
      'history',
      'snapshots',
      '.metadata.json'
    );

    if (!fs.existsSync(metadataFile)) {
      return;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
      const snapshotsDir = path.join(this.miaodaDir, 'history', 'snapshots');

      // Filter out metadata for non-existent snapshots
      const validMetadata = metadata.filter((m: any) => {
        const snapshotPath = path.join(snapshotsDir, `${m.id}.tar.gz`);
        return fs.existsSync(snapshotPath);
      });

      fs.writeFileSync(metadataFile, JSON.stringify(validMetadata, null, 2));
    } catch (err) {
      console.error('Failed to cleanup snapshot metadata:', err);
    }
  }

  /**
   * Remove directory recursively
   */
  private removeDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        this.removeDirectory(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }

    fs.rmdirSync(dirPath);
  }

  /**
   * Update cleanup config
   */
  updateConfig(config: Partial<CleanupConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart cleanup if interval changed
    if (config.cleanupInterval) {
      this.stopAutoCleanup();
      this.startAutoCleanup();
    }
  }

  /**
   * Get current config
   */
  getConfig(): CleanupConfig {
    return { ...this.config };
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    oldSnapshotsCount: number;
    oldSnapshotsSize: number;
    tempFilesCount: number;
    tempFilesSize: number;
    errorLogsCount: number;
    errorLogsSize: number;
  }> {
    const snapshotsDir = path.join(this.miaodaDir, 'history', 'snapshots');
    const tempDir = path.join(this.miaodaDir, 'temp');
    const logsDir = path.join(this.miaodaDir, 'logs');

    const cutoffSnapshots = Date.now() - this.config.oldSnapshotsAge;
    const cutoffTemp = Date.now() - this.config.tempFilesAge;
    const cutoffLogs = Date.now() - this.config.errorLogsAge;

    let oldSnapshotsCount = 0;
    let oldSnapshotsSize = 0;
    let tempFilesCount = 0;
    let tempFilesSize = 0;
    let errorLogsCount = 0;
    let errorLogsSize = 0;

    // Count old snapshots
    if (fs.existsSync(snapshotsDir)) {
      const files = fs.readdirSync(snapshotsDir);
      for (const file of files) {
        if (file === '.metadata.json') continue;
        const filePath = path.join(snapshotsDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < cutoffSnapshots) {
          oldSnapshotsCount++;
          oldSnapshotsSize += stats.size;
        }
      }
    }

    // Count temp files
    if (fs.existsSync(tempDir)) {
      const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const stats = fs.statSync(fullPath);
          if (stats.mtimeMs < cutoffTemp) {
            tempFilesCount++;
            tempFilesSize += stats.size;
          } else if (entry.isDirectory()) {
            walk(fullPath);
          }
        }
      };
      walk(tempDir);
    }

    // Count error logs
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      for (const file of files) {
        if (!file.includes('error')) continue;
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < cutoffLogs) {
          errorLogsCount++;
          errorLogsSize += stats.size;
        }
      }
    }

    return {
      oldSnapshotsCount,
      oldSnapshotsSize,
      tempFilesCount,
      tempFilesSize,
      errorLogsCount,
      errorLogsSize,
    };
  }
}
