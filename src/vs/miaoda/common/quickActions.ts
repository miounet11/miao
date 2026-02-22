/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Miaoda IDE. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ILogService } from 'vs/platform/log/common/log';
import { IFileService } from 'vs/platform/files/common/files';
import { URI } from 'vs/base/common/uri';

export interface IFileChange {
  file: string;
  timestamp: number;
  type: 'create' | 'modify' | 'delete' | 'rename';
  diff: {
    added: number;
    removed: number;
  };
}

export interface IWorkSummary {
  date: Date;
  filesModified: number;
  linesAdded: number;
  linesRemoved: number;
  changes: IFileChange[];
  summary?: string;
}

export interface ISnapshot {
  id: string;
  timestamp: number;
  description: string;
  size: number;
}

export class QuickActions {
  constructor(
    private logService: ILogService,
    private fileService: IFileService,
    private miaodaRoot: URI
  ) {}

  /**
   * Get today's work summary
   */
  async getTodayWork(): Promise<IWorkSummary> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const changes = await this.getTodayChanges();
      const summary = this.generateSummary(changes);

      return {
        date: today,
        filesModified: changes.length,
        linesAdded: changes.reduce((sum, c) => sum + c.diff.added, 0),
        linesRemoved: changes.reduce((sum, c) => sum + c.diff.removed, 0),
        changes,
        summary
      };
    } catch (error) {
      this.logService.error('Failed to get today\'s work', error);
      return {
        date: new Date(),
        filesModified: 0,
        linesAdded: 0,
        linesRemoved: 0,
        changes: []
      };
    }
  }

  /**
   * Get today's file changes
   */
  private async getTodayChanges(): Promise<IFileChange[]> {
    try {
      const changesDir = URI.joinPath(this.miaodaRoot, 'history', 'changes');
      const today = new Date().toISOString().split('T')[0];
      const todayDir = URI.joinPath(changesDir, today);

      try {
        const files = await this.fileService.resolve(todayDir);
        const changes: IFileChange[] = [];

        if (files.children) {
          for (const file of files.children) {
            try {
              const content = await this.fileService.readFile(file);
              const change = JSON.parse(content.value.toString());
              changes.push(change);
            } catch (error) {
              this.logService.warn(`Failed to parse change file: ${file.name}`, error);
            }
          }
        }

        return changes.sort((a, b) => b.timestamp - a.timestamp);
      } catch (error) {
        // Directory doesn't exist yet
        return [];
      }
    } catch (error) {
      this.logService.error('Failed to get today\'s changes', error);
      return [];
    }
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(changes: IFileChange[]): string {
    if (changes.length === 0) {
      return 'No changes today';
    }

    const totalAdded = changes.reduce((sum, c) => sum + c.diff.added, 0);
    const totalRemoved = changes.reduce((sum, c) => sum + c.diff.removed, 0);

    const parts: string[] = [];

    if (changes.length === 1) {
      parts.push(`Modified 1 file`);
    } else {
      parts.push(`Modified ${changes.length} files`);
    }

    if (totalAdded > 0) {
      parts.push(`added ${totalAdded} lines`);
    }

    if (totalRemoved > 0) {
      parts.push(`removed ${totalRemoved} lines`);
    }

    return parts.join(', ');
  }

  /**
   * Restore to specific timestamp
   */
  async restoreToTime(timestamp: number): Promise<void> {
    try {
      this.logService.info(`Restoring to timestamp: ${timestamp}`);

      // Find snapshot for this timestamp
      const snapshot = await this.findSnapshot(timestamp);
      if (!snapshot) {
        throw new Error('No snapshot found for this timestamp');
      }

      // Restore from snapshot
      await this.restoreSnapshot(snapshot);

      this.logService.info('Restore completed');
    } catch (error) {
      this.logService.error('Failed to restore', error);
      throw error;
    }
  }

  /**
   * Find snapshot for timestamp
   */
  private async findSnapshot(timestamp: number): Promise<ISnapshot | null> {
    try {
      const snapshotsDir = URI.joinPath(this.miaodaRoot, 'history', 'snapshots');

      try {
        const files = await this.fileService.resolve(snapshotsDir);
        if (!files.children) {
          return null;
        }

        // Find closest snapshot
        let closest: ISnapshot | null = null;
        let closestDiff = Infinity;

        for (const file of files.children) {
          const fileTimestamp = parseInt(file.name.split('.')[0]);
          const diff = Math.abs(fileTimestamp - timestamp);

          if (diff < closestDiff) {
            closestDiff = diff;
            closest = {
              id: file.name,
              timestamp: fileTimestamp,
              description: new Date(fileTimestamp).toISOString(),
              size: file.size || 0
            };
          }
        }

        return closest;
      } catch (error) {
        return null;
      }
    } catch (error) {
      this.logService.error('Failed to find snapshot', error);
      return null;
    }
  }

  /**
   * Restore from snapshot
   */
  private async restoreSnapshot(snapshot: ISnapshot): Promise<void> {
    // Implementation would extract and restore snapshot
    this.logService.info(`Restoring from snapshot: ${snapshot.id}`);
  }

  /**
   * Optimize project
   */
  async optimizeProject(): Promise<void> {
    try {
      this.logService.info('Starting project optimization...');

      // 1. Compress old data
      this.logService.info('Compressing old data...');
      await this.compressOldData();

      // 2. Clean cache
      this.logService.info('Cleaning cache...');
      await this.cleanCache();

      // 3. Rebuild index
      this.logService.info('Rebuilding index...');
      await this.rebuildIndex();

      // 4. Optimize database
      this.logService.info('Optimizing database...');
      await this.optimizeDatabase();

      this.logService.info('Project optimization completed');
    } catch (error) {
      this.logService.error('Project optimization failed', error);
      throw error;
    }
  }

  /**
   * Compress old data
   */
  private async compressOldData(): Promise<void> {
    // Implementation would compress old history data
    this.logService.info('Compressing old data');
  }

  /**
   * Clean cache
   */
  private async cleanCache(): Promise<void> {
    try {
      const cacheDir = URI.joinPath(this.miaodaRoot, 'cache');

      try {
        await this.fileService.del(cacheDir, { recursive: true });
        this.logService.info('Cache cleaned');
      } catch (error) {
        this.logService.warn('Failed to clean cache', error);
      }
    } catch (error) {
      this.logService.error('Cache cleanup failed', error);
    }
  }

  /**
   * Rebuild index
   */
  private async rebuildIndex(): Promise<void> {
    // Implementation would rebuild code index
    this.logService.info('Rebuilding index');
  }

  /**
   * Optimize database
   */
  private async optimizeDatabase(): Promise<void> {
    // Implementation would optimize databases
    this.logService.info('Optimizing database');
  }

  /**
   * Generate work report
   */
  async generateWorkReport(days: number = 7): Promise<string> {
    try {
      const reports: IWorkSummary[] = [];

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        // Get changes for this date
        const changes = await this.getChangesForDate(date);
        if (changes.length > 0) {
          reports.push({
            date,
            filesModified: changes.length,
            linesAdded: changes.reduce((sum, c) => sum + c.diff.added, 0),
            linesRemoved: changes.reduce((sum, c) => sum + c.diff.removed, 0),
            changes,
            summary: this.generateSummary(changes)
          });
        }
      }

      return this.formatReport(reports);
    } catch (error) {
      this.logService.error('Failed to generate work report', error);
      return 'Failed to generate report';
    }
  }

  /**
   * Get changes for specific date
   */
  private async getChangesForDate(date: Date): Promise<IFileChange[]> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const changesDir = URI.joinPath(this.miaodaRoot, 'history', 'changes', dateStr);

      try {
        const files = await this.fileService.resolve(changesDir);
        const changes: IFileChange[] = [];

        if (files.children) {
          for (const file of files.children) {
            try {
              const content = await this.fileService.readFile(file);
              const change = JSON.parse(content.value.toString());
              changes.push(change);
            } catch (error) {
              this.logService.warn(`Failed to parse change file: ${file.name}`, error);
            }
          }
        }

        return changes;
      } catch (error) {
        return [];
      }
    } catch (error) {
      this.logService.error('Failed to get changes for date', error);
      return [];
    }
  }

  /**
   * Format report as string
   */
  private formatReport(reports: IWorkSummary[]): string {
    if (reports.length === 0) {
      return 'No work recorded in the selected period';
    }

    const lines: string[] = [
      '=== Work Report ===',
      ''
    ];

    for (const report of reports) {
      lines.push(`${report.date.toDateString()}`);
      lines.push(`  Files: ${report.filesModified}`);
      lines.push(`  Added: ${report.linesAdded} lines`);
      lines.push(`  Removed: ${report.linesRemoved} lines`);
      lines.push('');
    }

    const totalFiles = reports.reduce((sum, r) => sum + r.filesModified, 0);
    const totalAdded = reports.reduce((sum, r) => sum + r.linesAdded, 0);
    const totalRemoved = reports.reduce((sum, r) => sum + r.linesRemoved, 0);

    lines.push('=== Summary ===');
    lines.push(`Total Files Modified: ${totalFiles}`);
    lines.push(`Total Lines Added: ${totalAdded}`);
    lines.push(`Total Lines Removed: ${totalRemoved}`);

    return lines.join('\n');
  }
}
