import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Storage statistics interface
 */
export interface StorageStats {
  totalSize: number;
  fileCount: number;
  directoryCount: number;
  oldestFile: number;
  newestFile: number;
  compressionRate?: number;
}

/**
 * Storage monitoring service
 */
export class StorageService {
  /**
   * Get storage statistics for a directory
   */
  static async getStorageStats(dirPath: string): Promise<StorageStats> {
    if (!fs.existsSync(dirPath)) {
      return {
        totalSize: 0,
        fileCount: 0,
        directoryCount: 0,
        oldestFile: Date.now(),
        newestFile: 0,
      };
    }

    let totalSize = 0;
    let fileCount = 0;
    let directoryCount = 0;
    let oldestFile = Date.now();
    let newestFile = 0;

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          directoryCount++;
          walk(fullPath);
        } else if (entry.isFile()) {
          fileCount++;
          const stats = fs.statSync(fullPath);
          totalSize += stats.size;
          oldestFile = Math.min(oldestFile, stats.mtimeMs);
          newestFile = Math.max(newestFile, stats.mtimeMs);
        }
      }
    };

    walk(dirPath);

    return {
      totalSize,
      fileCount,
      directoryCount,
      oldestFile: oldestFile === Date.now() ? 0 : oldestFile,
      newestFile,
    };
  }

  /**
   * Format bytes to human readable format
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get directory size recursively
   */
  static async getDirectorySize(dirPath: string): Promise<number> {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    let size = 0;

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          size += stats.size;
        }
      }
    };

    walk(dirPath);
    return size;
  }

  /**
   * Get files older than specified days
   */
  static async getOldFiles(
    dirPath: string,
    days: number
  ): Promise<Array<{ path: string; mtime: number; size: number }>> {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const oldFiles: Array<{ path: string; mtime: number; size: number }> = [];
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          if (stats.mtimeMs < cutoffTime) {
            oldFiles.push({
              path: fullPath,
              mtime: stats.mtimeMs,
              size: stats.size,
            });
          }
        }
      }
    };

    walk(dirPath);
    return oldFiles;
  }

  /**
   * Get large files (for smart compression)
   */
  static async getLargeFiles(
    dirPath: string,
    minSize: number
  ): Promise<Array<{ path: string; size: number }>> {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const largeFiles: Array<{ path: string; size: number }> = [];

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          if (stats.size >= minSize) {
            largeFiles.push({
              path: fullPath,
              size: stats.size,
            });
          }
        }
      }
    };

    walk(dirPath);

    // Sort by size descending
    return largeFiles.sort((a, b) => b.size - a.size);
  }

  /**
   * Get files by date range
   */
  static async getFilesByDateRange(
    dirPath: string,
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const files: string[] = [];
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          if (stats.mtimeMs >= startTime && stats.mtimeMs <= endTime) {
            files.push(fullPath);
          }
        }
      }
    };

    walk(dirPath);
    return files;
  }

  /**
   * Calculate compression ratio
   */
  static calculateCompressionRatio(
    originalSize: number,
    compressedSize: number
  ): number {
    if (originalSize === 0) return 0;
    return ((1 - compressedSize / originalSize) * 100);
  }

  /**
   * Predict storage trend
   */
  static predictStorageTrend(
    historicalData: Array<{ timestamp: number; size: number }>
  ): {
    trend: 'increasing' | 'decreasing' | 'stable';
    growthRate: number;
    estimatedFullDate?: Date;
  } {
    if (historicalData.length < 2) {
      return { trend: 'stable', growthRate: 0 };
    }

    // Calculate growth rate (bytes per day)
    const timeSpan =
      (historicalData[historicalData.length - 1].timestamp -
        historicalData[0].timestamp) /
      (24 * 60 * 60 * 1000);
    const sizeChange =
      historicalData[historicalData.length - 1].size - historicalData[0].size;
    const growthRate = sizeChange / timeSpan;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (growthRate > 10 * 1024 * 1024) {
      // > 10MB per day
      trend = 'increasing';
    } else if (growthRate < -10 * 1024 * 1024) {
      trend = 'decreasing';
    }

    // Estimate when storage will be full (2GB)
    const maxSize = 2 * 1024 * 1024 * 1024;
    const currentSize = historicalData[historicalData.length - 1].size;
    let estimatedFullDate: Date | undefined;

    if (growthRate > 0 && currentSize < maxSize) {
      const daysUntilFull = (maxSize - currentSize) / growthRate;
      estimatedFullDate = new Date(
        Date.now() + daysUntilFull * 24 * 60 * 60 * 1000
      );
    }

    return {
      trend,
      growthRate,
      estimatedFullDate,
    };
  }
}
