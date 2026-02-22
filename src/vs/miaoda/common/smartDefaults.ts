/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Miaoda IDE. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurationService } from 'vs/platform/configuration/common/configuration';

export interface ISmartDefaults {
  editor: IEditorDefaults;
  theme: IThemeDefaults;
  terminal: ITerminalDefaults;
  git: IGitDefaults;
  ai: IAIDefaults;
  project: IProjectDefaults;
}

export interface IEditorDefaults {
  fontSize: number;
  tabSize: number;
  formatOnSave: boolean;
  autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';
  minimap: { enabled: boolean };
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all';
}

export interface IThemeDefaults {
  colorTheme: string;
  autoSwitch: boolean;
  iconTheme: string;
  preferDarkMode: boolean;
}

export interface ITerminalDefaults {
  fontSize: number;
  shell: string;
  cursorStyle: 'block' | 'line' | 'underline';
  cursorBlink: boolean;
  scrollback: number;
}

export interface IGitDefaults {
  enabled: boolean;
  autoFetch: boolean;
  autoPush: boolean;
  confirmSync: boolean;
  autoStash: boolean;
}

export interface IAIDefaults {
  enabled: boolean;
  autoContext: boolean;
  semanticSearch: boolean;
  smartSuggestions: boolean;
  codeAnalysis: boolean;
}

export interface IProjectDefaults {
  autoInit: boolean;
  trackChanges: boolean;
  autoCompress: boolean;
  autoCleanup: boolean;
  compressionThreshold: number; // bytes
  compressionAge: number; // days
}

export const SMART_DEFAULTS: ISmartDefaults = {
  editor: {
    fontSize: 13,
    tabSize: 2,
    formatOnSave: true,
    autoSave: 'afterDelay',
    minimap: { enabled: true },
    wordWrap: 'on',
    renderWhitespace: 'selection'
  },
  theme: {
    colorTheme: 'Miaoda Dark',
    autoSwitch: true,
    iconTheme: 'vs-seti',
    preferDarkMode: true
  },
  terminal: {
    fontSize: 12,
    shell: 'auto',
    cursorStyle: 'line',
    cursorBlink: true,
    scrollback: 1000
  },
  git: {
    enabled: true,
    autoFetch: true,
    autoPush: false,
    confirmSync: true,
    autoStash: true
  },
  ai: {
    enabled: true,
    autoContext: true,
    semanticSearch: true,
    smartSuggestions: true,
    codeAnalysis: true
  },
  project: {
    autoInit: true,
    trackChanges: true,
    autoCompress: true,
    autoCleanup: true,
    compressionThreshold: 2 * 1024 * 1024 * 1024, // 2GB
    compressionAge: 30 // days
  }
};

export class SmartDefaults {
  constructor(private configService: IConfigurationService) {}

  /**
   * Apply smart defaults to configuration
   */
  async applyDefaults(): Promise<void> {
    const config = this.configService.getValue<any>('miaoda') || {};

    // Merge with smart defaults
    const merged = this.deepMerge(SMART_DEFAULTS, config);

    // Apply to configuration
    await this.configService.updateValue('miaoda', merged);
  }

  /**
   * Get editor defaults
   */
  getEditorDefaults(): IEditorDefaults {
    const config = this.configService.getValue<any>('miaoda.editor') || {};
    return { ...SMART_DEFAULTS.editor, ...config };
  }

  /**
   * Get theme defaults
   */
  getThemeDefaults(): IThemeDefaults {
    const config = this.configService.getValue<any>('miaoda.theme') || {};
    return { ...SMART_DEFAULTS.theme, ...config };
  }

  /**
   * Get terminal defaults
   */
  getTerminalDefaults(): ITerminalDefaults {
    const config = this.configService.getValue<any>('miaoda.terminal') || {};
    return { ...SMART_DEFAULTS.terminal, ...config };
  }

  /**
   * Get git defaults
   */
  getGitDefaults(): IGitDefaults {
    const config = this.configService.getValue<any>('miaoda.git') || {};
    return { ...SMART_DEFAULTS.git, ...config };
  }

  /**
   * Get AI defaults
   */
  getAIDefaults(): IAIDefaults {
    const config = this.configService.getValue<any>('miaoda.ai') || {};
    return { ...SMART_DEFAULTS.ai, ...config };
  }

  /**
   * Get project defaults
   */
  getProjectDefaults(): IProjectDefaults {
    const config = this.configService.getValue<any>('miaoda.project') || {};
    return { ...SMART_DEFAULTS.project, ...config };
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults(): Promise<void> {
    await this.configService.updateValue('miaoda', SMART_DEFAULTS);
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }
}
