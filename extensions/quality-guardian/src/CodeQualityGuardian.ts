import * as vscode from 'vscode';

/**
 * 代码质量守护系统
 * 多层质量检查 + 自动修复 + 质量评分
 */
export class CodeQualityGuardian {
  private staticAnalyzer: StaticAnalyzer;
  private aiReviewer: AIReviewer;
  private autoFixer: AutoFixer;
  private qualityScorer: QualityScorer;

  constructor(private context: vscode.ExtensionContext) {
    this.staticAnalyzer = new StaticAnalyzer();
    this.aiReviewer = new AIReviewer();
    this.autoFixer = new AutoFixer();
    this.qualityScorer = new QualityScorer(context);
  }

  /**
   * Layer 1: 静态分析
   */
  async staticAnalysis(document: vscode.TextDocument): Promise<Issue[]> {
    const issues: Issue[] = [];

    // 1. ESLint 检查
    const lintIssues = await this.staticAnalyzer.runESLint(document);
    issues.push(...lintIssues);

    // 2. TypeScript 类型检查
    if (document.languageId === 'typescript' || document.languageId === 'typescriptreact') {
      const typeIssues = await this.staticAnalyzer.runTypeCheck(document);
      issues.push(...typeIssues);
    }

    // 3. 安全扫描
    const securityIssues = await this.staticAnalyzer.runSecurityScan(document);
    issues.push(...securityIssues);

    return issues;
  }

  /**
   * Layer 2: AI 审查
   */
  async aiReview(document: vscode.TextDocument, context?: string): Promise<Review> {
    const code = document.getText();
    return await this.aiReviewer.review(code, {
      fileName: document.fileName,
      languageId: document.languageId,
      context,
    });
  }

  /**
   * Layer 3: 自动修复
   */
  async autoFix(document: vscode.TextDocument, issues: Issue[]): Promise<Fix[]> {
    const fixes: Fix[] = [];

    for (const issue of issues) {
      if (issue.fixable) {
        const fix = await this.autoFixer.generateFix(document, issue);
        if (fix) {
          fixes.push(fix);
        }
      }
    }

    return fixes;
  }

  /**
   * Layer 4: 质量评分
   */
  async qualityScore(document: vscode.TextDocument): Promise<QualityScore> {
    return await this.qualityScorer.calculate(document);
  }

  /**
   * 完整质量检查
   */
  async fullCheck(document: vscode.TextDocument): Promise<QualityReport> {
    const startTime = Date.now();

    // Layer 1: 静态分析
    const staticIssues = await this.staticAnalysis(document);

    // Layer 2: AI 审查
    const aiReview = await this.aiReview(document);

    // Layer 3: 自动修复
    const fixes = await this.autoFix(document, staticIssues);

    // Layer 4: 质量评分
    const score = await this.qualityScore(document);

    const duration = Date.now() - startTime;

    return {
      staticIssues,
      aiReview,
      fixes,
      score,
      duration,
      timestamp: Date.now(),
    };
  }

  /**
   * 应用修复
   */
  async applyFixes(document: vscode.TextDocument, fixes: Fix[]): Promise<boolean> {
    const edit = new vscode.WorkspaceEdit();

    for (const fix of fixes) {
      edit.replace(document.uri, fix.range, fix.newText);
    }

    return await vscode.workspace.applyEdit(edit);
  }

  /**
   * 获取质量趋势
   */
  async getQualityTrend(filePath: string): Promise<QualityTrend> {
    return await this.qualityScorer.getTrend(filePath);
  }
}

// ==================== 类型定义 ====================

export interface Issue {
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  range: vscode.Range;
  source: 'eslint' | 'typescript' | 'security' | 'ai';
  fixable: boolean;
  code?: string;
}

export interface Review {
  summary: string;
  issues: ReviewIssue[];
  suggestions: string[];
  rating: number; // 1-5
}

