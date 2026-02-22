import * as assert from 'assert';
import { TerminalSkill } from '../skills/TerminalSkill';

suite('TerminalSkill Test Suite', () => {
  let skill: TerminalSkill;

  setup(() => {
    skill = new TerminalSkill();
  });

  test('should have correct metadata', () => {
    assert.strictEqual(skill.id, 'builtin.terminal');
    assert.strictEqual(skill.category, 'terminal');
    assert.ok(skill.parameters.length > 0);
  });

  test('should execute simple command', async () => {
    const result = await skill.execute(
      {
        command: 'echo "Hello, World!"',
      },
      {}
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.data?.stdout.includes('Hello, World!'));
    assert.strictEqual(result.data?.exitCode, 0);
  });

  test('should execute command with working directory', async () => {
    const result = await skill.execute(
      {
        command: 'pwd',
        cwd: '/tmp',
      },
      {}
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.data?.stdout.includes('/tmp'));
  });

  test('should execute command with environment variables', async () => {
    const result = await skill.execute(
      {
        command: 'echo $TEST_VAR',
        env: { TEST_VAR: 'test-value' },
      },
      {}
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.data?.stdout.includes('test-value'));
  });

  test('should handle command failure', async () => {
    const result = await skill.execute(
      {
        command: 'exit 1',
      },
      {}
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'COMMAND_EXECUTION_ERROR');
  });

  test('should handle non-existent command', async () => {
    const result = await skill.execute(
      {
        command: 'this-command-does-not-exist-12345',
      },
      {}
    );

    assert.strictEqual(result.success, false);
  });

  test('should track execution duration', async () => {
    const result = await skill.execute(
      {
        command: 'echo "test"',
      },
      {}
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.data?.duration !== undefined);
    assert.ok(result.data?.duration >= 0);
  });

  test('should handle command timeout', async () => {
    const result = await skill.execute(
      {
        command: 'sleep 10',
        timeout: 100,
      },
      {}
    );

    assert.strictEqual(result.success, false);
  });

  test('should capture stderr', async () => {
    const result = await skill.execute(
      {
        command: 'echo "error message" >&2',
      },
      {}
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.data?.stderr.includes('error message'));
  });
});
