# Miaoda IDE 多语言 + SSH 远程支持方案

## 🌍 Part 1: 多语言支持（内置 3 种语言）

### 目标

- ✅ 内置英语、中文、日文
- ✅ 首次启动语言选择
- ✅ 避免扩展兼容性错误
- ✅ 无缝切换

---

### 方案：内置语言包

#### 1.1 创建内置语言包扩展

```
miaoda-ide/
├── extensions/
│   ├── miaoda-language-pack-zh-hans/    # 中文简体
│   │   ├── package.json
│   │   ├── translations/
│   │   │   └── main.i18n.json
│   │   └── README.md
│   ├── miaoda-language-pack-ja/         # 日文
│   │   ├── package.json
│   │   ├── translations/
│   │   │   └── main.i18n.json
│   │   └── README.md
│   └── miaoda-language-pack-en/         # 英文（默认）
│       ├── package.json
│       └── README.md
```

#### 1.2 语言包结构

**package.json 示例（中文）：**
```json
{
  "name": "miaoda-language-pack-zh-hans",
  "displayName": "中文（简体）语言包",
  "description": "Miaoda IDE 中文简体语言包",
  "version": "1.0.0",
  "publisher": "miaoda",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Language Packs"
  ],
  "contributes": {
    "localizations": [
      {
        "languageId": "zh-cn",
        "languageName": "Chinese (Simplified)",
        "localizedLanguageName": "中文（简体）",
        "translations": [
          {
            "id": "vscode",
            "path": "./translations/main.i18n.json"
          }
        ]
      }
    ]
  }
}
```

**translations/main.i18n.json 示例：**
```json
{
  "version": "1.0.0",
  "contents": {
    "vs/workbench/browser/parts/editor/editorStatus": {
      "activeEditorPosition": "第 {0} 行，第 {1} 列"
    },
    "vs/workbench/contrib/files/browser/fileActions": {
      "newFile": "新建文件",
      "newFolder": "新建文件夹",
      "openFile": "打开文件"
    },
    "vs/workbench/contrib/terminal/browser/terminal": {
      "terminal": "终端",
      "newTerminal": "新建终端"
    },
    "vs/workbench/browser/parts/activitybar/activitybarPart": {
      "explorer": "资源管理器",
      "search": "搜索",
      "sourceControl": "源代码管理",
      "debug": "运行和调试",
      "extensions": "扩展"
    }
  }
}
```

#### 1.3 首次启动语言选择

