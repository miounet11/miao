import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitOperationSkill } from '../skills/GitOperationSkill';

const execAsync = promisify(exec);

suite('GitOperationSkill Test Suite', () => {
  let skill: GitOperationSkill;
  let testDir: string;

  setup(async () => {
    skill = new GitOperationSkill();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-skill-test-'));

    // Initialize git repo
    await execAsync('git init', { cwd: testDir });
    await execAsync('git config user.email "test@example.com"', { cwd: testDir });
    await execAsync('git config user.name "Test User"', { cwd: testDir });
  });

  teardown(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should have correct metadata', () => {
    assert.strictEqual(skill.id, 'builtin.git-operation');
    assert.strictEqual(skill.category, 'git');
    assert.ok(skill.parameters.length > 0);
  });

  test('should get git status', async () => {
    // Create a file
    await fs.writeFile(path.join(testDir, 'test.txt'), 'test content');

    const result = await skill.execute(
      {
        operation: 'status',
      },
      { workspaceFolder: { uri: { fsPath: testDir } } as any }
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.data?.files.length > 0);
    assert.strictEqual(result.data?.clean, false);
  });

  test('should commit changes', async () => {
    // Create and add a file
    await fs.writeFile(path.join(testDir, 'test.txt'), 'test content');

    const result = await skill.execute(
      {
        operation: 'commit',
        message: 'Test commit',
      },
      { workspaceFolder: { uri: { fsPath: testDir } } as any }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data?.message, 'Test commit');
  });

  test('should list branches', async () => {
    const result = await skill.execute(
      {
        operation: 'branch',
      },
      { workspaceFolder: { uri: { fsPath: testDir } } as any }
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.data?.branches.length > 0);
    assert.ok(result.data?.branches.some((b: any) => b.current));
  });

  test('should create new branch', async () => {
    // Need at least one commit
    await fs.writeFile(path.join(testDir, 'test.txt'), 'test');
    await execAsync('git add . && git commit -m "Initial commit"', { cwd: testDir });

    const result = await skill.execute(
      {
        operation: 'branch',
        branch: 'feature-branch',
        options: { create: true },
      },
      { workspaceFolder: { uri: { fsPath: testDir } } as any }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data?.branch, 'feature-branch');
    assert.strictEqual(result.data?.created, true);
  });

  test('should get git log', async () => {
    // Create a commit
    await fs.writeFile(path.join(testDir, 'test.txt'), 'test');
    await execAsync('git add . && git commit -m "Test commit"', { cwd: testDir });

    const result = await skill.execute(
      {
        operation: 'log',
        options: { limit: 5 },
      },
      { workspaceFolder: { uri: { fsPath: testDir } } as any }
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.data?.commits.length > 0);
    assert.ok(result.data?.commits[0].message.includes('Test commit'));
  });

  test('should get git diff', async () => {
    // Create initial commit
    await fs.writeFile(path.join(testDir, 'test.txt'), 'original');
    await execAsync('git add . && git commit -m "Initial"', { cwd: testDir });

    // Modify file
    await fs.writeFile(path.join(testDir, 'test.txt'), 'modified');

    const result = await skill.execute(
      {
        operation: 'diff',
      },
      { workspaceFolder: { uri: { fsPath: testDir } } as any }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data?.hasChanges, true);
    assert.ok(result.data?.diff.includes('modified'));
  });

  test('should return error for invalid operation', async () => {
    const result = await skill.execute(
      {
        operation: 'invalid-op',
      },
      { workspaceFolder: { uri: { fsPath: testDir } } as any }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'INVALID_OPERATION');
  });

  test('should return error for commit without message', async () => {
    const result = await skill.execute(
      {
        operation: 'commit',
      },
      { workspaceFolder: { uri: { fsPath: testDir } } as any }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'MISSING_MESSAGE');
  });
});
