import * as vscode from 'vscode';
import { getSevenDayGuide } from './SevenDayGuide';

export function activate(context: vscode.ExtensionContext) {
  console.log('Onboarding extension is now active');

  const sevenDayGuide = getSevenDayGuide(context);

  // 注册命令：启动引导
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.startOnboarding', async () => {
      await sevenDayGuide.showDailyTasks();
    })
  );

  // 注册命令：显示每日任务
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.showDailyTasks', async () => {
      await sevenDayGuide.showDailyTasks();
    })
  );

  // 清理
  context.subscriptions.push(sevenDayGuide);
}

export function deactivate() {}