**创建欢迎页面：**
```typescript
// extensions/miaoda-welcome/src/languageSelector.ts

import * as vscode from 'vscode';

export class LanguageSelector {
  async showLanguageSelection() {
    const config = vscode.workspace.getConfiguration();
    const hasSelectedLanguage = config.get('miaoda.languageSelected');

    if (hasSelectedLanguage) {
      return; // 已选择过语言
    }

    // 创建 Webview
    const panel = vscode.window.createWebviewPanel(
      'languageSelector',
      'Welcome to Miaoda IDE',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.getLanguageSelectorHtml();

    // 处理语言选择
    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'selectLanguage') {
        await this.setLanguage(message.language);
        await config.update(
          'miaoda.languageSelected',
          true,
          vscode.ConfigurationTarget.Global
        );
        panel.dispose();

        // 重启以应用语言
        const restart = await vscode.window.showInformationMessage(
          'Language changed. Restart to apply?',
          'Restart Now',
          'Later'
        );

        if (restart === 'Restart Now') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      }
    });
  }

  private getLanguageSelectorHtml(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
            color: white;
            margin: 0;
          }
          .container {
            text-align: center;
            max-width: 600px;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          h1 {
            font-size: 48px;
            margin: 0 0 16px 0;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }
          .subtitle {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 40px;
          }
          .language-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 40px;
          }
          .language-card {
            background: rgba(255, 255, 255, 0.2);
            padding: 30px 20px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
          }
          .language-card:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
          }
          .language-card.selected {
            background: rgba(255, 255, 255, 0.4);
            border-color: white;
          }
          .flag {
            font-size: 48px;
            margin-bottom: 12px;
          }
          .language-name {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .language-native {
            font-size: 14px;
            opacity: 0.8;
          }
          .continue-btn {
            margin-top: 40px;
            padding: 16px 48px;
            font-size: 16px;
            font-weight: 600;
            background: white;
            color: #667EEA;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .continue-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          .continue-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎨 Miaoda IDE</h1>
          <p class="subtitle">Choose your language / 选择语言 / 言語を選択</p>

          <div class="language-grid">
            <div class="language-card" data-lang="en" onclick="selectLanguage('en')">
              <div class="flag">🇺🇸</div>
              <div class="language-name">English</div>
              <div class="language-native">English</div>
            </div>

            <div class="language-card" data-lang="zh-cn" onclick="selectLanguage('zh-cn')">
              <div class="flag">🇨🇳</div>
              <div class="language-name">Chinese</div>
              <div class="language-native">中文（简体）</div>
            </div>

            <div class="language-card" data-lang="ja" onclick="selectLanguage('ja')">
              <div class="flag">🇯🇵</div>
              <div class="language-name">Japanese</div>
              <div class="language-native">日本語</div>
            </div>
          </div>

          <button class="continue-btn" id="continueBtn" disabled onclick="confirmLanguage()">
            Continue
          </button>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          let selectedLanguage = null;

          function selectLanguage(lang) {
            selectedLanguage = lang;

            // 更新 UI
            document.querySelectorAll('.language-card').forEach(card => {
              card.classList.remove('selected');
            });
            document.querySelector(\`[data-lang="\${lang}"]\`).classList.add('selected');

            // 启用按钮
            document.getElementById('continueBtn').disabled = false;
          }

          function confirmLanguage() {
            if (selectedLanguage) {
              vscode.postMessage({
                command: 'selectLanguage',
                language: selectedLanguage
              });
            }
          }
        </script>
      </body>
      </html>
    `;
  }

  private async setLanguage(language: string) {
    const config = vscode.workspace.getConfiguration();
    await config.update(
      'locale',
      language,
      vscode.ConfigurationTarget.Global
    );
  }
}
```

#### 1.4 避免扩展兼容性错误

**修改 product.json：**
```json
{
  "nameShort": "Miaoda",
  "nameLong": "Miaoda IDE",
  "applicationName": "miaoda",
  "version": "1.0.0",
  "extensionsGallery": {
    "serviceUrl": "https://open-vsx.org/vscode/gallery",
    "itemUrl": "https://open-vsx.org/vscode/item"
  },
  "extensionAllowedProposedApi": [
    "miaoda-language-pack-zh-hans",
    "miaoda-language-pack-ja",
    "miaoda-language-pack-en"
  ]
}
```

---

## 🔐 Part 2: SSH 远程支持

### 目标

- ✅ SSH 连接管理
- ✅ 远程文件浏览
- ✅ 远程终端
- ✅ 端口转发
- ✅ 远程调试

---

### 方案：集成 Remote-SSH 功能

#### 2.1 创建 SSH 扩展

```
miaoda-ide/
├── extensions/
│   └── miaoda-remote-ssh/
│       ├── package.json
│       ├── src/
│       │   ├── extension.ts
│       │   ├── sshConnection.ts
│       │   ├── sshFileSystem.ts
│       │   ├── sshTerminal.ts
│       │   └── sshConfig.ts
│       └── README.md
```

#### 2.2 SSH 连接管理

**package.json：**
```json
{
  "name": "miaoda-remote-ssh",
  "displayName": "Miaoda Remote - SSH",
  "description": "SSH remote development for Miaoda IDE",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onCommand:miaoda.remote.addNewSSHHost",
    "onView:miaoda.remote.sshTargets"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "miaoda.remote.addNewSSHHost",
        "title": "Add New SSH Host",
        "category": "Remote-SSH",
        "icon": "$(add)"
      },
      {
        "command": "miaoda.remote.connectToHost",
        "title": "Connect to Host",
        "category": "Remote-SSH",
        "icon": "$(plug)"
      },
      {
        "command": "miaoda.remote.openSSHConfig",
        "title": "Open SSH Configuration File",
        "category": "Remote-SSH"
      }
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "miaoda-remote",
          "title": "Remote Explorer",
          "icon": "$(remote-explorer)"
        }
      ]
    },
    "views": {
      "miaoda-remote": [
        {
          "id": "miaoda.remote.sshTargets",
          "name": "SSH Targets"
        }
      ]
    },
    "configuration": {
      "title": "Remote - SSH",
      "properties": {
        "miaoda.remote.ssh.configFile": {
          "type": "string",
          "default": "~/.ssh/config",
          "description": "Path to SSH config file"
        },
        "miaoda.remote.ssh.showLoginTerminal": {
          "type": "boolean",
          "default": true,
          "description": "Show terminal during SSH connection"
        },
        "miaoda.remote.ssh.enableDynamicForwarding": {
          "type": "boolean",
          "default": true,
          "description": "Enable dynamic port forwarding"
        }
      }
    }
  },
  "dependencies": {
    "ssh2": "^1.15.0",
    "ssh2-sftp-client": "^10.0.3"
  }
}
```

**sshConnection.ts：**
```typescript
import { Client, ConnectConfig } from 'ssh2';
import * as vscode from 'vscode';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
  passphrase?: string;
}

