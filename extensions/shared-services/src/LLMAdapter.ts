import {
  ILLMAdapter,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMChunk,
  ProviderStatus,
  ModelInfo,
} from './ILLMAdapter';
import type { LLMError } from './llm/llm-error';

/**
 * Abstract base class for LLM providers
 */
export abstract class BaseLLMProvider {
  constructor(protected config: LLMProviderConfig) {}

  abstract complete(request: LLMRequest): Promise<LLMResponse>;
  abstract stream(request: LLMRequest): AsyncIterable<LLMChunk>;
  abstract getStatus(): Promise<ProviderStatus>;
  abstract listModels(): Promise<ModelInfo[]>;
}

/**
 * Ollama provider implementation (local models)
 */
class OllamaProvider extends BaseLLMProvider {
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    // Validate local address
    if (!this.isLocalAddress(baseUrl)) {
      throw new Error('Ollama provider must use local address (localhost/127.0.0.1)');
    }

    // Placeholder: Will integrate Ollama API
    return {
      content: 'Ollama response',
      usage: { promptTokens: 0, completionTokens: 0 },
      model: this.config.model,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMChunk> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    if (!this.isLocalAddress(baseUrl)) {
      throw new Error('Ollama provider must use local address (localhost/127.0.0.1)');
    }

    // Placeholder: Will integrate Ollama API streaming
    yield { content: 'Ollama stream chunk', done: false };
    yield { content: '', done: true };
  }

  async getStatus(): Promise<ProviderStatus> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    try {
      // Placeholder: Will check Ollama service status
      return {
        connected: true,
        provider: 'ollama',
        model: this.config.model,
      };
    } catch (error) {
      return {
        connected: false,
        provider: 'ollama',
        model: this.config.model,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    // Placeholder: Will fetch from Ollama API
    return [
      {
        id: 'llama2',
        name: 'Llama 2',
        provider: 'ollama',
        contextWindow: 4096,
      },
      {
        id: 'codellama',
        name: 'Code Llama',
        provider: 'ollama',
        contextWindow: 16384,
      },
    ];
  }

  private isLocalAddress(url: string): boolean {
    const localPatterns = [
      /^https?:\/\/localhost(:\d+)?/,
      /^https?:\/\/127\.0\.0\.1(:\d+)?/,
      /^https?:\/\/\[::1\](:\d+)?/,
    ];
    return localPatterns.some((pattern) => pattern.test(url));
  }
}

/**
 * LLM Adapter implementation
 * Unified interface for multiple LLM providers
 */
export class LLMAdapter implements ILLMAdapter {
  private currentProvider: BaseLLMProvider | null = null;
  private currentConfig: LLMProviderConfig | null = null;

  /**
   * Send a completion request
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.currentProvider) {
      const error: LLMError = {
        type: 'server_error',
        statusCode: 500,
        message: 'No LLM provider configured',
        suggestion: 'Configure an API key in settings before using LLM features.',
        provider: 'none',
        retryable: false,
      };
      throw error;
    }
    try {
      return await this.currentProvider.complete(request);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Stream completion response
   */
  async *stream(request: LLMRequest): AsyncIterable<LLMChunk> {
    if (!this.currentProvider) {
      const error: LLMError = {
        type: 'server_error',
        statusCode: 500,
        message: 'No LLM provider configured',
        suggestion: 'Configure an API key in settings before using LLM features.',
        provider: 'none',
        retryable: false,
      };
      throw error;
    }
    try {
      yield* this.currentProvider.stream(request);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Switch LLM provider without restart (hot-swap)
   */
  async setProvider(config: LLMProviderConfig): Promise<void> {
    this.currentConfig = config;

    // Lazy load providers
    switch (config.type) {
      case 'openai': {
        const { OpenAIProvider } = await import('./llm/providers/openai-provider');
        this.currentProvider = new OpenAIProvider(config);
        break;
      }
      case 'anthropic': {
        const { AnthropicProvider } = await import('./llm/providers/anthropic-provider');
        this.currentProvider = new AnthropicProvider(config);
        break;
      }
      case 'ollama':
        this.currentProvider = new OllamaProvider(config);
        break;
      case 'proxy': {
        const { ProxyProvider } = await import('./llm/providers/proxy-provider');
        this.currentProvider = new ProxyProvider(config);
        break;
      }
      default:
        const error: LLMError = {
          type: 'server_error',
          statusCode: 500,
          message: `Unsupported provider type: ${config.type}`,
          suggestion: 'Use openai, anthropic, ollama, or proxy as provider type.',
          provider: config.type,
          retryable: false,
        };
        throw error;
    }
  }

  /**
   * Get current provider status
   */
  async getProviderStatus(): Promise<ProviderStatus> {
    if (!this.currentProvider) {
      return {
        connected: false,
        provider: 'none',
        model: '',
        error: 'No provider configured',
      };
    }
    return this.currentProvider.getStatus();
  }

  /**
   * List available models
   */
  async listModels(): Promise<ModelInfo[]> {
    if (!this.currentProvider) {
      return [];
    }
    return this.currentProvider.listModels();
  }

  /**
   * Get current provider config
   */
  getCurrentConfig(): LLMProviderConfig | null {
    return this.currentConfig;
  }

  /**
   * Set access token for proxy provider
   * This should be called after user authentication
   */
  async setProxyAccessToken(token: string | null): Promise<void> {
    if (this.currentProvider && this.currentConfig?.type === 'proxy') {
      const { ProxyProvider } = await import('./llm/providers/proxy-provider');
      if (this.currentProvider instanceof ProxyProvider) {
        this.currentProvider.setAccessToken(token);
      }
    }
  }
}

/**
 * Singleton instance of LLM Adapter
 */
let llmAdapterInstance: LLMAdapter | undefined;

export function getLLMAdapter(): LLMAdapter {
  if (!llmAdapterInstance) {
    llmAdapterInstance = new LLMAdapter();
  }
  return llmAdapterInstance;
}

export function resetLLMAdapter(): void {
  llmAdapterInstance = undefined;
}
