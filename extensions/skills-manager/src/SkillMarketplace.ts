import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Skill 包格式
 */
export interface SkillPackage {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  tags: string[];
  category: SkillCategory;
  metadata: SkillMetadata;
  content: SkillContent;
}

export enum SkillCategory {
  CODE_GENERATION = 'code_generation',
  TESTING = 'testing',
  REFACTORING = 'refactoring',
  DOCUMENTATION = 'documentation',
  DEBUGGING = 'debugging',
  DEPLOYMENT = 'deployment',
  WORKFLOW = 'workflow',
  CUSTOM = 'custom',
}

export interface SkillMetadata {
  usageCount: number;
  rating: number; // 0-5
  ratingCount: number;
  downloads: number;
  createdAt: number;
  updatedAt: number;
  featured: boolean;
}

export interface SkillContent {
  prompt: string;
  steps?: string[];
  examples?: string[];
  dependencies?: string[];
}

/**
 * Trending Skill
 */
export interface TrendingSkill {
  skill: SkillPackage;
  trendScore: number;
  growthRate: number;
}

/**
 * Skill 市场
 */
export class SkillMarketplace {
  private localRepository: string;
  private skills: Map<string, SkillPackage> = new Map();
  private usageStats: Map<string, number> = new Map();

  constructor(context: vscode.ExtensionContext) {
    this.localRepository = path.join(context.globalStorageUri.fsPath, 'skills');
    this.ensureRepositoryExists();
    this.loadLocalSkills();
  }

  /**
   * 确保仓库目录存在
   */
  private ensureRepositoryExists(): void {
    if (!fs.existsSync(this.localRepository)) {
      fs.mkdirSync(this.localRepository, { recursive: true });
    }
  }

  /**
   * 加载本地 Skills
   */
  private loadLocalSkills(): void {
    try {
      const files = fs.readdirSync(this.localRepository);
      for (const file of files) {
        if (file.endsWith('.skill.json')) {
          const filePath = path.join(this.localRepository, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const skill: SkillPackage = JSON.parse(content);
          this.skills.set(skill.id, skill);
        }
      }
    } catch (error) {
      console.error('Failed to load local skills:', error);
    }
  }

  /**
   * 导出 Skill
   */
  async exportSkill(skillId: string): Promise<string | undefined> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return undefined;
    }

    const fileName = `${skill.id}.skill.json`;
    const filePath = path.join(this.localRepository, fileName);