export class SSHConnection {
  private client: Client;
  private config: SSHConfig;
  private connected: boolean = false;

  constructor(config: SSHConfig) {
    this.client = new Client();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client
        .on('ready', () => {
          this.connected = true;
          vscode.window.showInformationMessage(
            `Connected to ${this.config.host}`
          );
          resolve();
        })
        .on('error', (err) => {
          vscode.window.showErrorMessage(
            `SSH connection failed: ${err.message}`
          );
          reject(err);
        })
        .connect({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
          privateKey: this.config.privateKey,
          passphrase: this.config.passphrase,
          readyTimeout: 30000
        });
    });
  }

  async executeCommand(command: string): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        stream
          .on('data', (data: Buffer) => {
            output += data.toString();
          })
          .on('close', () => {
            resolve(output);
          })
          .on('error', reject);
      });
    });
  }

  disconnect(): void {
    if (this.connected) {
      this.client.end();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): Client {
    return this.client;
  }
}
```

**sshFileSystem.ts：**
```typescript
import * as vscode from 'vscode';
import SftpClient from 'ssh2-sftp-client';
import { SSHConnection } from './sshConnection';

export class SSHFileSystemProvider implements vscode.FileSystemProvider {
  private sftp: SftpClient;
  private connection: SSHConnection;

  constructor(connection: SSHConnection) {
    this.connection = connection;
    this.sftp = new SftpClient();
  }

  async initialize(): Promise<void> {
    await this.sftp.connect({
      sock: this.connection.getClient()
    });
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const content = await this.sftp.get(uri.path);
    return Buffer.from(content);
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    await this.sftp.put(Buffer.from(content), uri.path);
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const list = await this.sftp.list(uri.path);
    return list.map((item) => [
      item.name,
      item.type === 'd' ? vscode.FileType.Directory : vscode.FileType.File
    ]);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    await this.sftp.mkdir(uri.path, true);
  }

  async delete(uri: vscode.Uri, options: { recursive: boolean }): Promise<void> {
    const stat = await this.sftp.stat(uri.path);
    if (stat.isDirectory) {
      await this.sftp.rmdir(uri.path, options.recursive);
    } else {
      await this.sftp.delete(uri.path);
    }
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    await this.sftp.rename(oldUri.path, newUri.path);
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const stat = await this.sftp.stat(uri.path);
    return {
      type: stat.isDirectory ? vscode.FileType.Directory : vscode.FileType.File,
      ctime: stat.accessTime,
      mtime: stat.modifyTime,
      size: stat.size
    };
  }

  // Event emitters
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> =
    this._emitter.event;

  watch(uri: vscode.Uri): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }
}
```

**sshTerminal.ts：**
```typescript
import * as vscode from 'vscode';
import { SSHConnection } from './sshConnection';

export class SSHTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;

  private closeEmitter = new vscode.EventEmitter<number>();
  onDidClose: vscode.Event<number> = this.closeEmitter.event;

  private connection: SSHConnection;
  private shell: any;

  constructor(connection: SSHConnection) {
    this.connection = connection;
  }

  async open(initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.getClient().shell(
        {
          cols: initialDimensions?.columns || 80,
          rows: initialDimensions?.rows || 24,
          term: 'xterm-256color'
        },
        (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          this.shell = stream;

          stream.on('data', (data: Buffer) => {
            this.writeEmitter.fire(data.toString());
          });

          stream.on('close', () => {
            this.closeEmitter.fire(0);
          });

          resolve();
        }
      );
    });
  }

  close(): void {
    if (this.shell) {
      this.shell.end();
    }
  }

  handleInput(data: string): void {
    if (this.shell) {
      this.shell.write(data);
    }
  }

  setDimensions(dimensions: vscode.TerminalDimensions): void {
    if (this.shell) {
      this.shell.setWindow(dimensions.rows, dimensions.columns);
    }
  }
}
```

#### 2.3 SSH 配置管理

**sshConfig.ts：**
```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SSHHost {
  name: string;
  host: string;
  port: number;
  user: string;
  identityFile?: string;
}

