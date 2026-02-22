/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Miaoda IDE. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ILogService } from 'vs/platform/log/common/log';
import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';

export type NotificationType = 'info' | 'warning' | 'error' | 'tip';

export interface INotificationAction {
  label: string;
  action: () => void | Promise<void>;
}

export interface ISmartNotification {
  type: NotificationType;
  message: string;
  actions?: INotificationAction[];
  dismissible?: boolean;
  timeout?: number; // milliseconds
}

export interface IStorageStats {
  totalSize: number;
  cacheSize: number;
  historySize: number;
  snapshotSize: number;
}

export interface IPerformanceIssue {
  type: 'memory' | 'cpu' | 'disk' | 'indexing';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

const NOTIFICATION_COOLDOWN_KEY = 'miaoda.notification.cooldown';
const STORAGE_WARNING_THRESHOLD = 1.8 * 1024 * 1024 * 1024; // 1.8GB
const STORAGE_CRITICAL_THRESHOLD = 1.95 * 1024 * 1024 * 1024; // 1.95GB

export class SmartNotifications {
  private notificationCallbacks: Map<string, (notification: ISmartNotification) => void> = new Map();
  private lastNotificationTime: Map<string, number> = new Map();

  constructor(
    private logService: ILogService,
    private storageService: IStorageService
  ) {}

  /**
   * Register notification callback
   */
  onNotification(callback: (notification: ISmartNotification) => void): void {
    const id = Math.random().toString(36).substr(2, 9);
    this.notificationCallbacks.set(id, callback);
  }

  /**
   * Show notification
   */
  async showNotification(notification: ISmartNotification): Promise<void> {
    // Check cooldown
    const key = `${notification.type}:${notification.message}`;
    const lastTime = this.lastNotificationTime.get(key) || 0;
    const now = Date.now();

    if (now - lastTime < 60000) {
      // Skip if shown in last minute
      return;
    }

    this.lastNotificationTime.set(key, now);

    // Emit to all listeners
    for (const callback of this.notificationCallbacks.values()) {
      try {
        callback(notification);
      } catch (error) {
        this.logService.error('Notification callback failed', error);
      }
    }
  }

  /**
   * Check storage and show warning if needed
   */
  async checkStorage(stats: IStorageStats): Promise<void> {
    if (stats.totalSize > STORAGE_CRITICAL_THRESHOLD) {
      await this.showNotification({
        type: 'error',
        message: 'Project storage is critically full (>1.95GB). Miaoda will auto-compress immediately.',
        actions: [
          {
            label: 'Compress Now',
            action: () => this.logService.info('Compression triggered')
          },
          {
            label: 'View Details',
            action: () => this.logService.info('Showing storage details')
          }
        ]
      });
    } else if (stats.totalSize > STORAGE_WARNING_THRESHOLD) {
      await this.showNotification({
        type: 'warning',
        message: 'Project storage approaching 2GB limit. Miaoda will auto-compress old data.',
        actions: [
          {
            label: 'Compress Now',
            action: () => this.logService.info('Compression triggered')
          },
          {
            label: 'View Details',
            action: () => this.logService.info('Showing storage details')
          }
        ]
      });
    }
  }

  /**
   * Suggest performance optimizations
   */
  async suggestOptimizations(issues: IPerformanceIssue[]): Promise<void> {
    if (issues.length === 0) {
      return;
    }

    const criticalIssues = issues.filter(i => i.severity === 'high');
    const message = criticalIssues.length > 0
      ? `Found ${criticalIssues.length} critical performance issue(s)`
      : `Found ${issues.length} performance optimization opportunity(ies)`;

    await this.showNotification({
      type: criticalIssues.length > 0 ? 'warning' : 'tip',
      message,
      actions: [
        {
          label: 'Auto-Optimize',
          action: () => this.logService.info('Auto-optimization triggered')
        },
        {
          label: 'View Suggestions',
          action: () => this.logService.info('Showing optimization suggestions')
        }
      ]
    });
  }

  /**
   * Suggest features
   */
  async suggestFeatures(features: string[]): Promise<void> {
    if (features.length === 0) {
      return;
    }

    const message = `Miaoda has ${features.length} feature(s) you might find useful`;

    await this.showNotification({
      type: 'tip',
      message,
      actions: [
        {
          label: 'Learn More',
          action: () => this.logService.info('Showing feature suggestions')
        },
        {
          label: 'Dismiss',
          action: () => this.logService.info('Feature suggestion dismissed')
        }
      ]
    });
  }

  /**
   * Show success notification
   */
  async showSuccess(message: string): Promise<void> {
    await this.showNotification({
      type: 'info',
      message,
      dismissible: true,
      timeout: 3000
    });
  }

  /**
   * Show error notification
   */
  async showError(message: string, error?: Error): Promise<void> {
    const fullMessage = error ? `${message}: ${error.message}` : message;
    await this.showNotification({
      type: 'error',
      message: fullMessage,
      dismissible: true
    });
  }

  /**
   * Clear notification cooldown
   */
  clearCooldown(): void {
    this.lastNotificationTime.clear();
  }
}
