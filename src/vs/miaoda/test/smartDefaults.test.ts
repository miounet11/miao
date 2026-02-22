/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Miaoda IDE. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { SmartDefaults, SMART_DEFAULTS } from 'vs/miaoda/common/smartDefaults';

class MockConfigurationService {
  private config: any = {};

  getValue<T>(section?: string): T {
    if (!section) {
      return this.config as T;
    }
    return this.config[section] as T;
  }

  async updateValue(key: string, value: any): Promise<void> {
    this.config[key] = value;
  }
}

suite('SmartDefaults', () => {
  let smartDefaults: SmartDefaults;
  let configService: MockConfigurationService;

  setup(() => {
    configService = new MockConfigurationService();
    smartDefaults = new SmartDefaults(configService as any);
  });

  test('should have valid default values', () => {
    assert.strictEqual(SMART_DEFAULTS.editor.fontSize, 13);
    assert.strictEqual(SMART_DEFAULTS.editor.tabSize, 2);
    assert.strictEqual(SMART_DEFAULTS.editor.formatOnSave, true);
    assert.strictEqual(SMART_DEFAULTS.theme.colorTheme, 'Miaoda Dark');
    assert.strictEqual(SMART_DEFAULTS.git.enabled, true);
    assert.strictEqual(SMART_DEFAULTS.ai.enabled, true);
  });

  test('should get editor defaults', () => {
    const defaults = smartDefaults.getEditorDefaults();
    assert.strictEqual(defaults.fontSize, 13);
    assert.strictEqual(defaults.tabSize, 2);
    assert.strictEqual(defaults.formatOnSave, true);
  });

  test('should get theme defaults', () => {
    const defaults = smartDefaults.getThemeDefaults();
    assert.strictEqual(defaults.colorTheme, 'Miaoda Dark');
    assert.strictEqual(defaults.autoSwitch, true);
  });

  test('should get terminal defaults', () => {
    const defaults = smartDefaults.getTerminalDefaults();
    assert.strictEqual(defaults.fontSize, 12);
    assert.strictEqual(defaults.cursorBlink, true);
  });

  test('should get git defaults', () => {
    const defaults = smartDefaults.getGitDefaults();
    assert.strictEqual(defaults.enabled, true);
    assert.strictEqual(defaults.autoFetch, true);
    assert.strictEqual(defaults.autoPush, false);
  });

  test('should get AI defaults', () => {
    const defaults = smartDefaults.getAIDefaults();
    assert.strictEqual(defaults.enabled, true);
    assert.strictEqual(defaults.autoContext, true);
  });

  test('should get project defaults', () => {
    const defaults = smartDefaults.getProjectDefaults();
    assert.strictEqual(defaults.autoInit, true);
    assert.strictEqual(defaults.trackChanges, true);
    assert.strictEqual(defaults.compressionThreshold, 2 * 1024 * 1024 * 1024);
  });
});