export interface ReviewIssue {
  category: 'architecture' | 'best-practice' | 'performance' | 'security' | 'maintainability';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  line?: number;
  suggestion?: string;
}

export interface Fix {
  issue: Issue;
  range: vscode.Range;
  newText: string;
  description: string;
}

export interface QualityScore {
  overall: number; // 0-100
  breakdown: {
    correctness: number;
    maintainability: number;
    performance: number;
    security: number;
    style: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface QualityReport {
  staticIssues: Issue[];
  aiReview: Review;
  fixes: Fix[];
  score: QualityScore;
  duration: number;
  timestamp: number;
}

export interface QualityTrend {
  history: Array<{ timestamp: number; score: number }>;
  direction: 'improving' | 'declining' | 'stable';
  change: number;
}

// ==================== 辅助类 ====================

class StaticAnalyzer {
  async runESLint(document: vscode.TextDocument): Promise<Issue[]> {
    // 简化实现：使用 VSCode 的诊断信息
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    const issues: Issue[] = [];

    for (const diagnostic of diagnostics) {
      if (diagnostic.source === 'eslint') {
        issues.push({
          type: this.mapSeverity(diagnostic.severity),
          severity: this.mapToIssueSeverity(diagnostic.severity),
          message: diagnostic.message,
          range: diagnostic.range,
          source: 'eslint',
          fixable: true,
          code: diagnostic.code?.toString(),
        });
      }
    }

    return issues;
  }

  async runTypeCheck(document: vscode.TextDocument): Promise<Issue[]> {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    const issues: Issue[] = [];

    for (const diagnostic of diagnostics) {
      if (diagnostic.source === 'ts' || diagnostic.source === 'typescript') {
        issues.push({
          type: this.mapSeverity(diagnostic.severity),
          severity: this.mapToIssueSeverity(diagnostic.severity),
          message: diagnostic.message,
          range: diagnostic.range,
          source: 'typescript',
          fixable: false,
          code: diagnostic.code?.toString(),
        });
      }
    }

    return issues;
  }

  async runSecurityScan(document: vscode.TextDocument): Promise<Issue[]> {
    const issues: Issue[] = [];
    const text = document.getText();

    // 简单的安全模式检查
    const securityPatterns = [
      {
        pattern: /eval\(/g,
        message: '使用 eval() 存在安全风险',
        severity: 'critical' as const,
      },
      {
        pattern: /innerHTML\s*=/g,
        message: '直接设置 innerHTML 可能导致 XSS 攻击',
        severity: 'high' as const,
      },
      {
        pattern: /document\.write\(/g,
        message: '使用 document.write() 存在安全风险',
        severity: 'medium' as const,
      },
      {
        pattern: /password\s*=\s*['"][^'"]+['"]/gi,
        message: '硬编码密码存在安全风险',
        severity: 'critical' as const,
      },
    ];

    for (const { pattern, message, severity } of securityPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const position = document.positionAt(match.index);
        const range = new vscode.Range(position, position.translate(0, match[0].length));

        issues.push({
          type: 'warning',
          severity,
          message,
          range,
          source: 'security',
          fixable: false,
        });
      }
    }

    return issues;
  }

  private mapSeverity(severity: vscode.DiagnosticSeverity): 'error' | 'warning' | 'info' {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      default:
        return 'info';
    }
  }

  private mapToIssueSeverity(
    severity: vscode.DiagnosticSeverity
  ): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'high';
      case vscode.DiagnosticSeverity.Warning:
        return 'medium';
      default:
        return 'low';
    }
  }
}

