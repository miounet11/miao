/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Miaoda IDE. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { IFileService } from 'vs/platform/files/common/files';
import { ILogService } from 'vs/platform/log/common/log';
import { URI } from 'vs/base/common/uri';
import { IProjectDefaults } from './smartDefaults';

export interface IMiaodaConfig {
  version: string;
  projectType: string;
  createdAt: string;
  lastModified: string;
  settings?: Record<string, any>;
}

export class ProjectManager {
  private miaodaRoot: URI;
  private config: IMiaodaConfig | null = null;

  constructor(
    private workspaceRoot: URI,
    private fileService: IFileService,
    private logService: ILogService
  ) {
    this.miaodaRoot = URI.joinPath(workspaceRoot, '.miaoda');
  }

  /**
   * Initialize .miaoda directory structure
   */
  async initialize(projectDefaults: IProjectDefaults): Promise<void> {
    try {
      // Check if already initialized
      try {
        await this.fileService.resolve(this.miaodaRoot);
        this.logService.info('.miaoda directory already exists');
        return;
      } catch (error) {
        // Directory doesn't exist, create it
      }

      // Create directory structure
      await this.createDirectoryStructure();

      // Create config file
      await this.createConfigFile();

      // Create .gitignore
      await this.createGitignore();

      this.logService.info('.miaoda directory initialized');
    } catch (error) {
      this.logService.error('Failed to initialize .miaoda directory', error);
      throw error;
    }
  }

  /**
   * Create directory structure
   */
  private async createDirectoryStructure(): Promise<void> {
    const dirs = [
      'history/sessions',
      'history/changes',
      'history/snapshots',
      'context',
      'logs',
      'cache/ast',
      'cache/analysis'
    ];

    for (const dir of dirs) {
      const dirPath = URI.joinPath(this.miaodaRoot, dir);
      try {
        await this.fileService.createFolder(dirPath);
      } catch (error) {
        // Directory might already exist
        this.logService.debug(`Directory creation skipped: ${dir}`, error);
      }
    }
  }

  /**
   * Create config file
   */
  private async createConfigFile(): Promise<void> {
    const config: IMiaodaConfig = {
      version: '1.0.0',
      projectType: 'unknown',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      settings: {}
    };

    const configPath = URI.joinPath(this.miaodaRoot, 'config.json');
    const content = JSON.stringify(config, null, 2);

    try {
      await this.fileService.writeFile(configPath, new TextEncoder().encode(content));
      this.config = config;
    } catch (error) {
      this.logService.error('Failed to create config file', error);
      throw error;
    }
  }

  /**
   * Create .gitignore
   */
  private async createGitignore(): Promise<void> {
    const gitignorePath = URI.joinPath(this.miaodaRoot, '.gitignore');
    const content = `# Miaoda IDE internal files
# These files are auto-generated and should not be committed

# Cache files
cache/

# Temporary files
*.tmp
*.temp

# Large snapshots (keep only recent)
snapshots/*.tar.gz

# Logs
logs/*.log

# Database files
*.db
*.sqlite
`;

    try {
      await this.fileService.writeFile(gitignorePath, new TextEncoder().encode(content));
    } catch (error) {
      this.logService.warn('Failed to create .gitignore', error);
    }
  }

  /**
   * Load config
   */
  async loadConfig(): Promise<IMiaodaConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const configPath = URI.joinPath(this.miaodaRoot, 'config.json');
      const content = await this.fileService.readFile(configPath);
      this.config = JSON.parse(content.value.toString());
      return this.config;
    } catch (error) {
      this.logService.error('Failed to load config', error);
      throw error;
    }
  }

  /**
   * Save config
   */
  async saveConfig(config: IMiaodaConfig): Promise<void> {
    try {
      config.lastModified = new Date().toISOString();
      const configPath = URI.joinPath(this.miaodaRoot, 'config.json');
      const content = JSON.stringify(config, null, 2);
      await this.fileService.writeFile(configPath, new TextEncoder().encode(content));
      this.config = config;
    } catch (error) {
      this.logService.error('Failed to save config', error);
      throw error;
    }
  }

  /**
   * Record file change
   */
  async recordChange(file: string, type: 'create' | 'modify' | 'delete' | 'rename', diff: { added: number; removed: number }): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const changesDir = URI.joinPath(this.miaodaRoot, 'history', 'changes', today);

      // Ensure directory exists
      try {
        await this.fileService.resolve(changesDir);
      } catch (error) {
        await this.fileService.createFolder(changesDir);
      }

      // Create change file
      const timestamp = Date.now();
      const changeFile = URI.joinPath(changesDir, `${timestamp}.json`);
      const change = {
        file,
        timestamp,
        type,
        diff
      };

      const content = JSON.stringify(change, null, 2);
      await this.fileService.writeFile(changeFile, new TextEncoder().encode(content));
    } catch (error) {
      this.logService.warn('Failed to record change', error);
    }
  }

  /**
   * Create session
   */
  async createSession(description: string = ''): Promise<string> {
    try {
      const sessionsDir = URI.joinPath(this.miaodaRoot, 'history', 'sessions');
      const today = new Date().toISOString().split('T')[0];
      const sessionFile = URI.joinPath(sessionsDir, `${today}.json`);

      const session = {
        date: today,
        startTime: new Date().toISOString(),
        description,
        changes: []
      };

      const content = JSON.stringify(session, null, 2);
      await this.fileService.writeFile(sessionFile, new TextEncoder().encode(content));

      return today;
    } catch (error) {
      this.logService.error('Failed to create session', error);
      throw error;
    }
  }

  /**
   * Get storage stats
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    cacheSize: number;
    historySize: number;
    snapshotSize: number;
  }> {
    try {
      const stats = {
        totalSize: 0,
        cacheSize: 0,
        historySize: 0,
        snapshotSize: 0
      };

      // Calculate sizes
      const cacheDir = URI.joinPath(this.miaodaRoot, 'cache');
      const historyDir = URI.joinPath(this.miaodaRoot, 'history');
      const snapshotsDir = URI.joinPath(this.miaodaRoot, 'history', 'snapshots');

      try {
        stats.cacheSize = await this.calculateDirSize(cacheDir);
      } catch (error) {
        this.logService.debug('Failed to calculate cache size', error);
      }

      try {
        stats.historySize = await this.calculateDirSize(historyDir);
      } catch (error) {
        this.logService.debug('Failed to calculate history size', error);
      }

      try {
        stats.snapshotSize = await this.calculateDirSize(snapshotsDir);
      } catch (error) {
        this.logService.debug('Failed to calculate snapshot size', error);
      }

      stats.totalSize = stats.cacheSize + stats.historySize;

      return stats;
    } catch (error) {
      this.logService.error('Failed to get storage stats', error);
      return {
        totalSize: 0,
        cacheSize: 0,
        historySize: 0,
        snapshotSize: 0
      };
    }
  }

  /**
   * Calculate directory size
   */
  private async calculateDirSize(dir: URI): Promise<number> {
    try {
      const files = await this.fileService.resolve(dir);
      let size = 0;

      if (files.children) {
        for (const child of files.children) {
          if (child.isDirectory) {
            size += await this.calculateDirSize(child.resource);
          } else {
            size += child.size || 0;
          }
        }
      }

      return size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get miaoda root directory
   */
  getMiaodaRoot(): URI {
    return this.miaodaRoot;
  }
}
