/**
 * Miaoda API
 * 统一的扩展间通信接口
 */
import * as vscode from 'vscode';
/**
 * API 版本
 */
export declare const API_VERSION = "0.1.0";
/**
 * Miaoda 扩展 API 接口
 */
export interface MiaodaAPI {
    version: string;
    aiManager?: AIManagerAPI;
    quotaBar?: QuotaBarAPI;
    skillsManager?: SkillsManagerAPI;
    projectManager?: ProjectManagerAPI;
}
/**
 * AI Manager API
 */
export interface AIManagerAPI {
    /**
     * 完成文本生成
     */
    complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse>;
    /**
     * 获取当前模型
     */
    getCurrentModel(): AIModel | null;
    /**
     * 设置当前模型
     */
    setCurrentModel(modelId: string): void;
    /**
     * 获取所有模型
     */
    getAllModels(): AIModel[];
    /**
     * 获取官方模型
     */
    getOfficialModels(): AIModel[];
    /**
     * 获取自定义模型
     */
    getCustomModels(): AIModel[];
    /**
     * 添加自定义模型
     */
    addCustomModel(config: CustomModelConfig): Promise<string>;
    /**
     * 删除自定义模型
     */
    removeCustomModel(modelId: string): Promise<boolean>;
}
/**
 * Quota Bar API
 */
export interface QuotaBarAPI {
    /**
     * 消费额度
     */
    consume(amount: number): Promise<boolean>;
    /**
     * 获取当前额度
     */
    getCurrentQuota(): number;
    /**
     * 获取总额度
     */
    getTotalQuota(): number;
    /**
     * 显示额度详情
     */
    showDetails(): Promise<void>;
    /**
     * 刷新额度
     */
    refresh(): Promise<void>;
}
/**
 * Skills Manager API
 */
export interface SkillsManagerAPI {
    /**
     * 注册 Skill
     */
    registerSkill(skill: Skill): void;
    /**
     * 获取 Skill
     */
    getSkill(skillId: string): Skill | undefined;
    /**
     * 列出所有 Skill
     */
    listSkills(): Skill[];
    /**
     * 执行 Skill
     */
    executeSkill(skillId: string, params: any, context?: SkillExecutionContext): Promise<SkillExecutionResult>;
    /**
     * 监听 Skill 事件
     */
    onSkillEvent(listener: (event: SkillEvent) => void): vscode.Disposable;
}
/**
 * Project Manager API
 */
export interface ProjectManagerAPI {
    /**
     * 获取项目统计
     */
    getProjectStats(): Promise<ProjectStats>;
    /**
     * 获取存储统计
     */
    getStorageStats(): Promise<StorageStats>;
    /**
     * 获取最近变更
     */
    getRecentChanges(limit: number): Promise<FileChange[]>;
    /**
     * 优化存储
     */
    optimizeStorage(): Promise<void>;
}
/**
 * AI 模型
 */
export interface AIModel {
    id: string;
    name: string;
    provider: 'claude' | 'openai' | 'custom';
    model: string;
    isOfficial: boolean;
    maxTokens?: number;
    temperature?: number;
}
/**
 * 自定义模型配置
 */
export interface CustomModelConfig {
    name: string;
    provider: 'claude' | 'openai';
    apiKey: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
}
/**
 * 完成选项
 */
export interface CompletionOptions {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
}
/**
 * 完成响应
 */
export interface CompletionResponse {
    content: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
/**
 * Skill 定义
 */
export interface Skill {
    id: string;
    name: string;
    description: string;
    version: string;
    category: string;
    author?: string;
    tags?: string[];
    parameters?: SkillParameter[];
    execute: (params: any, context: SkillExecutionContext) => Promise<SkillExecutionResult>;
}
/**
 * Skill 参数
 */
export interface SkillParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required: boolean;
    default?: any;
}
/**
 * Skill 执行上下文
 */
export interface SkillExecutionContext {
    workspaceFolder?: vscode.WorkspaceFolder;
    cancellationToken?: vscode.CancellationToken;
}
/**
 * Skill 执行结果
 */
export interface SkillExecutionResult {
    success: boolean;
    data?: any;
    error?: Error;
    duration: number;
}
/**
 * Skill 事件
 */
export interface SkillEvent {
    type: 'registered' | 'executed' | 'failed';
    skillId: string;
    timestamp: number;
    data?: any;
}
/**
 * 文件变更
 */
export interface FileChange {
    file: string;
    timestamp: number;
    type: 'create' | 'modify' | 'delete' | 'rename';
    diff: {
        added: number;
        removed: number;
        content?: string;
    };
}
/**
 * 项目统计
 */
export interface ProjectStats {
    totalFiles: number;
    totalChanges: number;
    activeTime: number;
    lastModified: number;
    storageUsed: StorageStats;
}
/**
 * 存储统计
 */
export interface StorageStats {
    totalSize: number;
    historySize: number;
    contextSize: number;
    logsSize: number;
    cacheSize: number;
    lastUpdated: number;
}
/**
 * 扩展消息
 */
export interface ExtensionMessage<T = any> {
    id: string;
    type: string;
    payload: T;
    timestamp: number;
    sender: string;
    receiver?: string;
}
/**
 * 获取 Miaoda API
 */
export declare function getMiaodaAPI(): Promise<MiaodaAPI | null>;
/**
 * 创建扩展消息
 */
export declare function createMessage<T>(type: string, payload: T, sender: string, receiver?: string): ExtensionMessage<T>;
//# sourceMappingURL=index.d.ts.map