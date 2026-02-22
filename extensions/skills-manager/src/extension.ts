import * as vscode from 'vscode';
import { SkillsManager } from './SkillsManager';
import {
  FileOperationSkill,
  CodeAnalysisSkill,
  GitOperationSkill,
  TerminalSkill,
} from './skills';
import type { Skill } from './ISkillsManager';

let skillsManager: SkillsManager;

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Skills Manager extension is now active');

  // Initialize Skills Manager
  skillsManager = new SkillsManager();

  // Register built-in skills
  registerBuiltInSkills();

  // Register commands
  const listSkillsCommand = vscode.commands.registerCommand('miaoda.skills.list', async () => {
    await handleListSkills();
  });

  const executeSkillCommand = vscode.commands.registerCommand(
    'miaoda.skills.execute',
    async (skillId?: string, params?: any) => {
      await handleExecuteSkill(skillId, params);
    }
  );

  const registerSkillCommand = vscode.commands.registerCommand(
    'miaoda.skills.register',
    async (skill: Skill) => {
      await handleRegisterSkill(skill);
    }
  );

  // Subscribe to skill events
  const eventSubscription = skillsManager.onSkillEvent(event => {
    console.log('Skill event:', event);
  });

  context.subscriptions.push(
    listSkillsCommand,
    executeSkillCommand,
    registerSkillCommand,
    eventSubscription,
    { dispose: () => skillsManager.dispose() }
  );

  // 暴露 API 给其他扩展
  const api = {
    skillsManager,
  };

  console.log('✅ Skills Manager API exposed');

  return api;
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Skills Manager extension is now deactivated');
  if (skillsManager) {
    skillsManager.dispose();
  }
}

/**
 * Register built-in skills
 */
function registerBuiltInSkills(): void {
  try {
    skillsManager.registerSkill(new FileOperationSkill());
    skillsManager.registerSkill(new CodeAnalysisSkill());
    skillsManager.registerSkill(new GitOperationSkill());
    skillsManager.registerSkill(new TerminalSkill());

    console.log('Built-in skills registered successfully');
  } catch (error) {
    console.error('Failed to register built-in skills:', error);
    vscode.window.showErrorMessage(`Failed to register built-in skills: ${error}`);
  }
}

/**
 * Handle list skills command
 */
async function handleListSkills(): Promise<void> {
  try {
    const skills = skillsManager.listSkills();

    if (skills.length === 0) {
      vscode.window.showInformationMessage('No skills registered');
      return;
    }

    // Create quick pick items
    const items = skills.map(skill => ({
      label: skill.name,
      description: skill.id,
      detail: skill.description,
      skill,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a skill to view details',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      // Show skill details
      const details = [
        `**${selected.skill.name}**`,
        '',
        `ID: ${selected.skill.id}`,
        `Category: ${selected.skill.category}`,
        `Version: ${selected.skill.version}`,
        selected.skill.author ? `Author: ${selected.skill.author}` : '',
        '',
        `Description: ${selected.skill.description}`,
        '',
        selected.skill.tags ? `Tags: ${selected.skill.tags.join(', ')}` : '',
        '',
        'Parameters:',
        ...(selected.skill.parameters?.map(
          p => `  - ${p.name} (${p.type})${p.required ? ' *required*' : ''}: ${p.description}`
        ) || ['  None']),
      ]
        .filter(Boolean)
        .join('\n');

      const doc = await vscode.workspace.openTextDocument({
        content: details,
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to list skills: ${error}`);
  }
}

/**
 * Handle execute skill command
 */
async function handleExecuteSkill(skillId?: string, params?: any): Promise<void> {
  try {
    // If no skill ID provided, show picker
    if (!skillId) {
      const skills = skillsManager.listSkills();
      const items = skills.map(skill => ({
        label: skill.name,
        description: skill.id,
        detail: skill.description,
        skillId: skill.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a skill to execute',
      });

      if (!selected) {
        return;
      }

      skillId = selected.skillId;
    }

    // If no params provided, prompt for them
    if (!params) {
      const skill = skillsManager.getSkill(skillId);
      if (!skill) {
        vscode.window.showErrorMessage(`Skill not found: ${skillId}`);
        return;
      }

      // For simplicity, ask for JSON input
      const paramsJson = await vscode.window.showInputBox({
        prompt: 'Enter skill parameters as JSON',
        placeHolder: '{}',
        value: '{}',
      });

      if (paramsJson === undefined) {
        return;
      }

      try {
        params = JSON.parse(paramsJson);
      } catch {
        vscode.window.showErrorMessage('Invalid JSON parameters');
        return;
      }
    }

    // Execute skill
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Executing skill: ${skillId}`,
        cancellable: true,
      },
      async (progress, token) => {
        const context = {
          workspaceFolder: vscode.workspace.workspaceFolders?.[0],
          cancellationToken: token,
        };

        const result = await skillsManager.executeSkill(skillId!, params, context);

        if (result.success) {
          vscode.window.showInformationMessage(
            `Skill executed successfully in ${result.duration}ms`
          );

          // Show result in output
          const output = vscode.window.createOutputChannel(`Skill Result: ${skillId}`);
          output.appendLine('Skill Execution Result');
          output.appendLine('='.repeat(50));
          output.appendLine(`Skill: ${skillId}`);
          output.appendLine(`Duration: ${result.duration}ms`);
          output.appendLine('');
          output.appendLine('Data:');
          output.appendLine(JSON.stringify(result.data, null, 2));
          output.show();
        } else {
          vscode.window.showErrorMessage(
            `Skill execution failed: ${result.error?.message}`
          );
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to execute skill: ${error}`);
  }
}

/**
 * Handle register skill command
 */
async function handleRegisterSkill(skill: Skill): Promise<void> {
  try {
    skillsManager.registerSkill(skill);
    vscode.window.showInformationMessage(`Skill registered: ${skill.name}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to register skill: ${error}`);
  }
}
