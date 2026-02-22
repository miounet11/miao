import * as fs from 'fs';
import * as path from 'path';
import { StorageService, StorageStats } from './storageService';
import { CompressionManager, CompressionConfig, CompressionReport } from './compressionManager';
import { CleanupManager, CleanupConfig, CleanupReport } from './cleanupManager';
import { StorageMonitor, StorageMonitorReport } from './storageMonitor';

/**
 * Storage manager configuration
 */
export interface StorageManagerConfig {
  compression?: Partial<CompressionConfig>;
  cleanup?: Partial<CleanupConfig>;
  monitorInterval?: number;
}

/**
 * Storage operation result
 */
export interface StorageOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Main storage manager orchestrating compression, cleanup, and monitoring
 */
export class StorageManager {
  private miaodaDir: string;
  private compressionManager: CompressionManager;
  private cleanupManager: CleanupManager;
  private storageMonitor: StorageMonitor;
  private isInitialized: boolean = false;

  constructor(miaodaDir: string, config?: StorageManagerConfig) {
    this.miaodaDir = miaodaDir;
    this.ensureMiaodaDir();

    // Initialize managers
    this.compressionManager = new CompressionManager(
      miaodaDir,
      config?.compression
    );
    this.cleanupManager = new CleanupManager(miaodaDir, config?.cleanup);
    this.storageMonitor = new StorageMonitor(
      miaodaDir,
      this.compressionManager,
      this.cleanupManager
    );

    if (config?.monitorInterval) {
      this.storageMonitor.setMonitorInterval(config.monitorInterval);
    }
  }

