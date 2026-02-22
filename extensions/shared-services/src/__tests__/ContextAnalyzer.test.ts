import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContextAnalyzer,
  getContextAnalyzer,
  resetContextAnalyzer,
} from '../ContextAnalyzer';
import { ContextOptions } from '../IContextAnalyzer';

/**
 * Feature: miaoda-ide, Task: 7.1, 7.3
 * Unit tests for Context Analyzer implementation
 */
describe('ContextAnalyzer', () => {
  let analyzer: ContextAnalyzer;

  beforeEach(() => {
    analyzer = new ContextAnalyzer();
  });

  describe('buildContext', () => {
    it('should build context with active file', async () => {
      const options: ContextOptions = {
        activeFile: 'src/index.ts' as unknown as boolean,
      };

      const context = await analyzer.buildContext(options);

      expect(context.files.length).toBeGreaterThan(0);
      expect(context.files[0].path).toBe('src/index.ts');
      expect(context.files[0].language).toBe('typescript');
      expect(context.files[0].relevance).toBe(1.0);
      expect(context.totalTokens).toBeGreaterThan(0);
    });

    it('should build context with selected code', async () => {
      const options: ContextOptions = {
        selectedCode: 'const x = 42;',
      };

      const context = await analyzer.buildContext(options);

      expect(context.files.length).toBe(1);
      expect(context.files[0].path).toBe('<selection>');
      expect(context.files[0].content).toBe('const x = 42;');
      expect(context.totalTokens).toBeGreaterThan(0);
    });

    it('should build context with referenced files', async () => {
      const options: ContextOptions = {
        referencedFiles: ['src/utils.ts', 'src/types.ts'],
      };

      const context = await analyzer.buildContext(options);

      expect(context.files.length).toBe(2);
      expect(context.files[0].path).toBe('src/utils.ts');
      expect(context.files[1].path).toBe('src/types.ts');
      expect(context.files[0].relevance).toBe(0.8);
    });

    it('should include project info', async () => {
      const options: ContextOptions = {};

      const context = await analyzer.buildContext(options);

      expect(context.projectInfo).toBeDefined();
      expect(context.projectInfo.root).toBeDefined();
      expect(context.projectInfo.languages).toBeDefined();
    });

    it('should respect maxTokens limit', async () => {
      const options: ContextOptions = {
        activeFile: 'src/large-file.ts' as unknown as boolean,
        maxTokens: 100,
      };

      const context = await analyzer.buildContext(options);

      expect(context.totalTokens).toBeLessThanOrEqual(100);
    });
  });

  describe('Property 1: 上下文构建完整性', () => {
    it('should include all specified sources', async () => {
      const options: ContextOptions = {
        activeFile: 'src/index.ts' as unknown as boolean,
        selectedCode: 'const x = 42;',
        referencedFiles: ['src/utils.ts'],
      };

      const context = await analyzer.buildContext(options);

      // Should include active file
      const hasActiveFile = context.files.some((f) => f.path === 'src/index.ts');
      expect(hasActiveFile).toBe(true);

      // Should include selected code
      const hasSelection = context.files.some((f) => f.path === '<selection>');
      expect(hasSelection).toBe(true);

      // Should include referenced files
      const hasReferencedFile = context.files.some((f) => f.path === 'src/utils.ts');
      expect(hasReferencedFile).toBe(true);
    });
  });

  describe('isExcluded', () => {
    it('should exclude node_modules by default', () => {
      expect(analyzer.isExcluded('node_modules/package/index.js')).toBe(true);
    });

    it('should exclude .git by default', () => {
      expect(analyzer.isExcluded('.git/config')).toBe(true);
    });

    it('should exclude .env files by default', () => {
      expect(analyzer.isExcluded('.env')).toBe(true);
      expect(analyzer.isExcluded('.env.local')).toBe(true);
    });

    it('should exclude credential files by default', () => {
      expect(analyzer.isExcluded('credentials.json')).toBe(true);
      expect(analyzer.isExcluded('private.key')).toBe(true);
      expect(analyzer.isExcluded('cert.pem')).toBe(true);
    });

    it('should not exclude normal source files', () => {
      expect(analyzer.isExcluded('src/index.ts')).toBe(false);
      expect(analyzer.isExcluded('README.md')).toBe(false);
    });
  });

  describe('Property 2: 敏感文件排除', () => {
    it('should exclude files matching exclusion rules', () => {
      analyzer.setExclusionRules(['*.secret', 'private/**']);

      expect(analyzer.isExcluded('config.secret')).toBe(true);
      expect(analyzer.isExcluded('private/data.json')).toBe(true);
      expect(analyzer.isExcluded('public/data.json')).toBe(false);
    });

    it('should not include excluded files in context', async () => {
      analyzer.setExclusionRules(['*.secret']);

      const options: ContextOptions = {
        referencedFiles: ['config.secret', 'config.json'],
      };

      const context = await analyzer.buildContext(options);

      const hasSecretFile = context.files.some((f) => f.path === 'config.secret');
      expect(hasSecretFile).toBe(false);

      const hasNormalFile = context.files.some((f) => f.path === 'config.json');
      expect(hasNormalFile).toBe(true);
    });
  });

  describe('setExclusionRules', () => {
    it('should update exclusion rules', () => {
      analyzer.setExclusionRules(['*.test']);

      expect(analyzer.isExcluded('file.test')).toBe(true);
      expect(analyzer.isExcluded('file.ts')).toBe(false);
    });

    it('should replace previous rules', () => {
      analyzer.setExclusionRules(['*.old']);
      expect(analyzer.isExcluded('file.old')).toBe(true);

      analyzer.setExclusionRules(['*.new']);
      expect(analyzer.isExcluded('file.old')).toBe(false);
      expect(analyzer.isExcluded('file.new')).toBe(true);
    });
  });

  describe('getExclusionRules', () => {
    it('should return current exclusion rules', () => {
      const rules = ['*.secret', 'private/**'];
      analyzer.setExclusionRules(rules);

      const retrieved = analyzer.getExclusionRules();
      expect(retrieved).toEqual(rules);
    });

    it('should return a copy of rules', () => {
      analyzer.setExclusionRules(['*.test']);
      const retrieved = analyzer.getExclusionRules();

      // Modifying retrieved should not affect internal rules
      retrieved.push('*.new');
      expect(analyzer.getExclusionRules()).toEqual(['*.test']);
    });
  });

  describe('Language detection', () => {
    it('should detect TypeScript files', async () => {
      const context = await analyzer.buildContext({
        activeFile: 'src/index.ts' as unknown as boolean,
      });

      expect(context.files[0].language).toBe('typescript');
    });

    it('should detect JavaScript files', async () => {
      const context = await analyzer.buildContext({
        activeFile: 'src/index.js' as unknown as boolean,
      });

      expect(context.files[0].language).toBe('javascript');
    });

    it('should detect Python files', async () => {
      const context = await analyzer.buildContext({
        activeFile: 'main.py' as unknown as boolean,
      });

      expect(context.files[0].language).toBe('python');
    });
  });

  describe('Token counting', () => {
    it('should count tokens for context', async () => {
      const context = await analyzer.buildContext({
        selectedCode: 'const x = 42;',
      });

      expect(context.totalTokens).toBeGreaterThan(0);
    });

    it('should accumulate tokens from multiple files', async () => {
      const context = await analyzer.buildContext({
        selectedCode: 'const x = 42;',
        referencedFiles: ['src/utils.ts'],
      });

      expect(context.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getContextAnalyzer();
      const instance2 = getContextAnalyzer();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getContextAnalyzer();
      resetContextAnalyzer();
      const instance2 = getContextAnalyzer();

      expect(instance1).not.toBe(instance2);
    });
  });
});
