import * as vscode from 'vscode';
import { getAIManager } from './AIManager';
import { getSimpleQuotaBar } from './SimpleQuotaBar';

/**
 * Shared Services Extension
 * 暴露 AI Manager 和 Quota Bar API
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Shared Services extension is now active');

  // 初始化服务
  const aiManager = getAIManager(context);
  const quotaBar = getSimpleQuotaBar(context);

  // 注册清理
  context.subscriptions.push(quotaBar);

  // 暴露 API 给其他扩展
  const api = {
    aiManager,
    quotaBar,
  };

  console.log('✅ Shared Services API exposed');

  return api;
}

export function deactivate() {
  console.log('Shared Services extension is now deactivated');
}
