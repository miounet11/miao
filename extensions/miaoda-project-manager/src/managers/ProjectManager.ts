import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ChangeTracker } from '../trackers/ChangeTracker';
import { SessionManager } from './SessionManager';
import { LogManager } from './LogManager';
import { StorageManager } from './StorageManager';
import type {
  ProjectConfig,
  FileChange,
  SessionRecord,
  StorageStats,
  ProjectStats,
} from '../types';

const DEFAULT_CONFIG: ProjectConfig = {
  projectRoot: '',
  miaodaDir: '',
  autoInit: true,
  trackChanges: true,
  autoCompress: true,
  autoCleanup: true,
};

/**
 * ProjectManager - Core class for project management
 * Handles initialization, coordination of all managers
 */
export class ProjectManager {
  private config: ProjectConfig;
  public readonly changeTracker: ChangeTracker;
  public readonly sessionManager: SessionManager;
  public readonly logManager: LogManager;
  private storageManager: StorageManager;
  private initialized: boolean = false;
  private disposables: vscode.Disposable[] = [];

  constructor(projectRoot: string) {
    this.config = {
      ...DEFAULT_CONFIG,
      projectRoot,
      miaodaDir: path.join(projectRoot, '.miaoda'),
    };

    this.changeTracker = new ChangeTracker(this.config);
    this.sessionManager = new SessionManager(this.config);
    this.logManager = new LogManager(this.config);
    this.storageManager = new StorageManager(this.config);
  }

  /**
   * Initialize the project manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create .miaoda/ directory structure
      await this.initializeDirectoryStructure();

      // Load or create config
      await this.loadConfig();

      // Initialize managers
      await this.changeTracker.initialize();
      await this.sessionManager.initialize();
      await this.logManager.initialize();
      await this.storageManager.initialize();

      // Start session
      await this.sessionManager.startSession();

      // Setup file watchers
      this.setupFileWatchers();

      // Setup periodic tasks
      this.setupPeriodicTasks();

      this.initialized = true;
      this.logManager.info('ProjectManager', 'Project manager initialized successfully');
    } catch (error) {
      this.logManager.error('ProjectManager', 'Failed to initialize project manager', { error });
      throw error;
    }
  }

  /**
   * Initialize directory structure
   */
  private async initializeDirectoryStructure(): Promise<void> {
    const dirs = [
      this.config.miaodaDir,
      path.join(this.config.miaodaDir, 'history'),
      path.join(this.config.miaodaDir, 'history', 'sessions'),
      path.join(this.config.miaodaDir, 'history', 'changes'),
      path.join(this.config.miaodaDir, 'history', 'snapshots'),
      path.join(this.config.miaodaDir, 'context'),
      path.join(this.config.miaodaDir, 'logs'),
      path.join(this.config.miaodaDir, 'cache'),
      path.join(this.config.miaodaDir, 'cache', 'ast'),
      path.join(this.config.miaodaDir, 'cache', 'analysis'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Create .gitignore
    await this.createGitignore();
  }

  /**
   * Create .gitignore for .miaoda directory
   */
  private async createGitignore(): Promise<void> {
    const gitignorePath = path.join(this.config.miaodaDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      const content = `# Miaoda Project Management Directory
# Auto-generated, do not edit

*
!.gitignore
!config.json
`;
      fs.writeFileSync(gitignorePath, content);
    }
  }

  /**
   * Load project configuration
   */
  private async loadConfig(): Promise<void> {
    const configPath = path.join(this.config.miaodaDir, 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const data = fs.readFileSync(configPath, 'utf-8');
        const loaded = JSON.parse(data);
        this.config = { ...this.config, ...loaded };
      } catch (error) {
        this.logManager.warn('ProjectManager', 'Failed to load config, using defaults', { error });
      }
    } else {
      await this.saveConfig();
    }
  }

  /**
   * Save project configuration
   */
  private async saveConfig(): Promise<void> {
    const configPath = path.join(this.config.miaodaDir, 'config.json');
    const configData = {
      autoInit: this.config.autoInit,
      trackChanges: this.config.trackChanges,
      autoCompress: this.config.autoCompress,
      autoCleanup: this.config.autoCleanup,
    };
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  }

  /**
   * Setup file watchers
   */
  private setupFileWatchers(): void {
    if (!this.config.trackChanges) {
      return;
    }

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.config.projectRoot, '**/*'),
      false,
      false,
      false
    );

    const handleChange = async (uri: vscode.Uri) => {
      const relativePath = path.relative(this.config.projectRoot, uri.fsPath);
      if (!relativePath.startsWith('.miaoda')) {
        await this.changeTracker.trackChange(uri.fsPath);
      }
    };

    watcher.onDidCreate(handleChange);
    watcher.onDidChange(handleChange);
    watcher.onDidDelete(handleChange);

    this.disposables.push(watcher);
  }

  /**
   * Setup periodic tasks
   */
  private setupPeriodicTasks(): void {
    // Check storage every 5 minutes
    const storageCheckInterval = setInterval(async () => {
      if (this.config.autoCompress) {
        await this.storageManager.checkAndCompress();
      }
      if (this.config.autoCleanup) {
        await this.storageManager.cleanup();
      }
    }, 5 * 60 * 1000);

    this.disposables.push({
      dispose: () => clearInterval(storageCheckInterval),
    });
  }

  /**
   * Get project statistics
   */
  async getProjectStats(): Promise<ProjectStats> {
    const changes = await this.changeTracker.getAllChanges();
    const session = await this.sessionManager.getCurrentSession();
    const storageStats = await this.storageManager.getStorageStats();

    return {
      totalFiles: changes.length,
      totalChanges: changes.length,
      activeTime: session?.duration || 0,
      lastModified: changes.length > 0 ? changes[changes.length - 1].timestamp : 0,
      storageUsed: storageStats,
    };
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    return this.storageManager.getStorageStats();
  }

  /**
   * Get recent changes
   */
  async getRecentChanges(limit: number = 50): Promise<FileChange[]> {
    return this.changeTracker.getRecentChanges(limit);
  }

  /**
   * Get changes for a specific date
   */
  async getChangesForDate(date: Date): Promise<FileChange[]> {
    return this.changeTracker.getChangesForDate(date);
  }

  /**
   * Optimize storage
   */
  async optimizeStorage(): Promise<void> {
    await this.storageManager.checkAndCompress();
    await this.storageManager.cleanup();
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<ProjectConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }

  /**
   * End current session
   */
  async endSession(): Promise<SessionRecord | undefined> {
    return this.sessionManager.endSession();
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    await this.endSession();
    this.disposables.forEach(d => d.dispose());
    await this.changeTracker.dispose();
    await this.sessionManager.dispose();
    await this.logManager.dispose();
    await this.storageManager.dispose();
    this.initialized = false;
  }

  /**
   * Get managers for advanced operations
   */
  getChangeTracker(): ChangeTracker {
    return this.changeTracker;
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getLogManager(): LogManager {
    return this.logManager;
  }

  getStorageManager(): StorageManager {
    return this.storageManager;
  }
}