  /**
   * Initialize storage manager
   */
  async initialize(): Promise<StorageOperationResult> {
    try {
      this.ensureMiaodaDir();
      this.isInitialized = true;

      return {
        success: true,
        message: 'Storage manager initialized successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to initialize storage manager',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Start all background tasks
   */
  async start(): Promise<StorageOperationResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Start cleanup
      this.cleanupManager.startAutoCleanup();

      // Start monitoring
      this.storageMonitor.startMonitoring();

      return {
        success: true,
        message: 'Storage manager started successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to start storage manager',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Stop all background tasks
   */
  async stop(): Promise<StorageOperationResult> {
    try {
      this.cleanupManager.stopAutoCleanup();
      this.storageMonitor.stopMonitoring();

      return {
        success: true,
        message: 'Storage manager stopped successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to stop storage manager',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current storage statistics
   */
  async getStorageStats(): Promise<StorageOperationResult> {
    try {
      const stats = await StorageService.getStorageStats(this.miaodaDir);

      return {
        success: true,
        message: 'Storage statistics retrieved',
        data: {
          ...stats,
          totalSizeFormatted: StorageService.formatBytes(stats.totalSize),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get storage statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get storage monitor report
   */
  async getMonitorReport(): Promise<StorageOperationResult> {
    try {
      const report = await this.storageMonitor.getReport();

      return {
        success: true,
        message: 'Storage monitor report retrieved',
        data: report,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get monitor report',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Manually trigger compression
   */
  async compress(options?: { dryRun?: boolean }): Promise<StorageOperationResult> {
    try {
      const shouldCompress = await this.compressionManager.shouldCompress(
        this.miaodaDir
      );

      if (!shouldCompress && !options?.dryRun) {
        return {
          success: true,
          message: 'Compression not needed at this time',
          data: {
            compressed: false,
            reason: 'Storage size and age are within acceptable limits',
          },
        };
      }

      const report = await this.compressionManager.compressOldData(
        this.miaodaDir,
        options
      );

      if (!report.success) {
        return {
          success: false,
          message: 'Compression failed',
          error: report.error,
        };
      }

      return {
        success: true,
        message: 'Compression completed successfully',
        data: {
          ...report,
          originalSizeFormatted: StorageService.formatBytes(report.originalSize),
          compressedSizeFormatted: StorageService.formatBytes(
            report.compressedSize
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Compression operation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Manually trigger cleanup
   */
  async cleanup(): Promise<StorageOperationResult> {
    try {
      const report = await this.cleanupManager.runCleanup();

      if (!report.success) {
        return {
          success: false,
          message: 'Cleanup failed',
          error: report.error,
        };
      }

      return {
        success: true,
        message: 'Cleanup completed successfully',
        data: {
          ...report,
          totalSpaceFreedFormatted: StorageService.formatBytes(
            report.totalSpaceFreed
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Cleanup operation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<StorageOperationResult> {
    try {
      const stats = await this.cleanupManager.getCleanupStats();

      return {
        success: true,
        message: 'Cleanup statistics retrieved',
        data: {
          ...stats,
          oldSnapshotsSizeFormatted: StorageService.formatBytes(
            stats.oldSnapshotsSize
          ),
          tempFilesSizeFormatted: StorageService.formatBytes(stats.tempFilesSize),
          errorLogsSizeFormatted: StorageService.formatBytes(
            stats.errorLogsSize
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get cleanup statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all snapshots
   */
  async getSnapshots(): Promise<StorageOperationResult> {
    try {
      const snapshots = await this.compressionManager.getSnapshots();

      return {
        success: true,
        message: 'Snapshots retrieved',
        data: snapshots.map((s) => ({
          ...s,
          originalSizeFormatted: StorageService.formatBytes(s.originalSize),
          compressedSizeFormatted: StorageService.formatBytes(
            s.compressedSize
          ),
          createdAtFormatted: new Date(s.createdAt).toLocaleString(),
        })),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get snapshots',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract snapshot
   */
  async extractSnapshot(
    snapshotId: string,
    targetDir: string
  ): Promise<StorageOperationResult> {
    try {
      const success = await this.compressionManager.extractSnapshot(
        snapshotId,
        targetDir
      );

      if (!success) {
        return {
          success: false,
          message: 'Failed to extract snapshot',
        };
      }

      return {
        success: true,
        message: 'Snapshot extracted successfully',
        data: { snapshotId, targetDir },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Snapshot extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<StorageOperationResult> {
    try {
      const success = await this.compressionManager.deleteSnapshot(snapshotId);

      if (!success) {
        return {
          success: false,
          message: 'Snapshot not found or already deleted',
        };
      }

      return {
        success: true,
        message: 'Snapshot deleted successfully',
        data: { snapshotId },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Snapshot deletion failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify snapshot integrity
   */
  async verifySnapshot(snapshotId: string): Promise<StorageOperationResult> {
    try {
      const isValid = await this.compressionManager.verifySnapshot(snapshotId);

      return {
        success: true,
        message: isValid ? 'Snapshot is valid' : 'Snapshot is corrupted',
        data: { snapshotId, isValid },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Snapshot verification failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get storage historical data
   */
  getHistoricalData(): StorageOperationResult {
    try {
      const data = this.storageMonitor.getHistoricalData();

      return {
        success: true,
        message: 'Historical data retrieved',
        data: data.map((d) => ({
          timestamp: d.timestamp,
          timestampFormatted: new Date(d.timestamp).toLocaleString(),
          size: d.size,
          sizeFormatted: StorageService.formatBytes(d.size),
        })),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get historical data',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: StorageManagerConfig): StorageOperationResult {
    try {
      if (config.compression) {
        this.compressionManager.updateConfig(config.compression);
      }

      if (config.cleanup) {
        this.cleanupManager.updateConfig(config.cleanup);
      }

      if (config.monitorInterval) {
        this.storageMonitor.setMonitorInterval(config.monitorInterval);
      }

      return {
        success: true,
        message: 'Configuration updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageOperationResult {
    try {
      return {
        success: true,
        message: 'Configuration retrieved',
        data: {
          compression: this.compressionManager.getConfig(),
          cleanup: this.cleanupManager.getConfig(),
          monitorInterval: this.storageMonitor.getMonitorInterval(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ensure .miaoda directory structure
   */
  private ensureMiaodaDir(): void {
    const dirs = [
      this.miaodaDir,
      path.join(this.miaodaDir, 'history'),
      path.join(this.miaodaDir, 'history', 'sessions'),
      path.join(this.miaodaDir, 'history', 'changes'),
      path.join(this.miaodaDir, 'history', 'snapshots'),
      path.join(this.miaodaDir, 'context'),
      path.join(this.miaodaDir, 'logs'),
      path.join(this.miaodaDir, 'cache'),
      path.join(this.miaodaDir, 'cache', 'ast'),
      path.join(this.miaodaDir, 'cache', 'analysis'),
      path.join(this.miaodaDir, 'temp'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Get manager instances (for advanced usage)
   */
  getManagers() {
    return {
      compression: this.compressionManager,
      cleanup: this.cleanupManager,
      monitor: this.storageMonitor,
    };
  }
}
