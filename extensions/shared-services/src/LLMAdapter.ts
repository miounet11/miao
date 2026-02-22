import {
  ILLMAdapter,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMChunk,
  ProviderStatus,
  ModelInfo,
} from './ILLMAdapter';

/**
 * Abstract base class for LLM providers
 */
abstract class BaseLLMProvider {
  constructor(protected config: LLMProviderConfig) {}

  abstract complete(request: LLMRequest): Promise<LLMResponse>;
  abstract stream(request: LLMRequest): AsyncIterable<LLMChunk>;
  abstract getStatus(): Promise<ProviderStatus>;
  abstract listModels(): Promise<ModelInfo[]>;
}

/**
 * OpenAI provider implementation
 */
class OpenAIProvider extends BaseLLMProvider {
  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Placeholder: Will integrate OpenAI SDK
    return {
      content: 'OpenAI response',
      usage: { promptTokens: 0, completionTokens: 0 },
      model: this.config.model,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMChunk> {
    // Placeholder: Will integrate OpenAI SDK streaming
    yield { content: 'OpenAI stream chunk', done: false };
    yield { content: '', done: true };
  }

  async getStatus(): Promise<ProviderStatus> {
    return {
      connected: true,
      provider: 'openai',
      model: this.config.model,
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        contextWindow: 8192,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        contextWindow: 4096,
      },
    ];
  }
}

/**
 * Anthropic provider implementation
 */
class AnthropicProvider extends BaseLLMProvider {
  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Placeholder: Will integrate Anthropic SDK
    return {
      content: 'Anthropic response',
      usage: { promptTokens: 0, completionTokens: 0 },
      model: this.config.model,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMChunk> {
    // Placeholder: Will integrate Anthropic SDK streaming
    yield { content: 'Anthropic stream chunk', done: false };
    yield { content: '', done: true };
  }

  async getStatus(): Promise<ProviderStatus> {
    return {
      connected: true,
      provider: 'anthropic',
      model: this.config.model,
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'claude-opus-4',
        name: 'Claude Opus 4',
        provider: 'anthropic',
        contextWindow: 200000,
      },
      {
        id: 'claude-sonnet-4',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        contextWindow: 200000,
      },
    ];
  }
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
      throw new Error('No LLM provider configured. Call setProvider() first.');
    }
    return this.currentProvider.complete(request);
  }

  /**
   * Stream completion response
   */
  stream(request: LLMRequest): AsyncIterable<LLMChunk> {
    if (!this.currentProvider) {
      throw new Error('No LLM provider configured. Call setProvider() first.');
    }
    return this.currentProvider.stream(request);
  }

  /**
   * Switch LLM provider without restart (hot-swap)
   */
  setProvider(config: LLMProviderConfig): void {
    this.currentConfig = config;

    switch (config.type) {
      case 'openai':
        this.currentProvider = new OpenAIProvider(config);
        break;
      case 'anthropic':
        this.currentProvider = new AnthropicProvider(config);
        break;
      case 'ollama':
        this.currentProvider = new OllamaProvider(config);
        break;
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
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
