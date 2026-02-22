import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectManager } from '../managers/ProjectManager';

suite('ProjectManager', () => {
  let testDir: string;
  let projectManager: ProjectManager;

  setup(async () => {
    testDir = path.join(__dirname, '../../test-workspace');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    projectManager = new ProjectManager(testDir);
  });

  teardown(async () => {
    if (projectManager) {
      await projectManager.dispose();
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should initialize project manager', async () => {
    await projectManager.initialize();
    const miaodaDir = path.join(testDir, '.miaoda');
    assert.ok(fs.existsSync(miaodaDir), '.miaoda directory should exist');
  });

  test('should create directory structure', async () => {
    await projectManager.initialize();
    const dirs = [
      'history',
      'history/sessions',
      'history/changes',
      'history/snapshots',
      'context',
      'logs',
      'cache',
    ];

    for (const dir of dirs) {
      const dirPath = path.join(testDir, '.miaoda', dir);
      assert.ok(fs.existsSync(dirPath), `${dir} should exist`);
    }
  });

  test('should get project stats', async () => {
    await projectManager.initialize();
    const stats = await projectManager.getProjectStats();
    assert.ok(stats, 'stats should be returned');
    assert.ok(typeof stats.totalFiles === 'number', 'totalFiles should be a number');
    assert.ok(typeof stats.activeTime === 'number', 'activeTime should be a number');
  });

  test('should get storage stats', async () => {
    await projectManager.initialize();
    const stats = await projectManager.getStorageStats();
    assert.ok(stats, 'storage stats should be returned');
    assert.ok(typeof stats.totalSize === 'number', 'totalSize should be a number');
  });
});
