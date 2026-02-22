import * as assert from 'assert';
import { SkillsManager } from '../SkillsManager';
import type { Skill, SkillResult } from '../ISkillsManager';

suite('SkillsManager Test Suite', () => {
  let manager: SkillsManager;

  setup(() => {
    manager = new SkillsManager();
  });

  teardown(() => {
    manager.dispose();
  });

  test('should register a skill', () => {
    const skill = createMockSkill('test-skill');
    manager.registerSkill(skill);

    const retrieved = manager.getSkill('test-skill');
    assert.strictEqual(retrieved?.id, 'test-skill');
  });

  test('should throw error when registering duplicate skill', () => {
    const skill = createMockSkill('test-skill');
    manager.registerSkill(skill);

    assert.throws(() => {
      manager.registerSkill(skill);
    }, /already registered/);
  });

  test('should unregister a skill', () => {
    const skill = createMockSkill('test-skill');
    manager.registerSkill(skill);
    manager.unregisterSkill('test-skill');

    const retrieved = manager.getSkill('test-skill');
    assert.strictEqual(retrieved, undefined);
  });

  test('should throw error when unregistering non-existent skill', () => {
    assert.throws(() => {
      manager.unregisterSkill('non-existent');
    }, /not found/);
  });

  test('should list all skills', () => {
    manager.registerSkill(createMockSkill('skill-1'));
    manager.registerSkill(createMockSkill('skill-2'));
    manager.registerSkill(createMockSkill('skill-3'));

    const skills = manager.listSkills();
    assert.strictEqual(skills.length, 3);
  });

  test('should filter skills by category', () => {
    manager.registerSkill(createMockSkill('skill-1', 'file'));
    manager.registerSkill(createMockSkill('skill-2', 'code'));
    manager.registerSkill(createMockSkill('skill-3', 'file'));

    const fileSkills = manager.listSkills({ category: 'file' });
    assert.strictEqual(fileSkills.length, 2);
  });

  test('should filter skills by tags', () => {
    manager.registerSkill(createMockSkill('skill-1', 'file', ['tag1', 'tag2']));
    manager.registerSkill(createMockSkill('skill-2', 'code', ['tag2', 'tag3']));
    manager.registerSkill(createMockSkill('skill-3', 'file', ['tag3']));

    const tag2Skills = manager.listSkills({ tags: ['tag2'] });
    assert.strictEqual(tag2Skills.length, 2);
  });

  test('should filter skills by search term', () => {
    manager.registerSkill(createMockSkill('file-reader', 'file'));
    manager.registerSkill(createMockSkill('code-analyzer', 'code'));
    manager.registerSkill(createMockSkill('file-writer', 'file'));

    const fileSkills = manager.listSkills({ searchTerm: 'file' });
    assert.strictEqual(fileSkills.length, 2);
  });

  test('should execute a skill successfully', async () => {
    const skill = createMockSkill('test-skill');
    manager.registerSkill(skill);

    const result = await manager.executeSkill('test-skill', { test: 'param' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data?.message, 'executed');
  });

  test('should return error for non-existent skill', async () => {
    const result = await manager.executeSkill('non-existent', {});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'SKILL_NOT_FOUND');
  });

  test('should validate required parameters', async () => {
    const skill: Skill = {
      id: 'test-skill',
      name: 'Test Skill',
      description: 'Test',
      category: 'custom',
      version: '1.0.0',
      parameters: [
        {
          name: 'required-param',
          type: 'string',
          description: 'Required parameter',
          required: true,
        },
      ],
      execute: async () => ({ success: true }),
    };

    manager.registerSkill(skill);

    const result = await manager.executeSkill('test-skill', {});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'MISSING_PARAMETER');
  });

  test('should validate parameter types', async () => {
    const skill: Skill = {
      id: 'test-skill',
      name: 'Test Skill',
      description: 'Test',
      category: 'custom',
      version: '1.0.0',
      parameters: [
        {
          name: 'number-param',
          type: 'number',
          description: 'Number parameter',
          required: true,
        },
      ],
      execute: async () => ({ success: true }),
    };

    manager.registerSkill(skill);

    const result = await manager.executeSkill('test-skill', { 'number-param': 'not-a-number' });
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'INVALID_PARAMETER_TYPE');
  });

  test('should handle skill execution timeout', async () => {
    const skill: Skill = {
      id: 'slow-skill',
      name: 'Slow Skill',
      description: 'Takes too long',
      category: 'custom',
      version: '1.0.0',
      timeout: 100,
      execute: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
      },
    };

    manager.registerSkill(skill);

    const result = await manager.executeSkill('slow-skill', {});
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.message.includes('timeout'));
  });

  test('should emit skill events', done => {
    const skill = createMockSkill('test-skill');

    const subscription = manager.onSkillEvent(event => {
      if (event.type === 'skill:registered') {
        assert.strictEqual(event.skillId, 'test-skill');
        subscription.dispose();
        done();
      }
    });

    manager.registerSkill(skill);
  });

  test('should track execution duration', async () => {
    const skill = createMockSkill('test-skill');
    manager.registerSkill(skill);

    const result = await manager.executeSkill('test-skill', {});
    assert.ok(result.duration !== undefined);
    assert.ok(result.duration! >= 0);
  });
});

// Helper function to create mock skills
function createMockSkill(id: string, category: 'file' | 'code' | 'git' | 'terminal' | 'custom' = 'custom', tags?: string[]): Skill {
  return {
    id,
    name: `Mock Skill ${id}`,
    description: `Mock skill for testing: ${id}`,
    category,
    version: '1.0.0',
    tags,
    execute: async (params: any): Promise<SkillResult> => {
      return {
        success: true,
        data: { message: 'executed', params },
      };
    },
  };
}
