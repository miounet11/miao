import * as vscode from 'vscode';
import { getWelcomeDemo } from './WelcomeDemo';

export function activate(context: vscode.ExtensionContext) {
  console.log('Welcome Experience extension is now active');

  const welcomeDemo = getWelcomeDemo(context);

  // 首次启动时自动显示
  welcomeDemo.checkFirstLaunch().then((isFirst) => {
    if (isFirst) {
      welcomeDemo.show();
    }
  });

  // 注册命令：手动显示欢迎页面
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.showWelcome', () => {
      welcomeDemo.show();
    })
  );
}

export function deactivate() {}
