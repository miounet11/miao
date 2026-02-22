import * as vscode from 'vscode';
import { SkillPackage, SkillCategory } from './SkillMarketplace';

/**
 * Skill 生成器 - 3 步快速创建
 *
 * 设计理念：
 * - 零摩擦：3 步完成，无需复杂配置
 * - 即时反馈：实时预览生成的 Skill
 * - 知识继承：从现有 Skill 学习
 */
export class SkillGenerator {
  /**
   * 快速生成 Skill（交互式）
   */
  async generateInteractive(): Promise<SkillPackage | undefined> {
    // Step 1: 描述问题
    const problem = await vscode.window.showInputBox({
      prompt: '步骤 1/3: 你想解决什么问题？',
      placeHolder: '例如：为 React 组件生成单元测试',
      validateInput: (value) => {
        return value.length < 10 ? '请详细描述问题（至少 10 个字符）' : null;
      },
    });

    if (!problem) return undefined;

    // Step 2: 提供示例（可选）
    const hasExample = await vscode.window.showQuickPick(
      [
        { label: '是', value: true, description: '提供代码示例，生成更精确' },
        { label: '否', value: false, description: '跳过示例，快速生成' },
      ],
      { placeHolder: '步骤 2/3: 是否提供代码示例？' }
    );

    let example: string | undefined;
    if (hasExample?.value) {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.selection) {
        example = editor.document.getText(editor.selection);
      }

      if (!example) {
        example = await vscode.window.showInputBox({
          prompt: '粘贴代码示例',
          placeHolder: '例如：function MyComponent() { ... }',
        });
      }
    }

    // Step 3: 选择类别
    const categories = [
      { label: '💻 代码生成', value: SkillCategory.CODE_GENERATION },
      { label: '🧪 测试', value: SkillCategory.TESTING },
      { label: '🔧 重构', value: SkillCategory.REFACTORING },
      { label: '📖 文档', value: SkillCategory.DOCUMENTATION },
      { label: '🐛 调试', value: SkillCategory.DEBUGGING },
    ];

    const category = await vscode.window.showQuickPick(categories, {
      placeHolder: '步骤 3/3: 选择 Skill 类别',
    });

    if (!category) return undefined;

