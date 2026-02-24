"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillRecommender = exports.RecommendationScenario = void 0;
exports.getSkillRecommender = getSkillRecommender;
const vscode = __importStar(require("vscode"));
const EventBus_1 = require("../../shared-services/src/EventBus");
/**
 * 推荐场景
 */
var RecommendationScenario;
(function (RecommendationScenario) {
    RecommendationScenario["AUTHENTICATION"] = "authentication";
    RecommendationScenario["API_DEVELOPMENT"] = "api_development";
    RecommendationScenario["TESTING"] = "testing";
    RecommendationScenario["REFACTORING"] = "refactoring";
    RecommendationScenario["DEBUGGING"] = "debugging";
    RecommendationScenario["DOCUMENTATION"] = "documentation";
    RecommendationScenario["COMMIT"] = "commit";
    RecommendationScenario["DEPLOYMENT"] = "deployment";
})(RecommendationScenario || (exports.RecommendationScenario = RecommendationScenario = {}));
/**
 * Skill 推荐引擎
 */
class SkillRecommender {
    contextHistory = [];
    maxHistorySize = 50;
    skillUsageStats = new Map();
    constructor() {
        this.setupEventListeners();
    }
    /**
     * 分析当前上下文
     */
    async analyzeContext() {
        const editor = vscode.window.activeTextEditor;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const context = {
            recentFiles: await this.getRecentFiles(),
            recentCommands: await this.getRecentCommands(),
            currentFile: editor?.document.uri.fsPath,
            selectedText: editor?.document.getText(editor.selection),
            timeOfDay: this.getTimeOfDay(),
            projectType: await this.detectProjectType(),
        };
        // 获取 Git 状态
        if (workspaceFolder) {
            context.gitStatus = await this.getGitStatus(workspaceFolder.uri.fsPath);
        }
        // 分析代码指标
        if (editor) {
            context.codeMetrics = await this.analyzeCodeMetrics(editor.document);
        }
        // 保存到历史
        this.contextHistory.push(context);
        if (this.contextHistory.length > this.maxHistorySize) {
            this.contextHistory.shift();
        }
        return context;
    }
    /**
     * 推荐 Skills
     */
    async recommendSkills(context) {
        const ctx = context || (await this.analyzeContext());
        const recommendations = [];
        // 场景检测
        const scenarios = this.detectScenarios(ctx);
        for (const scenario of scenarios) {
            const scenarioRecs = this.getScenarioRecommendations(scenario, ctx);
            recommendations.push(...scenarioRecs);
        }
        // 基于使用历史推荐
        const historyRecs = this.getHistoryBasedRecommendations(ctx);
        recommendations.push(...historyRecs);
        // 去重并排序
        const uniqueRecs = this.deduplicateRecommendations(recommendations);
        return uniqueRecs.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return b.confidence - a.confidence;
        });
    }
    /**
     * 检测场景
     */
    detectScenarios(context) {
        const scenarios = [];
        // 认证场景
        if (this.hasAuthFiles(context.recentFiles)) {
            scenarios.push(RecommendationScenario.AUTHENTICATION);
        }
        // API 开发场景
        if (this.hasApiFiles(context.recentFiles)) {
            scenarios.push(RecommendationScenario.API_DEVELOPMENT);
        }
        // 测试场景
        if (context.gitStatus?.hasUntestedCode || context.codeMetrics?.testCoverage < 70) {
            scenarios.push(RecommendationScenario.TESTING);
        }
        // 重构场景
        if (context.codeMetrics?.complexity > 10 ||
            context.codeMetrics?.duplicateLines > 50) {
            scenarios.push(RecommendationScenario.REFACTORING);
        }
        // 调试场景
        if (this.hasErrorLogs(context.recentCommands)) {
            scenarios.push(RecommendationScenario.DEBUGGING);
        }
        // 文档场景
        if (this.needsDocumentation(context)) {
            scenarios.push(RecommendationScenario.DOCUMENTATION);
        }
        // 提交场景
        if (context.gitStatus?.hasUncommittedChanges) {
            scenarios.push(RecommendationScenario.COMMIT);
        }
        return scenarios;
    }
    /**
     * 获取场景推荐
     */
    getScenarioRecommendations(scenario, context) {
        const recommendations = [];
        switch (scenario) {
            case RecommendationScenario.AUTHENTICATION:
                recommendations.push({
                    skillName: '/security-audit',
                    reason: '检测到认证相关代码，建议进行安全审计',
                    confidence: 0.9,
                    priority: 5,
                    icon: '🔒',
                    quickAction: '立即审计',
                }, {
                    skillName: '/api-test',
                    reason: '为认证 API 生成测试用例',
                    confidence: 0.85,
                    priority: 4,
                    icon: '🧪',
                });
                break;
            case RecommendationScenario.API_DEVELOPMENT:
                recommendations.push({
                    skillName: '/api-crud',
                    reason: '快速生成 CRUD API',
                    confidence: 0.8,
                    priority: 4,
                    icon: '⚡',
                }, {
                    skillName: '/api-docs',
                    reason: '自动生成 API 文档',
                    confidence: 0.75,
                    priority: 3,
                    icon: '📖',
                });
                break;
            case RecommendationScenario.TESTING:
                recommendations.push({
                    skillName: '/tdd',
                    reason: `测试覆盖率仅 ${context.codeMetrics?.testCoverage || 0}%，建议补充测试`,
                    confidence: 0.95,
                    priority: 5,
                    icon: '🧪',
                    quickAction: '生成测试',
                }, {
                    skillName: '/test-coverage',
                    reason: '分析测试覆盖率',
                    confidence: 0.8,
                    priority: 3,
                    icon: '📊',
                });
                break;
            case RecommendationScenario.REFACTORING:
                recommendations.push({
                    skillName: '/refactor',
                    reason: `代码复杂度 ${context.codeMetrics?.complexity}，建议重构`,
                    confidence: 0.9,
                    priority: 4,
                    icon: '🔧',
                    quickAction: '开始重构',
                }, {
                    skillName: '/simplify',
                    reason: '简化复杂逻辑',
                    confidence: 0.85,
                    priority: 4,
                    icon: '✨',
                });
                break;
            case RecommendationScenario.DEBUGGING:
                recommendations.push({
                    skillName: '/debug',
                    reason: '检测到错误日志，启动调试流程',
                    confidence: 0.95,
                    priority: 5,
                    icon: '🐛',
                    quickAction: '开始调试',
                });
                break;
            case RecommendationScenario.DOCUMENTATION:
                recommendations.push({
                    skillName: '/docs',
                    reason: '代码缺少文档注释',
                    confidence: 0.7,
                    priority: 3,
                    icon: '📖',
                });
                break;
            case RecommendationScenario.COMMIT:
                recommendations.push({
                    skillName: '/commit',
                    reason: '有未提交的更改，生成提交信息',
                    confidence: 0.9,
                    priority: 4,
                    icon: '📝',
                    quickAction: '智能提交',
                }, {
                    skillName: '/review',
                    reason: '提交前进行代码审查',
                    confidence: 0.8,
                    priority: 3,
                    icon: '👀',
                });
                break;
        }
        return recommendations;
    }
    /**
     * 基于历史的推荐
     */
    getHistoryBasedRecommendations(context) {
        const recommendations = [];
        // 找出最常用的 skills
        const topSkills = Array.from(this.skillUsageStats.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        for (const [skill, count] of topSkills) {
            if (count > 5) {
                recommendations.push({
                    skillName: skill,
                    reason: `你经常使用此 skill（${count} 次）`,
                    confidence: 0.6,
                    priority: 2,
                    icon: '⭐',
                });
            }
        }
        return recommendations;
    }
    /**
     * 去重推荐
     */
    deduplicateRecommendations(recommendations) {
        const seen = new Map();
        for (const rec of recommendations) {
            const existing = seen.get(rec.skillName);
            if (!existing || rec.confidence > existing.confidence) {
                seen.set(rec.skillName, rec);
            }
        }
        return Array.from(seen.values());
    }
    /**
     * 记录 Skill 使用
     */
    recordSkillUsage(skillName) {
        const count = this.skillUsageStats.get(skillName) || 0;
        this.skillUsageStats.set(skillName, count + 1);
    }
    /**
     * 辅助方法
     */
    async getRecentFiles() {
        // TODO: 从 VSCode API 获取最近打开的文件
        return [];
    }
    async getRecentCommands() {
        // TODO: 从命令历史获取
        return [];
    }
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 6)
            return 'night';
        if (hour < 12)
            return 'morning';
        if (hour < 18)
            return 'afternoon';
        return 'evening';
    }
    async detectProjectType() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder)
            return undefined;
        // 检查 package.json
        try {
            const packageJson = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(workspaceFolder.uri, 'package.json'));
            const pkg = JSON.parse(packageJson.toString());
            if (pkg.dependencies?.react)
                return 'react';
            if (pkg.dependencies?.vue)
                return 'vue';
            if (pkg.dependencies?.next)
                return 'nextjs';
        }
        catch {
            // Ignore
        }
        return undefined;
    }
    async getGitStatus(workspaceRoot) {
        // TODO: 实现 Git 状态检查
        return {
            hasUncommittedChanges: false,
            hasUntestedCode: false,
            branch: 'main',
        };
    }
    async analyzeCodeMetrics(document) {
        // 简单的代码指标分析
        const text = document.getText();
        const lines = text.split('\n');
        return {
            complexity: this.calculateComplexity(text),
            duplicateLines: 0, // TODO: 实现重复行检测
            testCoverage: 0, // TODO: 从测试报告获取
        };
    }
    calculateComplexity(code) {
        // 简化的圈复杂度计算
        const keywords = ['if', 'else', 'for', 'while', 'case', '&&', '||'];
        let complexity = 1;
        for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            const matches = code.match(regex);
            if (matches) {
                complexity += matches.length;
            }
        }
        return complexity;
    }
    hasAuthFiles(files) {
        return files.some((f) => f.includes('auth') ||
            f.includes('login') ||
            f.includes('jwt') ||
            f.includes('session'));
    }
    hasApiFiles(files) {
        return files.some((f) => f.includes('api') ||
            f.includes('route') ||
            f.includes('controller') ||
            f.includes('endpoint'));
    }
    hasErrorLogs(commands) {
        return commands.some((c) => c.includes('error') || c.includes('debug'));
    }
    needsDocumentation(context) {
        // 简化判断：如果是新文件或代码量大但注释少
        return false; // TODO: 实现文档需求检测
    }
    setupEventListeners() {
        const eventBus = (0, EventBus_1.getEventBus)();
        eventBus.on('skill.executed', (data) => {
            this.recordSkillUsage(data.skillName);
        });
    }
}
exports.SkillRecommender = SkillRecommender;
/**
 * 单例
 */
let recommenderInstance;
function getSkillRecommender() {
    if (!recommenderInstance) {
        recommenderInstance = new SkillRecommender();
    }
    return recommenderInstance;
}
//# sourceMappingURL=SkillRecommender.js.map