    try {
      fs.writeFileSync(filePath, JSON.stringify(skill, null, 2), 'utf-8');
      return filePath;
    } catch (error) {
      console.error('Failed to export skill:', error);
      return undefined;
    }
  }

  /**
   * 导入 Skill
   */
  async importSkill(filePath: string): Promise<SkillPackage | undefined> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const skill: SkillPackage = JSON.parse(content);

      // 验证 Skill 格式
      if (!this.validateSkill(skill)) {
        throw new Error('Invalid skill format');
      }

      // 保存到本地仓库
      this.skills.set(skill.id, skill);
      await this.exportSkill(skill.id);

      return skill;
    } catch (error) {
      console.error('Failed to import skill:', error);
      return undefined;
    }
  }

  /**
   * 验证 Skill 格式
   */
  private validateSkill(skill: any): skill is SkillPackage {
    return (
      typeof skill.id === 'string' &&
      typeof skill.name === 'string' &&
      typeof skill.version === 'string' &&
      typeof skill.description === 'string' &&
      typeof skill.content === 'object' &&
      typeof skill.content.prompt === 'string'
    );
  }

  /**
   * 发布到市场
   */
  async publishToMarketplace(skill: SkillPackage): Promise<boolean> {
    // TODO: 实现发布到远程市场
    // 1. 验证 Skill
    // 2. 上传到服务器
    // 3. 更新元数据

    // 暂时只保存到本地
    this.skills.set(skill.id, skill);
    await this.exportSkill(skill.id);
    return true;
  }

  /**
   * 搜索 Skills
   */
  searchSkills(query: string): SkillPackage[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.skills.values()).filter(
      (skill) =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 按分类获取 Skills
   */
  getSkillsByCategory(category: SkillCategory): SkillPackage[] {
    return Array.from(this.skills.values()).filter((skill) => skill.category === category);
  }

  /**
   * 获取 Trending Skills
   */
  getTrendingSkills(limit: number = 10): TrendingSkill[] {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const trending = Array.from(this.skills.values())
      .map((skill) => {
        // 计算趋势分数
        const recentUsage = this.usageStats.get(skill.id) || 0;
        const ageInDays = (now - skill.metadata.createdAt) / (24 * 60 * 60 * 1000);
        const isRecent = skill.metadata.createdAt > oneWeekAgo;

        // 趋势分数 = 使用次数 * 评分 * 新鲜度加成
        const freshnessBonus = isRecent ? 2 : 1;
        const trendScore =
          skill.metadata.usageCount * skill.metadata.rating * freshnessBonus;

        // 增长率（简化计算）
        const growthRate = recentUsage / Math.max(1, ageInDays);

        return {
          skill,
          trendScore,
          growthRate,
        };
      })
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);

    return trending;
  }

  /**
   * 获取推荐 Skills（基于用户使用历史）
   */
  getRecommendedSkills(userHistory: string[], limit: number = 5): SkillPackage[] {
    // 简单的协同过滤推荐
    const userCategories = new Set<SkillCategory>();
    const userTags = new Set<string>();

    // 分析用户历史
    for (const skillId of userHistory) {
      const skill = this.skills.get(skillId);
      if (skill) {
        userCategories.add(skill.category);
        skill.tags.forEach((tag) => userTags.add(tag));
      }
    }

    // 推荐相似的 Skills
    const recommendations = Array.from(this.skills.values())
      .filter((skill) => !userHistory.includes(skill.id))
      .map((skill) => {
        let score = 0;

        // 相同分类加分
        if (userCategories.has(skill.category)) {
          score += 3;
        }

        // 相同标签加分
        const commonTags = skill.tags.filter((tag) => userTags.has(tag)).length;
        score += commonTags * 2;

        // 高评分加分
        score += skill.metadata.rating;

        // 热门加分
        if (skill.metadata.usageCount > 100) {
          score += 2;
        }

        return { skill, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.skill);

    return recommendations;
  }

  /**
   * 记录使用
   */
  recordUsage(skillId: string): void {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.metadata.usageCount++;
      const currentUsage = this.usageStats.get(skillId) || 0;
      this.usageStats.set(skillId, currentUsage + 1);
    }
  }

  /**
   * 评分
   */
  rateSkill(skillId: string, rating: number): boolean {
    const skill = this.skills.get(skillId);
    if (!skill || rating < 0 || rating > 5) {
      return false;
    }

    const totalRating = skill.metadata.rating * skill.metadata.ratingCount;
    skill.metadata.ratingCount++;
    skill.metadata.rating = (totalRating + rating) / skill.metadata.ratingCount;

    return true;
  }

  /**
   * 获取所有 Skills
   */
  getAllSkills(): SkillPackage[] {
    return Array.from(this.skills.values());
  }

  /**
   * 获取 Skill
   */
  getSkill(skillId: string): SkillPackage | undefined {
    return this.skills.get(skillId);
  }

  /**
   * 创建 Skill 包
   */
  createSkillPackage(
    name: string,
    description: string,
    prompt: string,
    category: SkillCategory,
    tags: string[] = []
  ): SkillPackage {
    const id = this.generateSkillId(name);
    const now = Date.now();

    return {
      id,
      name,
      version: '1.0.0',
      description,
      author: 'user', // TODO: 从用户配置获取
      tags,
      category,
      metadata: {
        usageCount: 0,
        rating: 0,
        ratingCount: 0,
        downloads: 0,
        createdAt: now,
        updatedAt: now,
        featured: false,
      },
      content: {
        prompt,
      },
    };
  }

  /**
   * 生成 Skill ID
   */
  private generateSkillId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * 初始化内置 Skills
   */
  initializeBuiltinSkills(): void {
    const builtinSkills: Partial<SkillPackage>[] = [
      {
        name: 'React Component',
        description: '快速生成 React 组件',
        category: SkillCategory.CODE_GENERATION,
        tags: ['react', 'component', 'typescript'],
        content: {
          prompt: '生成一个 React 组件，包含 TypeScript 类型定义和基本样式',
        },
      },
      {
        name: 'API CRUD',
        description: '生成完整的 CRUD API',
        category: SkillCategory.CODE_GENERATION,
        tags: ['api', 'crud', 'rest'],
        content: {
          prompt: '生成 RESTful CRUD API，包含路由、控制器和数据验证',
        },
      },
      {
        name: 'Unit Tests',
        description: '自动生成单元测试',
        category: SkillCategory.TESTING,
        tags: ['test', 'jest', 'vitest'],
        content: {
          prompt: '为选中的代码生成完整的单元测试，覆盖所有边界情况',
        },
      },
      {
        name: 'Refactor Extract',
        description: '提取重复代码',
        category: SkillCategory.REFACTORING,
        tags: ['refactor', 'dry', 'clean-code'],
        content: {
          prompt: '识别并提取重复代码为可复用函数或组件',
        },
      },
      {
        name: 'Debug Assistant',
        description: '智能调试助手',
        category: SkillCategory.DEBUGGING,
        tags: ['debug', 'error', 'troubleshoot'],
        content: {
          prompt: '分析错误日志，定位问题根源，提供修复方案',
        },
      },
    ];

    for (const skillData of builtinSkills) {
      const skill = this.createSkillPackage(
        skillData.name!,
        skillData.description!,
        skillData.content!.prompt,
        skillData.category!,
        skillData.tags
      );
      skill.metadata.featured = true;
      this.skills.set(skill.id, skill);
    }
  }
}

/**
 * 单例
 */
let marketplaceInstance: SkillMarketplace | undefined;

export function getSkillMarketplace(context: vscode.ExtensionContext): SkillMarketplace {
  if (!marketplaceInstance) {
    marketplaceInstance = new SkillMarketplace(context);
    marketplaceInstance.initializeBuiltinSkills();
  }
  return marketplaceInstance;
}