class AIReviewer {
  async review(
    code: string,
    options: { fileName: string; languageId: string; context?: string }
  ): Promise<Review> {
    // 简化实现：基于规则的审查
    const issues: ReviewIssue[] = [];
    const suggestions: string[] = [];

    // 检查函数长度
    const functions = this.extractFunctions(code);
    for (const func of functions) {
      if (func.lines > 50) {
        issues.push({
          category: 'maintainability',
          severity: 'medium',
          message: `函数 ${func.name} 过长 (${func.lines} 行)`,
          line: func.startLine,
          suggestion: '考虑将函数拆分为更小的函数',
        });
      }
    }

    // 检查复杂度
    if (code.split('if').length > 10) {
      issues.push({
        category: 'maintainability',
        severity: 'medium',
        message: '代码复杂度较高',
        suggestion: '考虑简化逻辑或使用设计模式',
      });
    }

    // 检查注释
    const commentRatio = this.calculateCommentRatio(code);
    if (commentRatio < 0.1) {
      suggestions.push('建议添加更多注释以提高代码可读性');
    }

    // 检查命名
    if (/\b[a-z]\b/.test(code)) {
      suggestions.push('避免使用单字母变量名');
    }

    const rating = this.calculateRating(issues);

    return {
      summary: this.generateSummary(issues, suggestions),
      issues,
      suggestions,
      rating,
    };
  }

  private extractFunctions(code: string): Array<{ name: string; lines: number; startLine: number }> {
    const functions: Array<{ name: string; lines: number; startLine: number }> = [];
    const lines = code.split('\n');
    const functionRegex = /function\s+(\w+)|const\s+(\w+)\s*=\s*\(/g;

    let match: RegExpExecArray | null;
    while ((match = functionRegex.exec(code)) !== null) {
      const name = match[1] || match[2];
      const startLine = code.substring(0, match.index).split('\n').length;
      const endLine = this.findFunctionEnd(lines, startLine);
      const lineCount = endLine - startLine + 1;

      functions.push({ name, lines: lineCount, startLine });
    }

    return functions;
  }

  private findFunctionEnd(lines: string[], startLine: number): number {
    let braceCount = 0;
    let inFunction = false;

    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          inFunction = true;
        } else if (char === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }

    return lines.length;
  }

  private calculateCommentRatio(code: string): number {
    const lines = code.split('\n');
    const commentLines = lines.filter(
      (line) => line.trim().startsWith('//') || line.trim().startsWith('/*')
    ).length;
    return commentLines / lines.length;
  }

  private calculateRating(issues: ReviewIssue[]): number {
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const highCount = issues.filter((i) => i.severity === 'high').length;
    const mediumCount = issues.filter((i) => i.severity === 'medium').length;

    let rating = 5;
    rating -= criticalCount * 1.0;
    rating -= highCount * 0.5;
    rating -= mediumCount * 0.25;

    return Math.max(1, Math.min(5, rating));
  }

  private generateSummary(issues: ReviewIssue[], suggestions: string[]): string {
    if (issues.length === 0 && suggestions.length === 0) {
      return '✅ 代码质量良好，未发现明显问题';
    }

    const parts: string[] = [];

    if (issues.length > 0) {
      parts.push(`发现 ${issues.length} 个问题`);
    }

    if (suggestions.length > 0) {
      parts.push(`${suggestions.length} 条改进建议`);
    }

    return parts.join('，');
  }
}

class AutoFixer {
  private fixRules: Map<string, FixRule> = new Map();

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    // ESLint 规则
    this.addRule('no-var', {
      pattern: /\bvar\b/,
      fix: (text) => text.replace(/\bvar\b/, 'const'),
      description: '将 var 替换为 const'
    });

    this.addRule('prefer-const', {
      pattern: /\blet\b/,
      fix: (text) => text.replace(/\blet\b/, 'const'),
      description: '将 let 替换为 const'
    });

    this.addRule('semi', {
      pattern: /[^;]$/,
      fix: (text) => text + ';',
      description: '添加分号'
    });

