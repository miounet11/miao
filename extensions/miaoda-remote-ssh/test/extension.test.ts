import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('miaoda.miaoda-remote-ssh'));
  });

  test('Extension should activate', async () => {
    const ext = vscode.extensions.getExtension('miaoda.miaoda-remote-ssh');
    if (ext) {
      await ext.activate();
      assert.ok(ext.isActive);
    }
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);

    const expectedCommands = [
      'miaoda.remote.addNewSSHHost',
      'miaoda.remote.connectToHost',
      'miaoda.remote.openSSHConfig',
      'miaoda.remote.disconnect',
      'miaoda.remote.refreshTargets',
      'miaoda.remote.openTerminal',
    ];

    for (const cmd of expectedCommands) {
      assert.ok(
        commands.includes(cmd),
        `Command ${cmd} should be registered`
      );
    }
  });

  test('Configuration should be available', () => {
    const config = vscode.workspace.getConfiguration('miaoda.remote.ssh');
    assert.ok(config);

    // Check default values
    const configFile = config.get('configFile');
    assert.strictEqual(configFile, '~/.ssh/config');

    const showLoginTerminal = config.get('showLoginTerminal');
    assert.strictEqual(showLoginTerminal, true);

    const connectTimeout = config.get('connectTimeout');
    assert.strictEqual(connectTimeout, 30000);
  });

  test('Tree view should be registered', () => {
    // This test would need to check if the tree view is properly registered
    // For now, it's a placeholder
    assert.ok(true);
  });
});
