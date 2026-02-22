import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FileOperationSkill } from '../skills/FileOperationSkill';

suite('FileOperationSkill Test Suite', () => {
  let skill: FileOperationSkill;
  let testDir: string;

  setup(async () => {
    skill = new FileOperationSkill();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-test-'));
  });

  teardown(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should have correct metadata', () => {
    assert.strictEqual(skill.id, 'builtin.file-operation');
    assert.strictEqual(skill.category, 'file');
    assert.ok(skill.parameters.length > 0);
  });

  test('should read a file', async () => {
    const testFile = path.join(testDir, 'test.txt');
    const content = 'Hello, World!';
    await fs.writeFile(testFile, content);

    const result = await skill.execute(
      {
        operation: 'read',
        path: testFile,
      },
      {}
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data?.content, content);
  });

  test('should write a file', async () => {
    const testFile = path.join(testDir, 'write-test.txt');
    const content = 'Test content';

    const result = await skill.execute(
      {
        operation: 'write',
        path: testFile,
        content,
      },
      {}
    );

    assert.strictEqual(result.success, true);

    const fileContent = await fs.readFile(testFile, 'utf8');
    assert.strictEqual(fileContent, content);
  });

  test('should create directories when writing', async () => {
    const testFile = path.join(testDir, 'nested', 'dir', 'test.txt');
    const content = 'Nested file';

    const result = await skill.execute(
      {
        operation: 'write',
        path: testFile,
        content,
      },
      {}
    );

    assert.strictEqual(result.success, true);

    const fileContent = await fs.readFile(testFile, 'utf8');
    assert.strictEqual(fileContent, content);
  });

  test('should delete a file', async () => {
    const testFile = path.join(testDir, 'delete-test.txt');
    await fs.writeFile(testFile, 'To be deleted');

    const result = await skill.execute(
      {
        operation: 'delete',
        path: testFile,
      },
      {}
    );

    assert.strictEqual(result.success, true);

    await assert.rejects(async () => {
      await fs.access(testFile);
    });
  });

  test('should check if file exists', async () => {
    const existingFile = path.join(testDir, 'exists.txt');
    await fs.writeFile(existingFile, 'Exists');

    const result1 = await skill.execute(
      {
        operation: 'exists',
        path: existingFile,
      },
      {}
    );

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.data?.exists, true);

    const result2 = await skill.execute(
      {
        operation: 'exists',
        path: path.join(testDir, 'non-existent.txt'),
      },
      {}
    );

    assert.strictEqual(result2.success, true);
    assert.strictEqual(result2.data?.exists, false);
  });

  test('should list directory contents', async () => {
    await fs.writeFile(path.join(testDir, 'file1.txt'), 'File 1');
    await fs.writeFile(path.join(testDir, 'file2.txt'), 'File 2');
    await fs.mkdir(path.join(testDir, 'subdir'));

    const result = await skill.execute(
      {
        operation: 'list',
        path: testDir,
      },
      {}
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data?.count, 3);
    assert.ok(result.data?.entries.some((e: any) => e.name === 'file1.txt' && e.isFile));
    assert.ok(result.data?.entries.some((e: any) => e.name === 'subdir' && e.isDirectory));
  });

  test('should return error for invalid operation', async () => {
    const result = await skill.execute(
      {
        operation: 'invalid-op',
        path: testDir,
      },
      {}
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'INVALID_OPERATION');
  });

  test('should handle file not found error', async () => {
    const result = await skill.execute(
      {
        operation: 'read',
        path: path.join(testDir, 'non-existent.txt'),
      },
      {}
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'FILE_OPERATION_ERROR');
  });
});
