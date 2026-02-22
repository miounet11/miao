/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Miaoda IDE. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IFileService } from 'vs/platform/files/common/files';
import { ILogService } from 'vs/platform/log/common/log';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { URI } from 'vs/base/common/uri';
import { Disposable } from 'vs/base/common/lifecycle';
import { Emitter, Event } from 'vs/base/common/event';

import {
  SmartDefaults,
  AutoOptimizer,
  FirstRunExperience,
  SmartNotifications,
  QuickActions,
  ProjectManager
} from 'vs/miaoda/common/index';

export const IMiaodaService = createDecorator<IMiaodaService>('miaodaService');

export interface IMiaodaService {
  readonly _serviceBrand: undefined;

  // Initialization
  initialize(): Promise<void>;
  isInitialized(): boolean;

  // Smart Defaults
  getSmartDefaults(): SmartDefaults;
  applySmartDefaults(): Promise<void>;
  resetToDefaults(): Promise<void>;

  // Auto Optimizer
  getAutoOptimizer(): AutoOptimizer;
  detectProjectType(): Promise<string>;
  detectCodeStyle(): Promise<any>;

  // First Run Experience
  getFirstRunExperience(): FirstRunExperience;
  isFirstRun(): Promise<boolean>;

  // Smart Notifications
  getSmartNotifications(): SmartNotifications;
  showNotification(message: string, type?: 'info' | 'warning' | 'error'): Promise<void>;

  // Quick Actions
  getQuickActions(): QuickActions;
  getTodayWork(): Promise<any>;
  optimizeProject(): Promise<void>;
  generateWorkReport(days?: number): Promise<string>;

  // Project Manager
  getProjectManager(): ProjectManager;
  getStorageStats(): Promise<any>;

  // Events
  readonly onDidInitialize: Event<void>;
  readonly onDidChangeSettings: Event<any>;
}

export class MiaodaService extends Disposable implements IMiaodaService {
  declare readonly _serviceBrand: undefined;

  private initialized = false;
  private smartDefaults: SmartDefaults | null = null;
  private autoOptimizer: AutoOptimizer | null = null;
  private firstRunExperience: FirstRunExperience | null = null;
  private smartNotifications: SmartNotifications | null = null;
  private quickActions: QuickActions | null = null;
  private projectManager: ProjectManager | null = null;

  private readonly _onDidInitialize = this._register(new Emitter<void>());
  readonly onDidInitialize: Event<void> = this._onDidInitialize.event;

  private readonly _onDidChangeSettings = this._register(new Emitter<any>());
  readonly onDidChangeSettings: Event<any> = this._onDidChangeSettings.event;

  constructor(
    @IConfigurationService private configService: IConfigurationService,
    @IFileService private fileService: IFileService,
    @ILogService private logService: ILogService,
    @IStorageService private storageService: IStorageService
  ) {
    super();
  }

  /**
   * Initialize Miaoda service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logService.info('Initializing Miaoda service...');

      // Get workspace root
      const workspaceRoot = this.getWorkspaceRoot();
      if (!workspaceRoot) {
        this.logService.warn('No workspace root found');
        return;
      }

      // Initialize components
      this.smartDefaults = new SmartDefaults(this.configService);
      this.autoOptimizer = new AutoOptimizer(this.fileService, this.logService, workspaceRoot);
      this.firstRunExperience = new FirstRunExperience(
        this.storageService,
        this.configService,
        this.logService,
        this.autoOptimizer,
        this.smartDefaults
      );
      this.smartNotifications = new SmartNotifications(this.logService, this.storageService);
      this.projectManager = new ProjectManager(workspaceRoot, this.fileService, this.logService);
      this.quickActions = new QuickActions(this.logService, this.fileService, this.projectManager.getMiaodaRoot());

      // Initialize project manager
      const projectDefaults = this.smartDefaults.getProjectDefaults();
      await this.projectManager.initialize(projectDefaults);

      // Run first-time setup if needed
      await this.firstRunExperience.initialize();

      // Apply smart defaults
      await this.smartDefaults.applyDefaults();

      // Listen for configuration changes
      this._register(
        this.configService.onDidChangeConfiguration(e => {
          this._onDidChangeSettings.fire(e);
        })
      );

      this.initialized = true;
      this._onDidInitialize.fire();

      this.logService.info('Miaoda service initialized successfully');
    } catch (error) {
      this.logService.error('Failed to initialize Miaoda service', error);
      throw error;
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get smart defaults
   */
  getSmartDefaults(): SmartDefaults {
    if (!this.smartDefaults) {
      throw new Error('Miaoda service not initialized');
    }
    return this.smartDefaults;
  }

  /**
   * Apply smart defaults
   */
  async applySmartDefaults(): Promise<void> {
    await this.getSmartDefaults().applyDefaults();
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults(): Promise<void> {
    await this.getSmartDefaults().resetToDefaults();
  }

  /**
   * Get auto optimizer
   */
  getAutoOptimizer(): AutoOptimizer {
    if (!this.autoOptimizer) {
      throw new Error('Miaoda service not initialized');
    }
    return this.autoOptimizer;
  }

  /**
   * Detect project type
   */
  async detectProjectType(): Promise<string> {
    return await this.getAutoOptimizer().detectProjectType();
  }

  /**
   * Detect code style
   */
  async detectCodeStyle(): Promise<any> {
    return await this.getAutoOptimizer().detectCodeStyle();
  }

  /**
   * Get first run experience
   */
  getFirstRunExperience(): FirstRunExperience {
    if (!this.firstRunExperience) {
      throw new Error('Miaoda service not initialized');
    }
    return this.firstRunExperience;
  }

  /**
   * Check if first run
   */
  async isFirstRun(): Promise<boolean> {
    return await this.getFirstRunExperience().isFirstRun();
  }

  /**
   * Get smart notifications
   */
  getSmartNotifications(): SmartNotifications {
    if (!this.smartNotifications) {
      throw new Error('Miaoda service not initialized');
    }
    return this.smartNotifications;
  }

  /**
   * Show notification
   */
  async showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    await this.getSmartNotifications().showNotification({
      type,
      message,
      dismissible: true
    });
  }

  /**
   * Get quick actions
   */
  getQuickActions(): QuickActions {
    if (!this.quickActions) {
      throw new Error('Miaoda service not initialized');
    }
    return this.quickActions;
  }

  /**
   * Get today's work
   */
  async getTodayWork(): Promise<any> {
    return await this.getQuickActions().getTodayWork();
  }

  /**
   * Optimize project
   */
  async optimizeProject(): Promise<void> {
    await this.getQuickActions().optimizeProject();
  }

  /**
   * Generate work report
   */
  async generateWorkReport(days: number = 7): Promise<string> {
    return await this.getQuickActions().generateWorkReport(days);
  }

  /**
   * Get project manager
   */
  getProjectManager(): ProjectManager {
    if (!this.projectManager) {
      throw new Error('Miaoda service not initialized');
    }
    return this.projectManager;
  }

  /**
   * Get storage stats
   */
  async getStorageStats(): Promise<any> {
    return await this.getProjectManager().getStorageStats();
  }

  /**
   * Get workspace root
   */
  private getWorkspaceRoot(): URI | null {
    // This would be implemented to get the actual workspace root
    // For now, return a placeholder
    try {
      const config = this.configService.getValue<any>('miaoda.workspaceRoot');
      if (config) {
        return URI.parse(config);
      }
    } catch (error) {
      this.logService.debug('Failed to get workspace root from config', error);
    }
    return null;
  }
}