    this.addRule('quotes', {
      pattern: /'/g,
      fix: (text) => text.replace(/'/g, '"'),
      description: '统一使用双引号'
    });

    this.addRule('eqeqeq', {
      pattern: /==(?!=)/,
      fix: (text) => text.replace(/==(?!=)/g, '==='),
      description: '使用严格相等'
    });

    this.addRule('no-trailing-spaces', {
      pattern: /\s+$/,
      fix: (text) => text.trimEnd(),
      description: '删除行尾空格'
    });

    this.addRule('comma-dangle', {
      pattern: /,(\s*[}\]])/,
      fix: (text) => text.replace(/,(\s*[}\]])/g, '$1'),
      description: '删除尾随逗号'
    });

    this.addRule('no-console', {
      pattern: /console\.(log|warn|error)/,
      fix: (text) => `// ${text}`,
      description: '注释掉 console'
    });

    this.addRule('arrow-parens', {
      pattern: /\(\s*(\w+)\s*\)\s*=>/,
      fix: (text) => text.replace(/\(\s*(\w+)\s*\)\s*=>/, '$1 =>'),
      description: '简化箭头函数参数'
    });

    this.addRule('object-shorthand', {
      pattern: /(\w+):\s*\1\b/,
      fix: (text) => text.replace(/(\w+):\s*\1\b/, '$1'),
      description: '使用对象简写'
    });

    // TypeScript 规则
    this.addRule('explicit-function-return-type', {
      pattern: /function\s+\w+\([^)]*\)\s*{/,
      fix: (text) => text.replace(/\)\s*{/, '): void {'),
      description: '添加返回类型'
    });

    this.addRule('no-explicit-any', {
      pattern: /:\s*any\b/,
      fix: (text) => text.replace(/:\s*any\b/, ': unknown'),
      description: '将 any 替换为 unknown'
    });

    // 安全规则
    this.addRule('no-eval', {
      pattern: /\beval\(/,
      fix: (text) => `// SECURITY: ${text}`,
      description: '注释掉不安全的 eval'
    });

    this.addRule('no-inner-html', {
      pattern: /\.innerHTML\s*=/,
      fix: (text) => text.replace(/\.innerHTML\s*=/, '.textContent ='),
      description: '使用 textContent 替代 innerHTML'
    });
  }

  private addRule(code: string, rule: FixRule): void {
    this.fixRules.set(code, rule);
  }

  async generateFix(document: vscode.TextDocument, issue: Issue): Promise<Fix | null> {
    if (!issue.fixable) {
      return null;
    }

    // 1. 基于规则的修复
    if (issue.code && this.fixRules.has(issue.code)) {
      return this.applyRule(document, issue, this.fixRules.get(issue.code)!);
    }

    // 2. 基于模式的修复
    if (issue.source === 'eslint') {
      return this.fixESLintIssue(document, issue);
    }

    // 3. AI 辅助修复（简化版）
    if (issue.severity === 'high' || issue.severity === 'critical') {
      return this.aiAssistedFix(document, issue);
    }

    return null;
  }

  private applyRule(document: vscode.TextDocument, issue: Issue, rule: FixRule): Fix | null {
    const text = document.getText(issue.range);

    if (!rule.pattern.test(text)) {
      return null;
    }

    const newText = rule.fix(text);

    return {
      issue,
      range: issue.range,
      newText,
      description: rule.description,
    };
  }

  private fixESLintIssue(document: vscode.TextDocument, issue: Issue): Fix | null {
    const text = document.getText(issue.range);
    const line = document.lineAt(issue.range.start.line);

    // 智能修复：根据上下文
    if (issue.message.includes('is never reassigned')) {
      const newText = text.replace(/\blet\b/, 'const');
      return {
        issue,
        range: issue.range,
        newText,
        description: '将未重新赋值的 let 改为 const',
      };
    }

    if (issue.message.includes('Missing semicolon')) {
      return {
        issue,
        range: new vscode.Range(line.range.end, line.range.end),
        newText: ';',
        description: '添加缺失的分号',
      };
    }

    return null;
  }

  private aiAssistedFix(document: vscode.TextDocument, issue: Issue): Fix | null {
    // 简化实现：基于启发式规则
    const text = document.getText(issue.range);

    // 修复未使用的变量
    if (issue.message.includes('is defined but never used')) {
      return {
        issue,
        range: issue.range,
        newText: `// TODO: Remove unused variable\n${text}`,
        description: 'AI: 标记未使用的变量',
      };
    }

    // 修复类型错误
    if (issue.message.includes('Type') && issue.message.includes('is not assignable')) {
      return {
        issue,
        range: issue.range,
        newText: `${text} as any // FIXME: Type assertion`,
        description: 'AI: 添加类型断言（需手动修复）',
      };
    }

    return null;
  }
}

