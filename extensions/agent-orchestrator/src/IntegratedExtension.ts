import * as vscode from 'vscode';

/**
 * 集成所有系统的主扩展
 * 使用 Extension API 集成其他扩展
 */
export async function activateIntegratedSystems(
  context: vscode.ExtensionContext
): Promise<void> {
  console.log('Activating integrated systems...');

  // 获取其他扩展的 API
  const sharedExt = vscode.extensions.getExtension('miaoda.shared-services');
  const skillsExt = vscode.extensions.getExtension('miaoda.skills-manager');

  if (!sharedExt || !skillsExt) {
    vscode.window.showWarningMessage(
      'Miaoda: 部分扩展未安装，某些功能可能不可用'
    );
    registerPlaceholderCommands(context);
    return;
  }

  // 等待扩展激活
  await sharedExt.activate();
  await skillsExt.activate();

  const sharedAPI = sharedExt.exports;
  const skillsAPI = skillsExt.exports;

  if (!sharedAPI || !skillsAPI) {
    vscode.window.showWarningMessage(
      'Miaoda: 扩展 API 不可用，使用占位符模式'
    );
    registerPlaceholderCommands(context);
    return;
  }

  // 获取服务
  const { aiManager, quotaBar } = sharedAPI;
  const { skillsManager } = skillsAPI;

  console.log('✅ All services loaded');

  // ==================== Skill 系统命令 ====================

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.executeSkill', async () => {
      await vscode.commands.executeCommand('miaoda.skills.execute');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.searchSkills', async () => {
      const query = await vscode.window.showInputBox({
        prompt: '搜索 Skill',
        placeHolder: '输入关键词...',
      });

      if (!query) return;

      const skills = skillsManager.listSkills();
      const filtered = skills.filter(
        (s: any) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase())
      );

      if (filtered.length === 0) {
        vscode.window.showInformationMessage('未找到匹配的 Skill');
        return;
      }

      const items = filtered.map((skill: any) => ({
        label: skill.name,
        description: skill.id,
        detail: skill.description,
        skillId: skill.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `找到 ${filtered.length} 个 Skill`,
      });

      if (selected) {
        await vscode.commands.executeCommand(
          'miaoda.skills.execute',
          (selected as any).skillId
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.trendingSkills', async () => {
      await vscode.commands.executeCommand('miaoda.skills.list');
    })
  );

  // ==================== AI 模型命令 ====================

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.selectModel', async () => {
      const models = aiManager.getAllModels();
      const currentModel = aiManager.getCurrentModel();

      const items = models.map((model: any) => ({
        label: model.name,
        description: model.isOfficial ? '官方模型' : '自定义模型',
        detail: currentModel?.id === model.id ? '✓ 当前使用' : '',
        modelId: model.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: '选择 AI 模型',
      });

      if (!selected) return;

      aiManager.setCurrentModel((selected as any).modelId);
      vscode.window.showInformationMessage(`已切换到: ${(selected as any).label}`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.addApiKey', async () => {
      const provider = await vscode.window.showQuickPick(
        [
          { label: 'Claude', value: 'claude' as const },
          { label: 'OpenAI', value: 'openai' as const },
        ],
        { placeHolder: '选择提供商' }
      );

      if (!provider) return;

      const name = await vscode.window.showInputBox({
        prompt: '模型名称',
        placeHolder: '例如: My GPT-4',
      });

      if (!name) return;

      const apiKey = await vscode.window.showInputBox({
        prompt: 'API Key',
        placeHolder: provider.value === 'claude' ? 'sk-ant-...' : 'sk-...',
        password: true,
      });

      if (!apiKey) return;

      const model = await vscode.window.showInputBox({
        prompt: '模型 ID',
        placeHolder:
          provider.value === 'claude' ? 'claude-sonnet-4-6' : 'gpt-4-turbo',
      });

      if (!model) return;

      const modelId = await aiManager.addCustomModel({
        name,
        provider: provider.value,
        apiKey,
        model,
      });

      vscode.window.showInformationMessage(`✅ 已添加自定义模型: ${name}`);
      aiManager.setCurrentModel(modelId);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.listModels', async () => {
      const official = aiManager.getOfficialModels();
      const custom = aiManager.getCustomModels();

      const message = [
        '官方模型:',
        ...official.map((m: any) => `• ${m.name}`),
        '',
        '自定义模型:',
        ...custom.map((m: any) => `• ${m.name}`),
      ].join('\n');

      vscode.window.showInformationMessage(message);
    })
  );

  // ==================== Quota 系统命令 ====================

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.showQuotaDetails', async () => {
      await quotaBar.showDetails();
    })
  );

  // ==================== 快捷操作实现 ====================

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.smartCommit', async () => {
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (!gitExtension) {
        vscode.window.showErrorMessage('Git 扩展未安装');
        return;
      }

      const git = gitExtension.exports.getAPI(1);
      const repo = git.repositories[0];
      if (!repo) {
        vscode.window.showErrorMessage('未找到 Git 仓库');
        return;
      }

      const diff = await repo.diff(true);
      if (!diff) {
        vscode.window.showInformationMessage('没有需要提交的更改');
        return;
      }

      const canConsume = await quotaBar.consume(1);
      if (!canConsume) return;

      try {
        const response = await aiManager.complete(
          `Generate a concise git commit message for these changes:\n\n${diff}\n\nFollow conventional commits format (feat/fix/docs/etc).`,
          { temperature: 0.7, maxTokens: 200 }
        );

        const message = response.content.trim();
        repo.inputBox.value = message;
        vscode.window.showInformationMessage('✅ 提交信息已生成');
      } catch (error) {
        vscode.window.showErrorMessage(
          `生成提交信息失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.codeReview', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const code =
        editor.document.getText(editor.selection) || editor.document.getText();

      // 检查额度
      const canConsume = await quotaBar.consume(1);
      if (!canConsume) return;

      try {
        const response = await aiManager.complete(
          `Review the following code and provide feedback:\n\n${code}`,
          { temperature: 0.7, maxTokens: 2000 }
        );

        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: 'markdown',
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      } catch (error) {
        vscode.window.showErrorMessage(
          `代码审查失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.writeTests', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const code =
        editor.document.getText(editor.selection) || editor.document.getText();
      const fileName = editor.document.fileName;

      const canConsume = await quotaBar.consume(1);
      if (!canConsume) return;

      try {
        const response = await aiManager.complete(
          `Write unit tests for this code:\n\n${code}\n\nFile: ${fileName}\n\nGenerate comprehensive test cases covering normal cases, edge cases, and error handling.`,
          { temperature: 0.7, maxTokens: 2000 }
        );

        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: fileName.endsWith('.ts') ? 'typescript' : 'javascript',
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      } catch (error) {
        vscode.window.showErrorMessage(
          `生成测试失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.planFeature', async () => {
      const feature = await vscode.window.showInputBox({
        prompt: '功能描述',
        placeHolder: '例如: 添加用户认证功能',
      });

      if (!feature) return;

      const canConsume = await quotaBar.consume(1);
      if (!canConsume) return;

      try {
        const response = await aiManager.complete(
          `Create a detailed implementation plan for: ${feature}\n\nInclude:\n1. Requirements analysis\n2. Technical approach\n3. File structure\n4. Implementation steps\n5. Testing strategy\n6. Potential risks`,
          { temperature: 0.7, maxTokens: 2500 }
        );

        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: 'markdown',
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      } catch (error) {
        vscode.window.showErrorMessage(
          `功能规划失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.debugIssue', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const code =
        editor.document.getText(editor.selection) || editor.document.getText();

      const issue = await vscode.window.showInputBox({
        prompt: '描述问题',
        placeHolder: '例如: 函数返回 undefined',
      });

      if (!issue) return;

      const canConsume = await quotaBar.consume(1);
      if (!canConsume) return;

      try {
        const response = await aiManager.complete(
          `Debug this issue: ${issue}\n\nCode:\n${code}\n\nProvide:\n1. Root cause analysis\n2. Step-by-step debugging approach\n3. Potential fixes\n4. Prevention strategies`,
          { temperature: 0.7, maxTokens: 2000 }
        );

        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: 'markdown',
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      } catch (error) {
        vscode.window.showErrorMessage(
          `调试分析失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.brainstorm', async () => {
      const topic = await vscode.window.showInputBox({
        prompt: '头脑风暴主题',
        placeHolder: '例如: 如何优化这个算法',
      });

      if (!topic) return;

      const canConsume = await quotaBar.consume(1);
      if (!canConsume) return;

      try {
        const response = await aiManager.complete(
          `Brainstorm ideas for: ${topic}\n\nProvide 5-10 creative and practical ideas.`,
          { temperature: 0.9, maxTokens: 1500 }
        );

        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: 'markdown',
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      } catch (error) {
        vscode.window.showErrorMessage(
          `头脑风暴失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.verifyCode', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const code =
        editor.document.getText(editor.selection) || editor.document.getText();

      const canConsume = await quotaBar.consume(1);
      if (!canConsume) return;

      try {
        const response = await aiManager.complete(
          `Verify this code for:\n\n${code}\n\nCheck:\n1. Syntax errors\n2. Logic errors\n3. Security vulnerabilities\n4. Performance issues\n5. Best practices\n6. Type safety\n\nProvide a detailed report with severity levels.`,
          { temperature: 0.7, maxTokens: 2000 }
        );

        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: 'markdown',
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      } catch (error) {
        vscode.window.showErrorMessage(
          `代码验证失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.generateDocs', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请先打开一个文件');
        return;
      }

      const code =
        editor.document.getText(editor.selection) || editor.document.getText();
      const fileName = editor.document.fileName;

      const canConsume = await quotaBar.consume(1);
      if (!canConsume) return;

      try {
        const response = await aiManager.complete(
          `Generate comprehensive documentation for this code:\n\n${code}\n\nFile: ${fileName}\n\nInclude:\n1. Overview\n2. API documentation\n3. Usage examples\n4. Parameters and return values\n5. Edge cases and limitations`,
          { temperature: 0.7, maxTokens: 2500 }
        );

        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: 'markdown',
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      } catch (error) {
        vscode.window.showErrorMessage(
          `生成文档失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  console.log('✅ Integrated systems activated (Extension API mode)');
}

/**
 * 注册占位符命令（当扩展不可用时）
 */
function registerPlaceholderCommands(context: vscode.ExtensionContext): void {
  const commands = [
    'miaoda.executeSkill',
    'miaoda.searchSkills',
    'miaoda.trendingSkills',
    'miaoda.selectModel',
    'miaoda.addApiKey',
    'miaoda.listModels',
    'miaoda.showQuotaDetails',
    'miaoda.smartCommit',
    'miaoda.codeReview',
    'miaoda.writeTests',
    'miaoda.planFeature',
    'miaoda.debugIssue',
    'miaoda.brainstorm',
    'miaoda.verifyCode',
    'miaoda.generateDocs',
  ];

  commands.forEach((cmd) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(cmd, () => {
        vscode.window.showInformationMessage(
          `${cmd} 功能需要安装完整的 Miaoda 扩展包`
        );
      })
    );
  });

  console.log('✅ Placeholder commands registered');
}
