/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Miaoda IDE. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Configuration schema for Miaoda smart defaults
 * Used for validation and documentation
 */

export const MIAODA_CONFIGURATION_SCHEMA = {
  'miaoda.editor.fontSize': {
    type: 'number',
    default: 13,
    minimum: 8,
    maximum: 32,
    description: 'Font size for the editor'
  },
  'miaoda.editor.tabSize': {
    type: 'number',
    default: 2,
    minimum: 1,
    maximum: 8,
    description: 'Number of spaces per tab'
  },
  'miaoda.editor.formatOnSave': {
    type: 'boolean',
    default: true,
    description: 'Format code on save'
  },
  'miaoda.editor.autoSave': {
    type: 'string',
    default: 'afterDelay',
    enum: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'],
    description: 'Auto-save behavior'
  },
  'miaoda.editor.minimap': {
    type: 'object',
    default: { enabled: true },
    properties: {
      enabled: {
        type: 'boolean',
        description: 'Enable minimap'
      }
    },
    description: 'Minimap settings'
  },
  'miaoda.editor.wordWrap': {
    type: 'string',
    default: 'on',
    enum: ['off', 'on', 'wordWrapColumn', 'bounded'],
    description: 'Word wrap behavior'
  },
  'miaoda.editor.renderWhitespace': {
    type: 'string',
    default: 'selection',
    enum: ['none', 'boundary', 'selection', 'all'],
    description: 'Render whitespace characters'
  },
  'miaoda.theme.colorTheme': {
    type: 'string',
    default: 'Miaoda Dark',
    description: 'Color theme name'
  },
  'miaoda.theme.autoSwitch': {
    type: 'boolean',
    default: true,
    description: 'Auto-switch theme based on system preference'
  },
  'miaoda.theme.iconTheme': {
    type: 'string',
    default: 'vs-seti',
    description: 'Icon theme name'
  },
  'miaoda.theme.preferDarkMode': {
    type: 'boolean',
    default: true,
    description: 'Prefer dark mode when auto-switching'
  },
  'miaoda.terminal.fontSize': {
    type: 'number',
    default: 12,
    minimum: 8,
    maximum: 32,
    description: 'Terminal font size'
  },
  'miaoda.terminal.shell': {
    type: 'string',
    default: 'auto',
    description: 'Terminal shell (auto for system default)'
  },
  'miaoda.terminal.cursorStyle': {
    type: 'string',
    default: 'line',
    enum: ['block', 'line', 'underline'],
    description: 'Terminal cursor style'
  },
  'miaoda.terminal.cursorBlink': {
    type: 'boolean',
    default: true,
    description: 'Terminal cursor blink'
  },
  'miaoda.terminal.scrollback': {
    type: 'number',
    default: 1000,
    minimum: 100,
    maximum: 10000,
    description: 'Terminal scrollback buffer size'
  },
  'miaoda.git.enabled': {
    type: 'boolean',
    default: true,
    description: 'Enable Git integration'
  },
  'miaoda.git.autoFetch': {
    type: 'boolean',
    default: true,
    description: 'Auto-fetch from remote'
  },
  'miaoda.git.autoPush': {
    type: 'boolean',
    default: false,
    description: 'Auto-push to remote (disabled for safety)'
  },
  'miaoda.git.confirmSync': {
    type: 'boolean',
    default: true,
    description: 'Confirm before syncing'
  },
  'miaoda.git.autoStash': {
    type: 'boolean',
    default: true,
    description: 'Auto-stash changes before sync'
  },
  'miaoda.ai.enabled': {
    type: 'boolean',
    default: true,
    description: 'Enable AI features'
  },
  'miaoda.ai.autoContext': {
    type: 'boolean',
    default: true,
    description: 'Auto-collect context for AI'
  },
  'miaoda.ai.semanticSearch': {
    type: 'boolean',
    default: true,
    description: 'Enable semantic search'
  },
  'miaoda.ai.smartSuggestions': {
    type: 'boolean',
    default: true,
    description: 'Enable smart suggestions'
  },
  'miaoda.ai.codeAnalysis': {
    type: 'boolean',
    default: true,
    description: 'Enable code analysis'
  },
  'miaoda.project.autoInit': {
    type: 'boolean',
    default: true,
    description: 'Auto-initialize .miaoda directory'
  },
  'miaoda.project.trackChanges': {
    type: 'boolean',
    default: true,
    description: 'Track file changes'
  },
  'miaoda.project.autoCompress': {
    type: 'boolean',
    default: true,
    description: 'Auto-compress old data'
  },
  'miaoda.project.autoCleanup': {
    type: 'boolean',
    default: true,
    description: 'Auto-cleanup temporary files'
  },
  'miaoda.project.compressionThreshold': {
    type: 'number',
    default: 2147483648,
    minimum: 104857600,
    description: 'Storage size threshold for compression (bytes)'
  },
  'miaoda.project.compressionAge': {
    type: 'number',
    default: 30,
    minimum: 1,
    maximum: 365,
    description: 'Age threshold for compression (days)'
  }
};

/**
 * Validate configuration value
 */
export function validateConfigValue(key: string, value: any): { valid: boolean; error?: string } {
  const schema = (MIAODA_CONFIGURATION_SCHEMA as any)[key];

  if (!schema) {
    return { valid: false, error: `Unknown configuration key: ${key}` };
  }

  // Type check
  if (typeof value !== schema.type) {
    return { valid: false, error: `Expected ${schema.type}, got ${typeof value}` };
  }

  // Enum check
  if (schema.enum && !schema.enum.includes(value)) {
    return { valid: false, error: `Value must be one of: ${schema.enum.join(', ')}` };
  }

  // Number range check
  if (schema.type === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      return { valid: false, error: `Value must be >= ${schema.minimum}` };
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      return { valid: false, error: `Value must be <= ${schema.maximum}` };
    }
  }

  return { valid: true };
}

/**
 * Get configuration schema for a key
 */
export function getConfigSchema(key: string): any {
  return (MIAODA_CONFIGURATION_SCHEMA as any)[key];
}

/**
 * Get all configuration keys
 */
export function getAllConfigKeys(): string[] {
  return Object.keys(MIAODA_CONFIGURATION_SCHEMA);
}

/**
 * Get configuration keys by category
 */
export function getConfigKeysByCategory(category: 'editor' | 'theme' | 'terminal' | 'git' | 'ai' | 'project'): string[] {
  return getAllConfigKeys().filter(key => key.includes(`miaoda.${category}`));
}