export class SSHConfigManager {
  private configPath: string;

  constructor() {
    const config = vscode.workspace.getConfiguration('miaoda.remote.ssh');
    this.configPath = config.get('configFile') || '~/.ssh/config';
    this.configPath = this.configPath.replace('~', os.homedir());
  }

  async getHosts(): Promise<SSHHost[]> {
    if (!fs.existsSync(this.configPath)) {
      return [];
    }

    const content = fs.readFileSync(this.configPath, 'utf-8');
    return this.parseSSHConfig(content);
  }

  private parseSSHConfig(content: string): SSHHost[] {
    const hosts: SSHHost[] = [];
    const lines = content.split('\n');
    let currentHost: Partial<SSHHost> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('Host ')) {
        if (currentHost && currentHost.name) {
          hosts.push(currentHost as SSHHost);
        }
        currentHost = {
          name: trimmed.substring(5).trim(),
          port: 22
        };
      } else if (currentHost) {
        if (trimmed.startsWith('HostName ')) {
          currentHost.host = trimmed.substring(9).trim();
        } else if (trimmed.startsWith('Port ')) {
          currentHost.port = parseInt(trimmed.substring(5).trim());
        } else if (trimmed.startsWith('User ')) {
          currentHost.user = trimmed.substring(5).trim();
        } else if (trimmed.startsWith('IdentityFile ')) {
          currentHost.identityFile = trimmed.substring(13).trim();
        }
      }
    }

    if (currentHost && currentHost.name) {
      hosts.push(currentHost as SSHHost);
    }

    return hosts;
  }

  async addHost(host: SSHHost): Promise<void> {
    const config = [
      `Host ${host.name}`,
      `  HostName ${host.host}`,
      `  Port ${host.port}`,
      `  User ${host.user}`
    ];

    if (host.identityFile) {
      config.push(`  IdentityFile ${host.identityFile}`);
    }

    const content = config.join('\n') + '\n\n';

    fs.appendFileSync(this.configPath, content);
  }
}
```

#### 2.4 远程资源管理器视图

**extension.ts：**
```typescript
import * as vscode from 'vscode';
import { SSHConfigManager, SSHHost } from './sshConfig';
import { SSHConnection } from './sshConnection';
import { SSHFileSystemProvider } from './sshFileSystem';
import { SSHTerminal } from './sshTerminal';

export function activate(context: vscode.ExtensionContext) {
  const configManager = new SSHConfigManager();
  const connections = new Map<string, SSHConnection>();

  // SSH Targets Tree View
  const sshTargetsProvider = new SSHTargetsProvider(configManager);
  vscode.window.registerTreeDataProvider(
    'miaoda.remote.sshTargets',
    sshTargetsProvider
  );

  // Add New SSH Host
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.remote.addNewSSHHost', async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter SSH host name',
        placeHolder: 'my-server'
      });

      if (!name) return;

      const host = await vscode.window.showInputBox({
        prompt: 'Enter hostname or IP',
        placeHolder: '192.168.1.100'
      });

      if (!host) return;

      const user = await vscode.window.showInputBox({
        prompt: 'Enter username',
        placeHolder: 'root'
      });

      if (!user) return;

      const port = await vscode.window.showInputBox({
        prompt: 'Enter port',
        value: '22'
      });

      await configManager.addHost({
        name,
        host,
        user,
        port: parseInt(port || '22')
      });

      sshTargetsProvider.refresh();
      vscode.window.showInformationMessage(`SSH host "${name}" added`);
    })
  );

  // Connect to Host
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'miaoda.remote.connectToHost',
      async (hostItem: SSHHostItem) => {
        const host = hostItem.host;

        // 获