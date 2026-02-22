import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Skill 定义
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'code' | 'test' | 'refactor' | 'debug' | 'doc' | 'review' | 'other';
  prompt: string;
  example?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  rating?: number;
  author?: string;
}

/**
 * Skill 存储管理器
 * 本地 JSON 文件存储
 */
export class SkillStorage {
  private context: vscode.ExtensionContext;
  private skills: Map<string, Skill> = new Map();
  private storageFile: string;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.storageFile = path.join(
      context.globalStorageUri.fsPath,
      'skills.json'
    );
    this.loadSkills();
  }

  /**
   * 加载 Skills
   */
  private loadSkills(): void {
    try {
      // 确保目录存在
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 加载文件
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf-8');
        const skills: Skill[] = JSON.parse(data);
        skills.forEach((skill) => this.skills.set(skill.id, skill));
      } else {
        // 初始化内置 Skills
        this.initializeBuiltinSkills();
      }
    } catch (error) {
      console.error('Failed to load skills:', error);
      this.initializeBuiltinSkills();
    }
  }

  /**
   * 保存 Skills
   */
  private saveSkills(): void {
    try {
      const skills = Array.from(this.skills.values());
      fs.writeFileSync(this.storageFile, JSON.stringify(skills, null, 2));
    } catch (error) {
      console.error('Failed to save skills:', error);
    }
  }

  /**
   * 初始化内置 Skills
   */
  private initializeBuiltinSkills(): void {
    const builtinSkills: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
      {
        name: 'Generate Function',
        description: '根据描述生成函数',
        category: 'code',
        prompt: 'Generate a function that {{description}}. Include type annotations and JSDoc comments.',
        tags: ['generate', 'function', 'code'],
        author: 'Miaoda',
      },
      {
        name: 'Write Unit Tests',
        description: '为代码生成单元测试',
        category: 'test',
        prompt: 'Write comprehensive unit tests for the following code:\n\n{{code}}\n\nUse Jest/Vitest framework.',
        tags: ['test', 'jest', 'unit-test'],
        author: 'Miaoda',
      },
      {
        name: 'Refactor Code',
        description: '重构代码提升质量',
        category: 'refactor',
        prompt: 'Refactor the following code to improve readability, maintainability, and performance:\n\n{{code}}\n\nExplain the changes made.',
        tags: ['refactor', 'clean-code', 'optimization'],
        author: 'Miaoda',
      },
      {
        name: 'Fix Bug',
        description: '分析并修复 Bug',
        category: 'debug',
        prompt: 'Analyze and fix the bug in the following code:\n\n{{code}}\n\nError: {{error}}\n\nExplain the root cause and the fix.',
        tags: ['debug', 'fix', 'bug'],
        author: 'Miaoda',
      },
      {
        name: 'Generate Documentation',
        description: '生成代码文档',
        category: 'doc',
        prompt: 'Generate comprehensive documentation for the following code:\n\n{{code}}\n\nInclude usage examples and parameter descriptions.',
        tags: ['documentation', 'jsdoc', 'readme'],
        author: 'Miaoda',
      },
      {
        name: 'Code Review',
        description: '代码审查和建议',
        category: 'review',
        prompt: 'Review the following code and provide feedback on:\n1. Code quality\n2. Best practices\n3. Potential bugs\n4. Performance issues\n\n{{code}}',
        tags: ['review', 'quality', 'best-practices'],
        author: 'Miaoda',
      },
      {
        name: 'Explain Code',
        description: '解释代码逻辑',
        category: 'other',
        prompt: 'Explain what the following code does in simple terms:\n\n{{code}}\n\nBreak down the logic step by step.',
        tags: ['explain', 'understand', 'learning'],
        author: 'Miaoda',
      },
      {
        name: 'Optimize Performance',
        description: '优化代码性能',
        category: 'refactor',
        prompt: 'Optimize the performance of the following code:\n\n{{code}}\n\nFocus on time complexity, space complexity, and runtime efficiency.',
        tags: ['optimization', 'performance', 'efficiency'],
        author: 'Miaoda',
      },
      {
        name: 'Add Error Handling',
        description: '添加错误处理',
        category: 'code',
        prompt: 'Add comprehensive error handling to the following code:\n\n{{code}}\n\nInclude try-catch blocks, validation, and meaningful error messages.',
        tags: ['error-handling', 'validation', 'robustness'],
        author: 'Miaoda',
      },
      {
        name: 'Convert to TypeScript',
        description: '将 JavaScript 转换为 TypeScript',
        category: 'refactor',
        prompt: 'Convert the following JavaScript code to TypeScript with proper type annotations:\n\n{{code}}',
        tags: ['typescript', 'conversion', 'types'],
        author: 'Miaoda',
      },
    ];

    builtinSkills.forEach((skill) => {
      this.createSkill(skill);
    });
  }

  /**
   * 创建 Skill
   */
  createSkill(skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Skill {
    const id = this.generateId();
    const now = Date.now();

    const newSkill: Skill = {
      ...skill,
      id,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    this.skills.set(id, newSkill);
    this.saveSkills();

    return newSkill;
  }

  /**
   * 获取 Skill
   */
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * 获取所有 Skills
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 按分类获取 Skills
   */
  getSkillsByCategory(category: Skill['category']): Skill[] {
    return this.getAllSkills().filter((skill) => skill.category === category);
  }

  /**
   * 搜索 Skills
   */
  searchSkills(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllSkills().filter(
      (skill) =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 更新 Skill
   */
  updateSkill(id: string, updates: Partial<Skill>): Skill | undefined {
    const skill = this.skills.get(id);
    if (!skill) {
      return undefined;
    }

    const updatedSkill: Skill = {
      ...skill,
      ...updates,
      id, // 保持 ID 不变
      updatedAt: Date.now(),
    };

    this.skills.set(id, updatedSkill);
    this.saveSkills();

    return updatedSkill;
  }

  /**
   * 删除 Skill
   */
  deleteSkill(id: string): boolean {
    const deleted = this.skills.delete(id);
    if (deleted) {
      this.saveSkills();
    }
    return deleted;
  }

  /**
   * 增加使用次数
   */
  incrementUsage(id: string): void {
    const skill = this.skills.get(id);
    if (skill) {
      skill.usageCount++;
      skill.updatedAt = Date.now();
      this.saveSkills();
    }
  }

  /**
   * 获取热门 Skills
   */
  getTrendingSkills(limit: number = 10): Skill[] {
    return this.getAllSkills()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * 获取最近使用的 Skills
   */
  getRecentSkills(limit: number = 10): Skill[] {
    return this.getAllSkills()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  /**
   * 导出 Skill
   */
  exportSkill(id: string): string | undefined {
    const skill = this.skills.get(id);
    if (!skill) {
      return undefined;
    }
    return JSON.stringify(skill, null, 2);
  }

  /**
   * 导入 Skill
   */
  importSkill(json: string): Skill | undefined {
    try {
      const skill: Skill = JSON.parse(json);
      // 生成新 ID
      skill.id = this.generateId();
      skill.createdAt = Date.now();
      skill.updatedAt = Date.now();
      skill.usageCount = 0;

      this.skills.set(skill.id, skill);
      this.saveSkills();

      return skill;
    } catch (error) {
      console.error('Failed to import skill:', error);
      return undefined;
    }
  }

  /**
   * 生成 ID
   */
  private generateId(): string {
    return `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 单例
 */
let skillStorageInstance: SkillStorage | undefined;

export function getSkillStorage(context: vscode.ExtensionContext): SkillStorage {
  if (!skillStorageInstance) {
    skillStorageInstance = new SkillStorage(context);
  }
  return skillStorageInstance;
}
