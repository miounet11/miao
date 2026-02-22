/**
 * Data Migration Utility
 * Migrates existing JSON-based chat history to SQLite database
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ChatHistoryStorage, ChatSession } from './ChatHistoryStorage';
import { EnhancedChatHistoryStorage } from './EnhancedChatHistoryStorage';
import { UnifiedStorage } from './UnifiedStorage';

export interface MigrationResult {
  success: boolean;
  migratedSessions: number;
  migratedMessages: number;
  errors: string[];
  duration: number;
}

export interface MigrationOptions {
  backupBeforeMigration?: boolean;
  deleteOldData?: boolean;
  dryRun?: boolean;
}

export class DataMigration {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Migrate chat history from JSON to SQLite
   */
  async migrateChatHistory(
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      migratedSessions: 0,
      migratedMessages: 0,
      errors: [],
      duration: 0
    };

    try {
      const {
        backupBeforeMigration = true,
        deleteOldData = false,
        dryRun = false
      } = options;

      // 1. Check if old storage exists
      const oldStorageDir = path.join(
        this.context.globalStorageUri.fsPath,
        'chat-history'
      );

      if (!fs.existsSync(oldStorageDir)) {
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // 2. Backup if requested
      if (backupBeforeMigration && !dryRun) {
        await this.backupOldData(oldStorageDir);
      }

      // 3. Load old data
      const oldStorage = new ChatHistoryStorage(this.context);
      const sessions = await oldStorage.listSessions();

      if (sessions.length === 0) {
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // 4. Initialize new storage
      const unifiedStorage = new UnifiedStorage(this.context, {
        enableSemanticSearch: true,
        enableCache: true
      });
      await unifiedStorage.initialize();

      const newStorage = new EnhancedChatHistoryStorage(this.context, unifiedStorage);
      await newStorage.initialize();

      // 5. Migrate sessions
      for (const session of sessions) {
        try {
          if (!dryRun) {
            await newStorage.saveSession(session);
          }
          result.migratedSessions++;
          result.migratedMessages += session.messages.length;
        } catch (error) {
          const errorMsg = `Failed to migrate session ${session.id}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // 6. Verify migration
      if (!dryRun) {
        const verificationResult = await this.verifyMigration(
          sessions,
          newStorage
        );

        if (!verificationResult.success) {
          result.errors.push(...verificationResult.errors);
          throw new Error('Migration verification failed');
        }
      }

      // 7. Delete old data if requested
      if (deleteOldData && !dryRun) {
        await this.deleteOldData(oldStorageDir);
      }

      result.success = true;
    } catch (error) {
      result.success = false;
      result.errors.push(`Migration failed: ${error}`);
      console.error('Migration error:', error);
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Backup old data
   */
  private async backupOldData(oldStorageDir: string): Promise<void> {
    const backupDir = path.join(
      this.context.globalStorageUri.fsPath,
      'chat-history-backup-' + Date.now()
    );

    try {
      await fs.promises.mkdir(backupDir, { recursive: true });

      const files = await fs.promises.readdir(oldStorageDir);
      for (const file of files) {
        const srcPath = path.join(oldStorageDir, file);
        const destPath = path.join(backupDir, file);
        await fs.promises.copyFile(srcPath, destPath);
      }

      console.log(`Backup created at: ${backupDir}`);
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error(`Backup failed: ${error}`);
    }
  }

  /**
   * Verify migration
   */
  private async verifyMigration(
    originalSessions: ChatSession[],
    newStorage: EnhancedChatHistoryStorage
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const migratedSessions = await newStorage.listSessions();

      // Check session count
      if (migratedSessions.length !== originalSessions.length) {
        errors.push(
          `Session count mismatch: expected ${originalSessions.length}, got ${migratedSessions.length}`
        );
      }

      // Check each session
      for (const originalSession of originalSessions) {
        const migratedSession = await newStorage.loadSession(originalSession.id);

        if (!migratedSession) {
          errors.push(`Session ${originalSession.id} not found in migrated data`);
          continue;
        }

        // Check message count
        if (migratedSession.messages.length !== originalSession.messages.length) {
          errors.push(
            `Message count mismatch for session ${originalSession.id}: ` +
            `expected ${originalSession.messages.length}, got ${migratedSession.messages.length}`
          );
        }

        // Check message content (sample check)
        if (originalSession.messages.length > 0) {
          const firstOriginal = originalSession.messages[0];
          const firstMigrated = migratedSession.messages[0];

          if (firstOriginal.content !== firstMigrated.content) {
            errors.push(
              `Message content mismatch for session ${originalSession.id}`
            );
          }
        }
      }
    } catch (error) {
      errors.push(`Verification error: ${error}`);
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Delete old data
   */
  private async deleteOldData(oldStorageDir: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(oldStorageDir);
      for (const file of files) {
        await fs.promises.unlink(path.join(oldStorageDir, file));
      }
      await fs.promises.rmdir(oldStorageDir);
      console.log('Old data deleted successfully');
    } catch (error) {
      console.error('Failed to delete old data:', error);
      throw new Error(`Delete failed: ${error}`);
    }
  }

  /**
   * Rollback migration
   */
  async rollbackMigration(): Promise<void> {
    const backupDirs = await this.findBackupDirectories();

    if (backupDirs.length === 0) {
      throw new Error('No backup found to rollback');
    }

    // Use the most recent backup
    const latestBackup = backupDirs[backupDirs.length - 1];
    const oldStorageDir = path.join(
      this.context.globalStorageUri.fsPath,
      'chat-history'
    );

    try {
      // Remove current data
      if (fs.existsSync(oldStorageDir)) {
        const files = await fs.promises.readdir(oldStorageDir);
        for (const file of files) {
          await fs.promises.unlink(path.join(oldStorageDir, file));
        }
      } else {
        await fs.promises.mkdir(oldStorageDir, { recursive: true });
      }

      // Restore from backup
      const backupFiles = await fs.promises.readdir(latestBackup);
      for (const file of backupFiles) {
        const srcPath = path.join(latestBackup, file);
        const destPath = path.join(oldStorageDir, file);
        await fs.promises.copyFile(srcPath, destPath);
      }

      console.log(`Rollback completed from: ${latestBackup}`);
    } catch (error) {
      console.error('Rollback failed:', error);
      throw new Error(`Rollback failed: ${error}`);
    }
  }

  /**
   * Find backup directories
   */
  private async findBackupDirectories(): Promise<string[]> {
    const storageRoot = this.context.globalStorageUri.fsPath;
    const backupDirs: string[] = [];

    try {
      const entries = await fs.promises.readdir(storageRoot, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('chat-history-backup-')) {
          backupDirs.push(path.join(storageRoot, entry.name));
        }
      }
    } catch (error) {
      console.error('Failed to find backup directories:', error);
    }

    return backupDirs.sort();
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    needsMigration: boolean;
    oldDataExists: boolean;
    newDataExists: boolean;
    backupsAvailable: number;
  }> {
    const oldStorageDir = path.join(
      this.context.globalStorageUri.fsPath,
      'chat-history'
    );
    const newStorageDir = path.join(
      this.context.globalStorageUri.fsPath,
      'database'
    );

    const oldDataExists = fs.existsSync(oldStorageDir);
    const newDataExists = fs.existsSync(path.join(newStorageDir, 'miaoda.db'));
    const backups = await this.findBackupDirectories();

    return {
      needsMigration: oldDataExists && !newDataExists,
      oldDataExists,
      newDataExists,
      backupsAvailable: backups.length
    };
  }

  /**
   * Clean up old backups (keep only the most recent N)
   */
  async cleanupOldBackups(keepCount: number = 3): Promise<void> {
    const backupDirs = await this.findBackupDirectories();

    if (backupDirs.length <= keepCount) {
      return;
    }

    const toDelete = backupDirs.slice(0, backupDirs.length - keepCount);

    for (const dir of toDelete) {
      try {
        const files = await fs.promises.readdir(dir);
        for (const file of files) {
          await fs.promises.unlink(path.join(dir, file));
        }
        await fs.promises.rmdir(dir);
        console.log(`Deleted old backup: ${dir}`);
      } catch (error) {
        console.error(`Failed to delete backup ${dir}:`, error);
      }
    }
  }
}

/**
 * Auto-migration helper
 * Automatically migrates data on first run
 */
export async function autoMigrate(
  context: vscode.ExtensionContext,
  options: MigrationOptions = {}
): Promise<MigrationResult | null> {
  const migration = new DataMigration(context);
  const status = await migration.getMigrationStatus();

  if (!status.needsMigration) {
    return null;
  }

  // Show progress notification
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Migrating chat history to enhanced storage...',
      cancellable: false
    },
    async (progress) => {
      progress.report({ increment: 0 });

      const result = await migration.migrateChatHistory({
        ...options,
        backupBeforeMigration: true,
        deleteOldData: false // Keep old data for safety
      });

      progress.report({ increment: 100 });

      if (result.success) {
        vscode.window.showInformationMessage(
          `Successfully migrated ${result.migratedSessions} chat sessions ` +
          `(${result.migratedMessages} messages) in ${result.duration}ms`
        );
      } else {
        vscode.window.showErrorMessage(
          `Migration failed: ${result.errors.join(', ')}`
        );
      }

      return result;
    }
  );
}
