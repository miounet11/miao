import * as vscode from 'vscode';
import { AuthManager } from '../auth-manager';
import { OAuthHandler } from '../oauth-handler';

/**
 * Login webview panel
 */
export class LoginPanel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly authManager: AuthManager,
    private readonly oauthHandler: OAuthHandler
  ) {}

  show(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'miaodaLogin',
      'Miaoda Login',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.webview.html = this.getHtmlContent();

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'login':
            await this.handleLogin(message.email, message.password);
            break;
          case 'register':
            await this.handleRegister(message.email, message.password, message.name);
            break;
          case 'oauth':
            await this.handleOAuth(message.provider);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  private async handleLogin(email: string, password: string): Promise<void> {
    try {
      this.sendMessage({ type: 'loading', value: true });
      await this.authManager.login(email, password);
      this.sendMessage({ type: 'success', message: 'Login successful!' });
      this.panel?.dispose();
    } catch (error: any) {
      this.sendMessage({ type: 'error', message: error.message || 'Login failed' });
    } finally {
      this.sendMessage({ type: 'loading', value: false });
    }
  }

  private async handleRegister(email: string, password: string, name?: string): Promise<void> {
    try {
      this.sendMessage({ type: 'loading', value: true });
      await this.authManager.register(email, password, name);
      this.sendMessage({ type: 'success', message: 'Registration successful!' });
      this.panel?.dispose();
    } catch (error: any) {
      this.sendMessage({ type: 'error', message: error.message || 'Registration failed' });
    } finally {
      this.sendMessage({ type: 'loading', value: false });
    }
  }

  private async handleOAuth(provider: 'github' | 'google' | 'microsoft'): Promise<void> {
    try {
      this.sendMessage({ type: 'loading', value: true });
      await this.oauthHandler.startOAuthFlow(provider);
      this.sendMessage({ type: 'success', message: 'OAuth login successful!' });
      this.panel?.dispose();
    } catch (error: any) {
      this.sendMessage({ type: 'error', message: error.message || 'OAuth login failed' });
    } finally {
      this.sendMessage({ type: 'loading', value: false });
    }
  }

  private sendMessage(message: any): void {
    this.panel?.webview.postMessage(message);
  }

  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Miaoda Login</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
      max-width: 400px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      box-sizing: border-box;
    }
    input:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    button {
      width: 100%;
      padding: 10px;
      margin-top: 10px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .oauth-buttons {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    .oauth-button {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .oauth-button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .message {
      padding: 10px;
      margin-bottom: 15px;
      border-radius: 2px;
      display: none;
    }
    .message.error {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      color: var(--vscode-errorForeground);
    }
    .message.success {
      background: var(--vscode-inputValidation-infoBackground);
      border: 1px solid var(--vscode-inputValidation-infoBorder);
      color: var(--vscode-foreground);
    }
    .tabs {
      display: flex;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .tab {
      flex: 1;
      padding: 10px;
      text-align: center;
      cursor: pointer;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      opacity: 0.6;
    }
    .tab.active {
      opacity: 1;
      border-bottom: 2px solid var(--vscode-focusBorder);
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <h1>Miaoda IDE</h1>

  <div class="message" id="message"></div>

  <div class="tabs">
    <button class="tab active" onclick="switchTab('login')">Login</button>
    <button class="tab" onclick="switchTab('register')">Register</button>
  </div>

  <div id="login-tab" class="tab-content active">
    <form id="login-form">
      <div class="form-group">
        <label for="login-email">Email</label>
        <input type="email" id="login-email" required />
      </div>
      <div class="form-group">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" required />
      </div>
      <button type="submit" id="login-btn">Login</button>
    </form>
  </div>

  <div id="register-tab" class="tab-content">
    <form id="register-form">
      <div class="form-group">
        <label for="register-name">Name (optional)</label>
        <input type="text" id="register-name" />
      </div>
      <div class="form-group">
        <label for="register-email">Email</label>
        <input type="email" id="register-email" required />
      </div>
      <div class="form-group">
        <label for="register-password">Password</label>
        <input type="password" id="register-password" required minlength="8" />
      </div>
      <button type="submit" id="register-btn">Register</button>
    </form>
  </div>

  <div class="oauth-buttons">
    <button class="oauth-button" onclick="oauthLogin('github')">Continue with GitHub</button>
    <button class="oauth-button" onclick="oauthLogin('google')">Continue with Google</button>
    <button class="oauth-button" onclick="oauthLogin('microsoft')">Continue with Microsoft</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      if (tab === 'login') {
        document.querySelector('.tabs .tab:first-child').classList.add('active');
        document.getElementById('login-tab').classList.add('active');
      } else {
        document.querySelector('.tabs .tab:last-child').classList.add('active');
        document.getElementById('register-tab').classList.add('active');
      }
    }

    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      vscode.postMessage({ command: 'login', email, password });
    });

    document.getElementById('register-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      vscode.postMessage({ command: 'register', email, password, name });
    });

    function oauthLogin(provider) {
      vscode.postMessage({ command: 'oauth', provider });
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      const messageEl = document.getElementById('message');

      switch (message.type) {
        case 'loading':
          document.querySelectorAll('button').forEach(btn => {
            btn.disabled = message.value;
          });
          break;
        case 'error':
          messageEl.textContent = message.message;
          messageEl.className = 'message error';
          messageEl.style.display = 'block';
          break;
        case 'success':
          messageEl.textContent = message.message;
          messageEl.className = 'message success';
          messageEl.style.display = 'block';
          break;
      }
    });
  </script>
</body>
</html>`;
  }
}
