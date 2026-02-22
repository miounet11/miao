/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Miaoda IDE. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILogService } from 'vs/platform/log/common/log';
import { AutoOptimizer, ISystemInfo } from './autoOptimizer';
import { SmartDefaults } from './smartDefaults';

const FIRST_RUN_KEY = 'miaoda.firstRun';
const SETUP_COMPLETE_KEY = 'miaoda.setupComplete';

export interface IFirstRunConfig {
  language: string;
  theme: 'light' | 'dark';
  enableAI: boolean;
  enableGit: boolean;
  createSampleProject: boolean;
}

export class FirstRunExperience {
  constructor(
    private storageService: IStorageService,
    private configService: IConfigurationService,
    private logService: ILogService,
    private autoOptimizer: AutoOptimizer,
    private smartDefaults: SmartDefaults
  ) {}

  /**
   * Check if this is first run
   */
  async isFirstRun(): Promise<boolean> {
    const value = this.storageService.get(FIRST_RUN_KEY, StorageScope.APPLICATION);
    return !value || value === 'false';
  }

  /**
   * Initialize first run experience
   */
  async initialize(): Promise<void> {
    if (await this.isFirstRun()) {
      this.logService.info('First run detected, initializing setup...');

      try {
        // Auto-detect system settings
        const systemInfo = await this.autoOptimizer.detectSystemInfo();

        // Apply smart defaults
        await this.smartDefaults.applyDefaults();

        // Apply system-detected settings
        await this.applySystemSettings(systemInfo);

        // Mark as configured
        await this.markAsConfigured();

        this.logService.info('First run setup completed');
      } catch (error) {
        this.logService.error('First run setup failed', error);
      }
    }
  }

  /**
   * Apply system-detected settings
   */
  private async applySystemSettings(systemInfo: ISystemInfo): Promise<void> {
    try {
      // Apply language
      if (systemInfo.language && systemInfo.language !== 'en') {
        await this.configService.updateValue('miaoda.language', systemInfo.language);
      }

      // Apply theme preference
      const themeDefaults = this.smartDefaults.getThemeDefaults();
      if (systemInfo.theme === 'light') {
        await this.configService.updateValue('miaoda.theme.colorTheme', 'Miaoda Light');
        await this.configService.updateValue('miaoda.theme.preferDarkMode', false);
      }

      // Apply shell
      const terminalDefaults = this.smartDefaults.getTerminalDefaults();
      if (systemInfo.shell) {
        await this.configService.updateValue('miaoda.terminal.shell', systemInfo.shell);
      }

      this.logService.info('System settings applied');
    } catch (error) {
      this.logService.warn('Failed to apply system settings', error);
    }
  }

  /**
   * Mark setup as complete
   */
  private async markAsConfigured(): Promise<void> {
    this.storageService.store(FIRST_RUN_KEY, 'true', StorageScope.APPLICATION, StorageTarget.MACHINE);
    this.storageService.store(SETUP_COMPLETE_KEY, new Date().toISOString(), StorageScope.APPLICATION, StorageTarget.MACHINE);
  }

  /**
   * Get setup completion status
   */
  async getSetupStatus(): Promise<{
    isFirstRun: boolean;
    completedAt?: string;
  }> {
    const isFirstRun = await this.isFirstRun();
    const completedAt = this.storageService.get(SETUP_COMPLETE_KEY, StorageScope.APPLICATION);

    return {
      isFirstRun,
      completedAt
    };
  }

  /**
   * Reset setup (for testing or re-initialization)
   */
  async resetSetup(): Promise<void> {
    this.storageService.remove(FIRST_RUN_KEY, StorageScope.APPLICATION);
    this.storageService.remove(SETUP_COMPLETE_KEY, StorageScope.APPLICATION);
    this.logService.info('Setup reset');
  }
}
