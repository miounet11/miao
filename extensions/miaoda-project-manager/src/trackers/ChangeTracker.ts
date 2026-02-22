import * as fs from 'fs';
import * as path from 'path';
import type { ProjectConfig, FileChange } from '../types';

/**
 * ChangeTracker - Monitors and records file changes
 */
export class ChangeTracker {
  private config: ProjectConfig;
  private changesDir: string;
  private changeCache: Map<string, FileChange> = new Map();

  constructor(config: ProjectConfig) {
    this.config = config;
    this.changesDir = path.join(config.miaodaDir, 'history', 'changes');
  }

  /**
   * Initialize the change tracker
   */
  async initialize(): Promise<void> {
    // Load existing changes into cache
    await this.loadChangesFromDisk();
  }

  /**
   * Track a file change
   */
  async trackChange(filePath: string): Promise<void> {
    try {
      const relativePath = path.relative(this.config.projectRoot, filePath);
      if (relativePath.startsWith('.miaoda')) {
        return; // Ignore .miaoda directory
      }

      const timestamp = Date.now();
      const change: FileChange = {
        file: relativePath,
        timestamp,
        type: this.detectChangeType(filePath),
        diff: await this.calculateDiff(filePath),
      };

      // Save to cache
      this.changeCache.set(filePath, change);

      // Save to disk
      await this.saveChangeToDisk(change);
    } catch (error) {
      console.error('Failed to track change:', error);
    }
  }

  /**
   * Detect the type of change
   */
  private detectChangeType(filePath: string): 'create' | 'modify' | 'delete' | 'rename' {
    if (!fs.existsSync(filePath)) {
      return 'delete';
    }
    return 'modify'; // Simplified for now
  }

  /**
   * Calculate diff for a file
   */
  private async calculateDiff(filePath: string): Promise<{ added: number; removed: number; content?: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { added: 0, removed: 0 };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;

      return {
        added: lines,
        removed: 0,
        content: content.length < 10000 ? content : undefined, // Store small files
      };
    } catch (error) {
      return { added: 0, removed: 0 };
    }
  }

  /**
   * Save change to disk
   */
  private async saveChangeToDisk(change: FileChange): Promise<void> {
    const date = new Date(change.timestamp);
    const dateDir = path.join(
      this.changesDir,
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    );

    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }

    const time = `${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
    const fileName = `${time}-${Date.now() % 1000}.json`;
    const filePath = path.join(dateDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(change, null, 2));
  }

  /**
   * Load changes from disk
   */
  private async loadChangesFromDisk(): Promise<void> {
    try {
      if (!fs.existsSync(this.changesDir)) {
        return;
      }

      const dates = fs.readdirSync(this.changesDir);
      for (const date of dates) {
        const dateDir = path.join(this.changesDir, date);
        if (!fs.statSync(dateDir).isDirectory()) {
          continue;
        }

        const files = fs.readdirSync(dateDir);
        for (const file of files) {
          if (!file.endsWith('.json')) {
            continue;
          }

          try {
            const content = fs.readFileSync(path.join(dateDir, file), 'utf-8');
            const change = JSON.parse(content) as FileChange;
            this.changeCache.set(change.file, change);
          } catch (error) {
            console.error(`Failed to load change from ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load changes from disk:', error);
    }
  }

  /**
   * Get all changes
   */
  async getAllChanges(): Promise<FileChange[]> {
    return Array.from(this.changeCache.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get recent changes
   */
  async getRecentChanges(limit: number = 50): Promise<FileChange[]> {
    const changes = Array.from(this.changeCache.values()).sort((a, b) => b.timestamp - a.timestamp);
    return changes.slice(0, limit);
  }

  /**
   * Get changes for a specific date
   */
  async getChangesForDate(date: Date): Promise<FileChange[]> {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const changes = Array.from(this.changeCache.values()).filter(change => {
      const changeDate = new Date(change.timestamp);
      const changeDateStr = `${changeDate.getFullYear()}-${String(changeDate.getMonth() + 1).padStart(2, '0')}-${String(changeDate.getDate()).padStart(2, '0')}`;
      return changeDateStr === dateStr;
    });
    return changes.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear old changes
   */
  async clearOldChanges(olderThanMs: number): Promise<number> {
    const cutoffTime = Date.now() - olderThanMs;
    let removed = 0;

    for (const [key, change] of this.changeCache.entries()) {
      if (change.timestamp < cutoffTime) {
        this.changeCache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get file history for a specific file
   */
  async getFileHistory(filePath: string): Promise<FileChange[]> {
    const relativePath = path.relative(this.config.projectRoot, filePath);
    const changes: FileChange[] = [];

    try {
      if (!fs.existsSync(this.changesDir)) {
        return changes;
      }

      // Read all date directories
      const dates = fs.readdirSync(this.changesDir);
      for (const date of dates) {
        const dateDir = path.join(this.changesDir, date);
        if (!fs.statSync(dateDir).isDirectory()) {
          continue;
        }

        // Read all change files in this date
        const files = fs.readdirSync(dateDir);
        for (const file of files) {
          if (!file.endsWith('.json')) {
            continue;
          }

          try {
            const content = fs.readFileSync(path.join(dateDir, file), 'utf-8');
            const change = JSON.parse(content) as FileChange;

            // Check if this change is for the requested file
            if (change.file === relativePath) {
              changes.push(change);
            }
          } catch (error) {
            console.error(`Failed to load change from ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to get file history:', error);
    }

    return changes.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    this.changeCache.clear();
  }
}
