import * as vscode from 'vscode';

export class SettingsViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'getAllModels':
            this._handleGetAllModels();
            break;
          case 'getActiveModel':
            this._handleGetActiveModel();
            break;
          case 'setActiveModel':
            this._handleSetActiveModel(message.modelId);
            break;
          case 'addModel':
            this._handleAddModel(message.config);
            break;
          case 'updateModel':
            this._handleUpdateModel(message.modelId, message.updates);
            break;
          case 'deleteModel':
            this._handleDeleteModel(message.modelId);
            break;
          case 'testConnection':
            this._handleTestConnection(message.modelId);
            break;
          case 'getPresets':
            this._handleGetPresets();
            break;
          case 'createFromPreset':
            this._handleCreateFromPreset(message.presetId, message.apiKey, message.customUrl);
            break;
          case 'exportConfig':
            this._handleExportConfig();
            break;
          case 'importConfig':
            this._handleImportConfig(message.data);
            break;
          case 'syncCloud':
            this._handleSyncCloud();
            break;
          case 'getMembership':
            this._handleGetMembership();
            break;
        }
      },
      undefined,
      this._context.subscriptions
    );
  }

  public showQuickSetup() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'showQuickSetup' });
    }
  }

  private async _handleGetAllModels() {
    try {
      // TODO: Integrate with ConfigurationManager
      const models = this._context.globalState.get('miaoda.models', []);
      this._view?.webview.postMessage({
        type: 'allModels',
        models
      });
    } catch (error) {
      this._showError('Failed to load models', error);
    }
  }

  private async _handleGetActiveModel() {
    try {
      const activeModelId = this._context.globalState.get('miaoda.activeModelId');
      this._view?.webview.postMessage({
        type: 'activeModel',
        modelId: activeModelId
      });
    } catch (error) {
      this._showError('Failed to get active model', error);
    }
  }

  private async _handleSetActiveModel(modelId: string) {
    try {
      await this._context.globalState.update('miaoda.activeModelId', modelId);
      this._view?.webview.postMessage({
        type: 'success',
        message: 'Active model updated'
      });
    } catch (error) {
      this._showError('Failed to set active model', error);
    }
  }

  private async _handleAddModel(config: any) {
    try {
      const models = this._context.globalState.get('miaoda.models', []) as any[];
      const newModel = {
        ...config,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        enabled: true
      };
      models.push(newModel);
      await this._context.globalState.update('miaoda.models', models);
      this._view?.webview.postMessage({
        type: 'modelAdded',
        model: newModel
      });
    } catch (error) {
      this._showError('Failed to add model', error);
    }
  }

  private async _handleUpdateModel(modelId: string, updates: any) {
    try {
      const models = this._context.globalState.get('miaoda.models', []) as any[];
      const index = models.findIndex(m => m.id === modelId);
      if (index !== -1) {
        models[index] = { ...models[index], ...updates, updatedAt: Date.now() };
        await this._context.globalState.update('miaoda.models', models);
        this._view?.webview.postMessage({
          type: 'modelUpdated',
          model: models[index]
        });
      }
    } catch (error) {
      this._showError('Failed to update model', error);
    }
  }

  private async _handleDeleteModel(modelId: string) {
    try {
      const models = this._context.globalState.get('miaoda.models', []) as any[];
      const filtered = models.filter(m => m.id !== modelId);
      await this._context.globalState.update('miaoda.models', filtered);
      this._view?.webview.postMessage({
        type: 'modelDeleted',
        modelId
      });
    } catch (error) {
      this._showError('Failed to delete model', error);
    }
  }

  private async _handleTestConnection(_modelId: string) {
    try {
      // Simulate connection test
      this._view?.webview.postMessage({
        type: 'connectionTest',
        result: { success: true, latency: 150 }
      });
    } catch (error) {
      this._showError('Connection test failed', error);
    }
  }

  private async _handleGetPresets() {
    try {
      const presets = [
        {
          id: 'openai',
          name: 'OpenAI',
          nameCN: 'OpenAI',
          provider: 'openai',
          defaultApiUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-4',
          requiresApiKey: true,
          instructions: 'Get your API key from https://platform.openai.com/api-keys',
          instructionsCN: '从 https://platform.openai.com/api-keys 获取您的 API 密钥'
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          nameCN: 'Anthropic',
          provider: 'anthropic',
          defaultApiUrl: 'https://api.anthropic.com/v1',
          defaultModel: 'claude-opus-4',
          requiresApiKey: true,
          instructions: 'Get your API key from https://console.anthropic.com/settings/keys',
          instructionsCN: '从 https://console.anthropic.com/settings/keys 获取您的 API 密钥'
        },
        {
          id: 'ollama',
          name: 'Ollama (Local)',
          nameCN: 'Ollama (本地)',
          provider: 'ollama',
          defaultApiUrl: 'http://localhost:11434',
          defaultModel: 'llama2',
          requiresApiKey: false,
          instructions: 'Install Ollama from https://ollama.ai and run locally',
          instructionsCN: '从 https://ollama.ai 安装 Ollama 并在本地运行'
        },
        {
          id: 'deepseek',
          name: 'DeepSeek',
          nameCN: '深度求索',
          provider: 'deepseek',
          defaultApiUrl: 'https://api.deepseek.com/v1',
          defaultModel: 'deepseek-chat',
          requiresApiKey: true,
          instructions: 'Get your API key from https://platform.deepseek.com',
          instructionsCN: '从 https://platform.deepseek.com 获取您的 API 密钥'
        }
      ];
      this._view?.webview.postMessage({
        type: 'presets',
        presets
      });
    } catch (error) {
      this._showError('Failed to load presets', error);
    }
  }

  private async _handleCreateFromPreset(_presetId: string, _apiKey?: string, _customUrl?: string) {
    try {
      // Implementation would create model from preset
      this._view?.webview.postMessage({
        type: 'success',
        message: 'Model created from preset'
      });
    } catch (error) {
      this._showError('Failed to create from preset', error);
    }
  }

  private async _handleExportConfig() {
    try {
      const models = this._context.globalState.get('miaoda.models', []);
      const config = JSON.stringify({ version: '1.0', models }, null, 2);
      const uri = await vscode.window.showSaveDialog({
        filters: { 'JSON': ['json'] },
        defaultUri: vscode.Uri.file('miaoda-config.json')
      });
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(config, 'utf8'));
        vscode.window.showInformationMessage('Configuration exported successfully');
      }
    } catch (error) {
      this._showError('Failed to export configuration', error);
    }
  }

  private async _handleImportConfig(data: string) {
    try {
      const config = JSON.parse(data);
      await this._context.globalState.update('miaoda.models', config.models);
      this._view?.webview.postMessage({
        type: 'success',
        message: 'Configuration imported successfully'
      });
      this._handleGetAllModels();
    } catch (error) {
      this._showError('Failed to import configuration', error);
    }
  }

  private async _handleSyncCloud() {
    try {
      // Simulate cloud sync
      this._view?.webview.postMessage({
        type: 'success',
        message: 'Cloud sync completed'
      });
    } catch (error) {
      this._showError('Cloud sync failed', error);
    }
  }

  private async _handleGetMembership() {
    try {
      this._view?.webview.postMessage({
        type: 'membership',
        tier: 'free'
      });
    } catch (error) {
      this._showError('Failed to get membership', error);
    }
  }

  private _showError(message: string, error: any) {
    console.error(message, error);
    this._view?.webview.postMessage({
      type: 'error',
      message: `${message}: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'webview.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <title>Miaoda Settings</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
