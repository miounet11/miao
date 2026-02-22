import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { ChangeTracker } from '../trackers/ChangeTracker';
import type { ProjectConfig } from '../types';

suite('ChangeTracker', () => {
  let testDir: string;
  let changeTracker: ChangeTracker;
  let config: ProjectConfig;

  setup(async () => {
    testDir = path.join(__dirname, '../../test-workspace');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    config = {
      projectRoot: testDir,
      miaodaDir: path.join(testDir, '.miaoda'),
      autoInit: true,
      trackChanges: true,
      autoCompress: true,
      autoCleanup: true,
    };

    // Create .miaoda directory
    fs.mkdirSync(config.miaodaDir, { recursive: true });
    fs.mkdirSync(path.join(config.miaodaDir, 'history', 'changes'), { recursive: true });

    changeTracker = new ChangeTracker(config);
    await changeTracker.initialize();
  });

  teardown(async () => {
    if (changeTracker) {
      await changeTracker.dispose();
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should track file changes', async () => {
    const testFile = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFile, 'test content');

    await changeTracker.trackChange(testFile);
    const changes = await changeTracker.getAllChanges();

    assert.ok(changes.length > 0, 'should have tracked changes');
  });

  test('should get recent changes', async () => {
    const testFile = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFile, 'test content');
    await changeTracker.trackChange(testFile);

    const recent = await changeTracker.getRecentChanges(10);
    assert.ok(recent.length > 0, 'should return recent changes');
  });

  test('should get changes for date', async () => {
    const testFile = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFile, 'test content');
    await changeTracker.trackChange(testFile);

    const today = new Date();
    const changes = await changeTracker.getChangesForDate(today);
    assert.ok(changes.length > 0, 'should return changes for today');
  });
});
