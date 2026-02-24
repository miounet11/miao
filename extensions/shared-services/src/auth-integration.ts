import * as vscode from 'vscode';
import { getLLMAdapter } from './LLMAdapter';
import { LLMProviderConfig } from './ILLMAdapter';

/**
 * Integration between auth-service and LLM adapter
 * Automatically configures LLM proxy mode when user is authenticated
 */
export class AuthIntegration {
  private disposables: vscode.Disposable[] = [];

  async initialize(): Promise<void> {
    // Try to get auth-service extension
    const authService = vscode.extensions.getExtension('miaoda.auth-service');

    if (!authService) {
      console.log('Auth service not available, using direct LLM mode');
      await this.configureLLMFromSettings();
      return;
    }

    // Wait for auth service to activate
    const authAPI = await authService.activate();

    // Configure LLM based on auth state
    await this.updateLLMConfig(authAPI);

    // Listen for auth state changes
    const authManager = authAPI.getAuthManager();
    this.disposables.push(
      authManager.onDidChangeAuthState(async () => {
        await this.updateLLMConfig(authAPI);
      })
    );
  }

  private async updateLLMConfig(authAPI: any): Promise<void> {
    const config = vscode.workspace.getConfiguration('miaoda.llm');
    const useProxy = config.get<boolean>('useProxy', false);

    if (useProxy && authAPI.isAuthenticated()) {
      // Use proxy mode
      const proxyUrl = config.get<string>('proxyUrl', 'https://api.miaoda.com');
      const model = config.get<string>('model', 'gpt-4o');

      const llmConfig: LLMProviderConfig = {
        type: 'proxy',
        baseUrl: proxyUrl,
        model,
      };

      const adapter = getLLMAdapter();
      await adapter.setProvider(llmConfig);

      // Set access token
      const token = await authAPI.getAccessToken();
      if (token) {
        await adapter.setProxyAccessToken(token);
      }

      console.log('LLM configured in proxy mode');
    } else {
      // Use direct mode
      await this.configureLLMFromSettings();
    }
  }

  private async configureLLMFromSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration('miaoda.llm');
    const provider = config.get<string>('provider', 'openai');
    const apiKey = config.get<string>('apiKey');
    const model = config.get<string>('model', 'gpt-4o');

    if (!apiKey) {
      console.log('No API key configured');
      return;
    }

    const llmConfig: LLMProviderConfig = {
      type: provider as any,
      apiKey,
      model,
    };

    const adapter = getLLMAdapter();
    await adapter.setProvider(llmConfig);

    console.log(`LLM configured in direct mode (${provider})`);
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
