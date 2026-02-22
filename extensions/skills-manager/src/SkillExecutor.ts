import * as vscode from 'vscode';
import { Skill, getSkillStorage } from './SkillStorage';

/**
 * 执行上下文
 */
export interface ExecutionContext {
  code?: string;
  description?: string;
  error?: string;
  variables?: Record<string, string>;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
}

/**
 * Skill 执行器
 * 负责执行 Skill 并返回结果
 */
export class SkillExecutor {
  private context: vscode.ExtensionContext;
  private storage: ReturnType<typeof getSkillStorage>;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.storage = getSkillStorage(context);
  }

  /**
   * 执行 Skill
   */
  async execute(
    skillId: string,
    executionContext: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取 Skill
      const skill = this.storage.getSkill(skillId);
      if (!skill) {
        return {
          success: false,
          error: `Skill ${skillId} not found`,
          duration: Date.now() - startTime,
        };
      }

      // 构建 Prompt
      const prompt = this.buildPrompt(skill, executionContext);

      // 显示进度
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Executing: ${skill.name}`,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          // TODO: 调用 AI API
          // const output = await this.callAI(prompt);

          // 模拟执行
          await this.simulateExecution(progress);

          progress.report({ increment: 100 });
        }
      );

      // 增加使用次数
      this.storage.incrementUsage(skillId);

      // 模拟输出
      const output = this.generateMockOutput(skill, executionContext);

      return {
        success: true,
        output,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 构建 Prompt
   */
  private buildPrompt(skill: Skill, context: ExecutionContext): string {
    let prompt = skill.prompt;

    // 替换变量
    if (context.code) {
      prompt = prompt.replace(/\{\{code\}\}/g, context.code);
    }
    if (context.description) {
      prompt = prompt.replace(/\{\{description\}\}/g, context.description);
    }
    if (context.error) {
      prompt = prompt.replace(/\{\{error\}\}/g, context.error);
    }

    // 替换自定义变量
    if (context.variables) {
      Object.entries(context.variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        prompt = prompt.replace(regex, value);
      });
    }

    return prompt;
  }

  /**
   * 模拟执行（用于测试）
   */
  private async simulateExecution(
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): Promise<void> {
    const steps = [
      { message: 'Analyzing...', duration: 500 },
      { message: 'Processing...', duration: 1000 },
      { message: 'Generating...', duration: 1500 },
      { message: 'Finalizing...', duration: 500 },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      progress.report({
        increment: 25,
        message: step.message,
      });
      await this.wait(step.duration);
    }
  }

  /**
   * 生成模拟输出
   */
  private generateMockOutput(skill: Skill, context: ExecutionContext): string {
    switch (skill.category) {
      case 'code':
        return `// Generated code for: ${skill.name}\nfunction example() {\n  // Implementation here\n  return true;\n}`;

      case 'test':
        return `// Generated tests for: ${skill.name}\ndescribe('Example', () => {\n  it('should work', () => {\n    expect(true).toBe(true);\n  });\n});`;

      case 'refactor':
        return `// Refactored code\n// Changes made:\n// 1. Improved naming\n// 2. Extracted functions\n// 3. Added type safety\n\n${context.code || 'function refactored() { return true; }'}`;

      case 'debug':
        return `// Bug Analysis\n// Root cause: ${context.error || 'Unknown error'}\n// Fix: Apply the following changes\n\n// Fixed code:\nfunction fixed() {\n  // Bug fixed\n  return true;\n}`;

      case 'doc':
        return `/**\n * ${skill.name}\n * \n * @description ${skill.description}\n * @example\n * // Usage example\n * example();\n */`;

      case 'review':
        return `# Code Review\n\n## Strengths\n- Good structure\n- Clear naming\n\n## Improvements\n- Add error handling\n- Improve performance\n\n## Rating: 8/10`;

      default:
        return `Result from ${skill.name}:\n\nOutput generated successfully.`;
    }
  }

  /**
   * 执行并插入到编辑器
   */
  async executeAndInsert(
    skillId: string,
    context: ExecutionContext
  ): Promise<void> {
    const result = await this.execute(skillId, context);

    if (!result.success) {
      vscode.window.showErrorMessage(`Execution failed: ${result.error}`);
      return;
    }

    // 获取活动编辑器
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      // 创建新文档
      const doc = await vscode.workspace.openTextDocument({
        content: result.output,
        language: 'typescript',
      });
      await vscode.window.showTextDocument(doc);
      return;
    }

    // 插入到当前位置
    const position = editor.selection.active;
    await editor.edit((editBuilder) => {
      editBuilder.insert(position, result.output || '');
    });

    vscode.window.showInformationMessage(
      `✅ Skill executed in ${(result.duration / 1000).toFixed(1)}s`
    );
  }

  /**
   * 执行并替换选中内容
   */
  async executeAndReplace(
    skillId: string,
    context: ExecutionContext
  ): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const result = await this.execute(skillId, context);

    if (!result.success) {
      vscode.window.showErrorMessage(`Execution failed: ${result.error}`);
      return;
    }

    // 替换选中内容
    await editor.edit((editBuilder) => {
      editBuilder.replace(editor.selection, result.output || '');
    });

    vscode.window.showInformationMessage(
      `✅ Skill executed in ${(result.duration / 1000).toFixed(1)}s`
    );
  }

  /**
   * 批量执行 Skills
   */
  async executeBatch(
    skillIds: string[],
    context: ExecutionContext
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const skillId of skillIds) {
      const result = await this.execute(skillId, context);
      results.push(result);
    }

    return results;
  }

  /**
   * 等待
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 单例
 */
let skillExecutorInstance: SkillExecutor | undefined;

export function getSkillExecutor(context: vscode.ExtensionContext): SkillExecutor {
  if (!skillExecutorInstance) {
    skillExecutorInstance = new SkillExecutor(context);
  }
  return skillExecutorInstance;
}