    // 生成 Skill
    return this.generateSkill(problem, category.value, example);
  }

  /**
   * 从模板生成 Skill
   */
  private generateSkill(
    problem: string,
    category: SkillCategory,
    example?: string
  ): SkillPackage {
    const prompt = this.buildPrompt(problem, category, example);
    const name = this.generateName(problem);
    const id = this.generateId(name);

    return {
      id,
      name,
      version: '1.0.0',
      description: problem,
      author: 'user',
      tags: this.extractTags(problem),
      category,
      metadata: {
        usageCount: 0,
        rating: 0,
        ratingCount: 0,
        downloads: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        featured: false,
      },
      content: {
        prompt,
        examples: example ? [example] : undefined,
      },
    };
  }

  /**
   * 构建 Prompt（核心逻辑）
   */
  private buildPrompt(problem: string, category: SkillCategory, example?: string): string {
    const templates: Record<SkillCategory, string> = {
      [SkillCategory.CODE_GENERATION]: `
# 代码生成任务

## 目标
${problem}

## 要求
1. 生成清晰、可维护的代码
2. 遵循最佳实践
3. 添加必要的注释
4. 考虑边界情况

${example ? `## 参考示例\n\`\`\`\n${example}\n\`\`\`` : ''}

## 输出格式
- 完整的代码实现
- 简要说明
- 使用示例
      `.trim(),

      [SkillCategory.TESTING]: `
# 测试生成任务

## 目标
${problem}

## 要求
1. 覆盖主要功能
2. 测试边界情况
3. 清晰的测试描述
4. 使用合适的断言

${example ? `## 待测试代码\n\`\`\`\n${example}\n\`\`\`` : ''}

## 输出格式
- 完整的测试套件
- 测试覆盖说明
      `.trim(),

      [SkillCategory.REFACTORING]: `
# 重构任务

## 目标
${problem}

## 要求
1. 保持功能不变
2. 提升代码质量
3. 减少重复
4. 改善可读性

${example ? `## 原始代码\n\`\`\`\n${example}\n\`\`\`` : ''}

## 输出格式
- 重构后的代码
- 改进说明
- 对比分析
      `.trim(),

      [SkillCategory.DOCUMENTATION]: `
# 文档生成任务

## 目标
${problem}

## 要求
1. 清晰的结构
2. 完整的 API 说明
3. 使用示例
4. 注意事项

${example ? `## 代码\n\`\`\`\n${example}\n\`\`\`` : ''}

## 输出格式
- Markdown 文档
- 代码示例
      `.trim(),

      [SkillCategory.DEBUGGING]: `
# 调试任务

## 目标
${problem}

## 要求
1. 定位问题根源
2. 提供修复方案
3. 解释原因
4. 预防措施

${example ? `## 问题代码\n\`\`\`\n${example}\n\`\`\`` : ''}

## 输出格式
- 问题分析
- 修复代码
- 测试验证
      `.trim(),

      [SkillCategory.DEPLOYMENT]: '',
      [SkillCategory.WORKFLOW]: '',
      [SkillCategory.CUSTOM]: '',
    };

    return templates[category] || problem;
  }

  /**
   * 生成 Skill 名称
   */
  private generateName(problem: string): string {
    // 提取关键词
    const keywords = problem
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3);

    return keywords.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  /**
   * 生成 Skill ID
   */
  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * 提取标签
   */
  private extractTags(problem: string): string[] {
    const commonTags = [
      'react',
      'vue',
      'typescript',
      'javascript',
      'node',
      'api',
      'test',
      'component',
      'hook',
      'function',
    ];

    const lowerProblem = problem.toLowerCase();
    return commonTags.filter((tag) => lowerProblem.includes(tag));
  }

  /**
   * 从现有代码学习生成 Skill
   */
  async learnFromCode(): Promise<SkillPackage | undefined> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('请先打开一个文件');
      return undefined;
    }

    const code = editor.document.getText(editor.selection);
    if (!code) {
      vscode.window.showErrorMessage('请先选中代码');
      return undefined;
    }

    // 分析代码模式
    const pattern = this.analyzeCodePattern(code);

    const problem = await vscode.window.showInputBox({
      prompt: '这段代码解决了什么问题？',
      placeHolder: pattern.suggestion,
    });

    if (!problem) return undefined;

    return this.generateSkill(problem, pattern.category, code);
  }

  /**
   * 分析代码模式
   */
  private analyzeCodePattern(code: string): {
    category: SkillCategory;
    suggestion: string;
  } {
    // 简单的模式识别
    if (code.includes('test(') || code.includes('describe(')) {
      return {
        category: SkillCategory.TESTING,
        suggestion: '生成类似的测试用例',
      };
    }

    if (code.includes('function') || code.includes('const') || code.includes('class')) {
      return {
        category: SkillCategory.CODE_GENERATION,
        suggestion: '生成类似的函数/组件',
      };
    }

    if (code.includes('/**') || code.includes('//')) {
      return {
        category: SkillCategory.DOCUMENTATION,
        suggestion: '生成类似的文档',
      };
    }

    return {
      category: SkillCategory.CUSTOM,
      suggestion: '描述这段代码的用途',
    };
  }

  /**
   * 预览 Skill
   */
  async previewSkill(skill: SkillPackage): Promise<boolean> {
    const panel = vscode.window.createWebviewPanel(
      'skillPreview',
      `预览: ${skill.name}`,
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = this.getPreviewHtml(skill);

    return new Promise((resolve) => {
      panel.webview.onDidReceiveMessage((message) => {
        if (message.command === 'save') {
          resolve(true);
          panel.dispose();
        } else if (message.command === 'cancel') {
          resolve(false);
          panel.dispose();
        }
      });
    });
  }

  /**
   * 生成预览 HTML
   */
  private getPreviewHtml(skill: SkillPackage): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            border-bottom: 2px solid #007acc;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .section {
            margin: 20px 0;
        }
        .label {
            font-weight: 600;
            color: #666;
            margin-bottom: 5px;
        }
        .content {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            white-space: pre-wrap;
        }
        .actions {
            margin-top: 30px;
            display: flex;
            gap: 10px;
        }
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        .save {
            background: #007acc;
            color: white;
        }
        .cancel {
            background: #ccc;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${skill.name}</h1>
        <p>${skill.description}</p>
    </div>

    <div class="section">
        <div class="label">类别</div>
        <div>${skill.category}</div>
    </div>

    <div class="section">
        <div class="label">标签</div>
        <div>${skill.tags.join(', ')}</div>
    </div>

    <div class="section">
        <div class="label">Prompt</div>
        <div class="content">${skill.content.prompt}</div>
    </div>

    ${skill.content.examples ? `
    <div class="section">
        <div class="label">示例</div>
        <div class="content">${skill.content.examples[0]}</div>
    </div>
    ` : ''}

    <div class="actions">
        <button class="save" onclick="save()">保存 Skill</button>
        <button class="cancel" onclick="cancel()">取消</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function save() {
            vscode.postMessage({ command: 'save' });
        }
        function cancel() {
            vscode.postMessage({ command: 'cancel' });
        }
    </script>
</body>
</html>
    `;
  }
}

/**
 * 单例
 */
let generatorInstance: SkillGenerator | undefined;

export function getSkillGenerator(): SkillGenerator {
  if (!generatorInstance) {
    generatorInstance = new SkillGenerator();
  }
  return generatorInstance;
}