interface FixRule {
  pattern: RegExp;
  fix: (text: string) => string;
  description: string;
}

class QualityScorer {
  constructor(private context: vscode.ExtensionContext) {}

  async calculate(document: vscode.TextDocument): Promise<QualityScore> {
    const text = document.getText();
    const diagnostics = vscode.languages.getDiagnostics(document.uri);

    // 计算各项分数
    const correctness = this.calculateCorrectness(diagnostics);
    const maintainability = this.calculateMaintainability(text);
    const performance = this.calculatePerformance(text);
    const security = this.calculateSecurity(text);
    const style = this.calculateStyle(diagnostics);

    const overall = (
      correctness * 0.3 +
      maintainability * 0.25 +
      performance * 0.2 +
      security * 0.15 +
      style * 0.1
    );

    const grade = this.calculateGrade(overall);

    // 保存历史
    await this.saveHistory(document.uri.fsPath, overall);

    return {
      overall,
      breakdown: {
        correctness,
        maintainability,
        performance,
        security,
        style,
      },
      grade,
    };
  }

  private calculateCorrectness(diagnostics: vscode.Diagnostic[]): number {
    const errors = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Error).length;
    return Math.max(0, 100 - errors * 10);
  }

  private calculateMaintainability(text: string): number {
    const lines = text.split('\n').length;
    const functions = (text.match(/function\s+\w+/g) || []).length;
    const avgLinesPerFunction = functions > 0 ? lines / functions : lines;

    let score = 100;
    if (avgLinesPerFunction > 50) score -= 20;
    if (avgLinesPerFunction > 100) score -= 30;

    return Math.max(0, score);
  }

  private calculatePerformance(text: string): number {
    let score = 100;

    // 检查性能反模式
    if (text.includes('for') && text.includes('for')) score -= 10; // 嵌套循环
    if (text.includes('eval(')) score -= 30;

    return Math.max(0, score);
  }

  private calculateSecurity(text: string): number {
    let score = 100;

    if (text.includes('eval(')) score -= 40;
    if (text.includes('innerHTML')) score -= 20;
    if (/password\s*=\s*['"]/.test(text)) score -= 50;

    return Math.max(0, score);
  }

  private calculateStyle(diagnostics: vscode.Diagnostic[]): number {
    const warnings = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Warning).length;
    return Math.max(0, 100 - warnings * 5);
  }

  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private async saveHistory(filePath: string, score: number): Promise<void> {
    const history = this.context.globalState.get<{ [key: string]: Array<{ timestamp: number; score: number }> }>(
      'qualityHistory',
      {}
    );

    if (!history[filePath]) {
      history[filePath] = [];
    }

    history[filePath].push({ timestamp: Date.now(), score });

    // 保留最近 100 条记录
    if (history[filePath].length > 100) {
      history[filePath] = history[filePath].slice(-100);
    }

    await this.context.globalState.update('qualityHistory', history);
  }

  async getTrend(filePath: string): Promise<QualityTrend> {
    const history = this.context.globalState.get<{ [key: string]: Array<{ timestamp: number; score: number }> }>(
      'qualityHistory',
      {}
    )[filePath] || [];

    if (history.length < 2) {
      return {
        history,
        direction: 'stable',
        change: 0,
      };
    }

    const recent = history.slice(-10);
    const firstScore = recent[0].score;
    const lastScore = recent[recent.length - 1].score;
    const change = lastScore - firstScore;

    return {
      history,
      direction: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
      change,
    };
  }
}
