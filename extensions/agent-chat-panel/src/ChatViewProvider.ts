import * as vscode from 'vscode';
import * as path from 'path';
import { getChatController } from './ChatController';
import { getChatHistoryStorage } from '../../shared-services/src/ChatHistoryStorage';

/**
 * Webview View Provider for Chat Panel
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'miaoda.chatPanel';
  private view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Resolve webview view
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });

    // Send initial state when webview becomes visible
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.sendInitialState();
      }
    });
  }

  /**
   * Handle messages from webview
   */
  private async handleMessage(message: any): Promise<void> {
    const controller = getChatController(this.context);

    switch (message.type) {
      case 'ready':
        await this.sendInitialState();
        break;

      case 'sendMessage':
        try {
          const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
          const activeEditor = vscode.window.activeTextEditor;

          const context = {
            workspaceRoot,
            activeFile: activeEditor?.document.uri.fsPath,
            selectedCode: activeEditor?.document.getText(activeEditor.selection),
          };

          const response = await controller.sendMessage(message.payload.content, context);

          // Send the assistant's message to webview
          this.view?.webview.postMessage({
            type: 'newMessage',
            payload: response.message,
          });
        } catch (error) {
          this.view?.webview.postMessage({
            type: 'error',
            payload: {
              message: error instanceof Error ? error.message : 'Failed to send message',
            },
          });
        }
        break;

      case 'newSession':
        await controller.clearSession();
        this.view?.webview.postMessage({
          type: 'sessionCleared',
          payload: {
            sessionId: controller.getSessionId(),
          },
        });
        break;

      case 'loadSession':
        const loaded = await controller.loadSession(message.payload.sessionId);
        if (loaded) {
          this.view?.webview.postMessage({
            type: 'sessionLoaded',
            payload: {
              sessionId: controller.getSessionId(),
              messages: controller.getHistory(),
            },
          });
        } else {
          this.view?.webview.postMessage({
            type: 'error',
            payload: {
              message: 'Failed to load session',
            },
          });
        }
        break;

      case 'loadSessions':
        const storage = getChatHistoryStorage(this.context);
        const sessions = await storage.listSessions();
        this.view?.webview.postMessage({
          type: 'loadSessions',
          payload: sessions,
        });
        break;

      case 'deleteSession':
        const storageForDelete = getChatHistoryStorage(this.context);
        await storageForDelete.deleteSession(message.payload.sessionId);
        // Reload sessions list
        const updatedSessions = await storageForDelete.listSessions();
        this.view?.webview.postMessage({
          type: 'loadSessions',
          payload: updatedSessions,
        });
        break;
    }
  }

  /**
   * Send initial state to webview
   */
  private async sendInitialState(): Promise<void> {
    const controller = getChatController(this.context);
    this.view?.webview.postMessage({
      type: 'init',
      payload: {
        sessionId: controller.getSessionId(),
        messages: controller.getHistory(),
      },
    });
  }

  /**
   * Get HTML content for webview
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'webview.js')
    );

    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Miaoda Chat</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    #root {
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Generate a nonce for CSP
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
