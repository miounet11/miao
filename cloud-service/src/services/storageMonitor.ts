import * as fs from 'fs';
import * as path from 'path';
import { StorageService, StorageStats } from './storageService';
import { CompressionManager } from './compressionManager';
import { CleanupManager } from './cleanupManager';

/**
 * Storage monitoring alert
 */
export interface StorageAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: number;
  suggestedAction?: string;
}

/**
 * Storage monitor report
 */
export interface StorageMonitorReport {
  timestamp: number;
  stats: StorageStats;
  alerts: StorageAlert[];
  trend: {
    trend: 'increasing' | 'decreasing' | 'stable';
    growthRate: number;
    estimatedFullDate?: Date;
  };
  recommendations: string[];
}

/**
 * Real-time storage monitoring
 */
export class StorageMonitor {
  private miaodaDir: string;
  private compressionManager: CompressionManager;
  private cleanupManager: CleanupManager;
  private historicalData: Array<{ timestamp: number; size: number }> = [];
  private monitorTimer?: NodeJS.Timeout;
  private monitorInterval: number = 60 * 60 * 1000; // 1 hour
  private maxHistorySize: number = 30; // Keep 30 data points

  constructor(
    miaodaDir: string,
    compressionManager: CompressionManager,
    cleanupManager: CleanupManager
  ) {
    this.miaodaDir = miaodaDir;
    this.compressionManager = compressionManager;
    this.cleanupManager = cleanupManager;
    this.loadHistoricalData();
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    // Run initial check
    this.checkStorage().catch((err) => {
      console.error('Storage check failed:', err);
    });

    // Schedule periodic checks
    this.monitorTimer = setInterval(() => {
      this.checkStorage().catch((err) => {
        console.error('Scheduled storage check failed:', err);
      });
    }, this.monitorInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = undefined;
    }
  }

  /**
   * Check storage and generate report
   */
  async checkStorage(): Promise<StorageMonitorReport> {
    const timestamp = Date.now();

    try {
      // Get current stats
      const stats = await StorageService.getStorageStats(this.miaodaDir);

      // Add to historical data
      this.historicalData.push({ timestamp, size: stats.totalSize });
      if (this.historicalData.length > this.maxHistorySize) {
        this.historicalData.shift();
      }
      this.saveHistoricalData();

      // Generate alerts
      const alerts = this.generateAlerts(stats);

      // Calculate trend
      const trend = StorageService.predictStorageTrend(this.historicalData);

      // Generate recommendations
      const recommendations = this.generateRecommendations(stats, alerts, trend);

      return {
        timestamp,
        stats,
        alerts,
        trend,
        recommendations,
      };
    } catch (error) {
      console.error('Storage check error:', error);
      throw error;
    }
  }

  /**
   * Generate alerts based on storage stats
   */
  private generateAlerts(stats: StorageStats): StorageAlert[] {
    const alerts: StorageAlert[] = [];
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    const warningThreshold = 0.8 * maxSize; // 80%
    const criticalThreshold = 0.95 * maxSize; // 95%

    // Critical alert
    if (stats.totalSize > criticalThreshold) {
      alerts.push({
        type: 'critical',
        message: `Storage is critically full: ${StorageService.formatBytes(stats.totalSize)} / ${StorageService.formatBytes(maxSize)}`,
        timestamp: Date.now(),
        suggestedAction: 'Immediately compress old data or delete unnecessary files',
      });
    }
    // Warning alert
    else if (stats.totalSize > warningThreshold) {
      alerts.push({
        type: 'warning',
        message: `Storage is approaching limit: ${StorageService.formatBytes(stats.totalSize)} / ${StorageService.formatBytes(maxSize)}`,
        timestamp: Date.now(),
        suggestedAction: 'Consider compressing old data to free up space',
      });
    }

    // Check for rapid growth
    if (this.historicalData.length >= 2) {
      const recent = this.historicalData[this.historicalData.length - 1];
      const previous = this.historicalData[this.historicalData.length - 2];
      const growth = recent.size - previous.size;
      const growthPercent = (growth / previous.size) * 100;

      if (growthPercent > 50) {
        alerts.push({
          type: 'warning',
          message: `Rapid storage growth detected: +${growthPercent.toFixed(1)}% since last check`,
          timestamp: Date.now(),
          suggestedAction: 'Monitor storage usage and consider compression',
        });
      }
    }

    // Info alert for large files
    if (stats.fileCount > 10000) {
      alerts.push({
        type: 'info',
        message: `High file count: ${stats.fileCount} files. Consider archiving old data.`,
        timestamp: Date.now(),
      });
    }

    return alerts;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    stats: StorageStats,
    alerts: StorageAlert[],
    trend: any
  ): string[] {
    const recommendations: string[] = [];

    // Based on alerts
    if (alerts.some((a) => a.type === 'critical')) {
      recommendations.push('Run compression immediately to free up space');
      recommendations.push('Delete old snapshots that are no longer needed');
    } else if (alerts.some((a) => a.type === 'warning')) {
      recommendations.push('Schedule compression for old data');
      recommendations.push('Review and clean up temporary files');
    }

    // Based on trend
    if (trend.trend === 'increasing' && trend.estimatedFullDate) {
      const daysUntilFull = Math.ceil(
        (trend.estimatedFullDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      if (daysUntilFull < 7) {
        recommendations.push(
          `Storage will be full in ${daysUntilFull} days. Take action now.`
        );
      }
    }

    // Based on file count
    if (stats.fileCount > 50000) {
      recommendations.push('Consider consolidating files into archives');
    }

    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push('Storage usage is normal');
      recommendations.push('Continue monitoring for changes');
    }

    return recommendations;
  }

  /**
   * Get storage report
   */
  async getReport(): Promise<StorageMonitorReport> {
    return this.checkStorage();
  }

  /**
   * Get historical data
   */
  getHistoricalData(): Array<{ timestamp: number; size: number }> {
    return [...this.historicalData];
  }

  /**
   * Clear historical data
   */
  clearHistoricalData(): void {
    this.historicalData = [];
    this.saveHistoricalData();
  }

  /**
   * Save historical data to file
   */
  private saveHistoricalData(): void {
    try {
      const dataFile = path.join(this.miaodaDir, '.storage-history.json');
      fs.writeFileSync(dataFile, JSON.stringify(this.historicalData, null, 2));
    } catch (err) {
      console.error('Failed to save historical data:', err);
    }
  }

  /**
   * Load historical data from file
   */
  private loadHistoricalData(): void {
    try {
      const dataFile = path.join(this.miaodaDir, '.storage-history.json');
      if (fs.existsSync(dataFile)) {
        this.historicalData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
      }
    } catch (err) {
      console.error('Failed to load historical data:', err);
      this.historicalData = [];
    }
  }

  /**
   * Set monitoring interval
   */
  setMonitorInterval(interval: number): void {
    this.monitorInterval = interval;
    this.stopMonitoring();
    this.startMonitoring();
  }

  /**
   * Get monitoring interval
   */
  getMonitorInterval(): number {
    return this.monitorInterval;
  }
}
