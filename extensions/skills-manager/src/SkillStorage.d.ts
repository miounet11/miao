import * as vscode from 'vscode';
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
export declare class SkillStorage {
    private context;
    private skills;
    private storageFile;
    constructor(context: vscode.ExtensionContext);
    /**
     * 加载 Skills
     */
    private loadSkills;
    /**
     * 保存 Skills
     */
    private saveSkills;
    /**
     * 初始化内置 Skills
     */
    private initializeBuiltinSkills;
    /**
     * 创建 Skill
     */
    createSkill(skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Skill;
    /**
     * 获取 Skill
     */
    getSkill(id: string): Skill | undefined;
    /**
     * 获取所有 Skills
     */
    getAllSkills(): Skill[];
    /**
     * 按分类获取 Skills
     */
    getSkillsByCategory(category: Skill['category']): Skill[];
    /**
     * 搜索 Skills
     */
    searchSkills(query: string): Skill[];
    /**
     * 更新 Skill
     */
    updateSkill(id: string, updates: Partial<Skill>): Skill | undefined;
    /**
     * 删除 Skill
     */
    deleteSkill(id: string): boolean;
    /**
     * 增加使用次数
     */
    incrementUsage(id: string): void;
    /**
     * 获取热门 Skills
     */
    getTrendingSkills(limit?: number): Skill[];
    /**
     * 获取最近使用的 Skills
     */
    getRecentSkills(limit?: number): Skill[];
    /**
     * 导出 Skill
     */
    exportSkill(id: string): string | undefined;
    /**
     * 导入 Skill
     */
    importSkill(json: string): Skill | undefined;
    /**
     * 生成 ID
     */
    private generateId;
}
export declare function getSkillStorage(context: vscode.ExtensionContext): SkillStorage;
//# sourceMappingURL=SkillStorage.d.ts.map