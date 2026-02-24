import { BaseLLMProvider } from '../../LLMAdapter';
import {
  LLMRequest,
  LLMResponse,
  LLMChunk,
  ProviderStatus,
  ModelInfo,
} from '../../ILLMAdapter';
import type { LLMError } from '../llm-error';

/**
 * Proxy provider - forwards requests to backend LLM Gateway
 * Requires JWT authentication
 */
export class ProxyProvider extends BaseLLMProvider {
  private accessToken: string | null = null;

  /**
   * Set access token for authentication
   */
  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.accessToken) {
      throw this.createAuthError();
    }

    const baseUrl = this.config.baseUrl || 'https://api.miaoda.com';

    try {
      const response = await fetch(`${baseUrl}/api/v1/llm/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: request.messages,
          tools: request.tools,
          maxTokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature ?? this.config.temperature,
        }),
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = await response.json() as any;
      return {
        content: data.content,
        toolCalls: data.toolCalls,
        usage: data.usage,
        model: data.model,
      };
    } catch (error) {
      if (this.isLLMError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMChunk> {
    if (!this.accessToken) {
      throw this.createAuthError();
    }

    const baseUrl = this.config.baseUrl || 'https://api.miaoda.com';

    try {
      const response = await fetch(`${baseUrl}/api/v1/llm/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: request.messages,
          tools: request.tools,
          maxTokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature ?? this.config.temperature,
        }),
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk !== undefined) {
                yield { content: parsed.chunk, done: false };
              }
              if (parsed.done) {
                yield { content: '', done: true };
                return;
              }
            } catch (e) {
              // Skip invalid JSON
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      if (this.isLLMError(error)) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    if (!this.accessToken) {
      return {
        connected: false,
        provider: 'proxy',
        model: this.config.model,
        error: 'Not authenticated',
      };
    }

    const baseUrl = this.config.baseUrl || 'https://api.miaoda.com';

    try {
      const response = await fetch(`${baseUrl}/api/v1/llm/status`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        return {
          connected: false,
          provider: 'proxy',
          model: this.config.model,
          error: `HTTP ${response.status}`,
        };
      }

      return {
        connected: true,
        provider: 'proxy',
        model: this.config.model,
      };
    } catch (error) {
      return {
        connected: false,
        provider: 'proxy',
        model: this.config.model,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!this.accessToken) {
      return [];
    }

    const baseUrl = this.config.baseUrl || 'https://api.miaoda.com';

    try {
      const response = await fetch(`${baseUrl}/api/v1/llm/models`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as any;
      return data.models || [];
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  private async handleErrorResponse(response: Response): Promise<LLMError> {
    try {
      const error = await response.json() as any;
      const llmError: LLMError = {
        type: this.mapErrorType(response.status, error.code),
        statusCode: response.status,
        message: error.message || `HTTP ${response.status}`,
        suggestion: error.suggestion || this.getErrorSuggestion(response.status),
        provider: 'proxy',
        retryable: this.isRetryable(response.status),
      };
      return llmError;
    } catch (e) {
      return {
        type: 'server_error',
        statusCode: response.status,
        message: `HTTP ${response.status}`,
        suggestion: this.getErrorSuggestion(response.status),
        provider: 'proxy',
        retryable: this.isRetryable(response.status),
      };
    }
  }

  private mapErrorType(statusCode: number, errorCode?: string): LLMError['type'] {
    if (statusCode === 401 || statusCode === 403) {
      return 'auth_error';
    }
    if (statusCode === 429) {
      return 'rate_limit';
    }
    if (statusCode === 404) {
      return 'model_not_found';
    }
    if (statusCode === 413 || errorCode === 'context_length_exceeded') {
      return 'context_length';
    }
    if (statusCode >= 500) {
      return 'server_error';
    }
    return 'server_error';
  }

  private getErrorSuggestion(statusCode: number): string {
    switch (statusCode) {
      case 401:
        return 'Please login to use LLM features.';
      case 403:
        return 'Your plan does not have access to this model. Please upgrade.';
      case 429:
        return 'Rate limit exceeded. Please wait and try again.';
      case 404:
        return 'Model not found. Please check your configuration.';
      case 413:
        return 'Request too large. Try reducing the context length.';
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  private isRetryable(statusCode: number): boolean {
    return statusCode === 429 || statusCode >= 500;
  }

  private createAuthError(): LLMError {
    return {
      type: 'auth_error',
      statusCode: 401,
      message: 'Not authenticated',
      suggestion: 'Please login to use LLM features.',
      provider: 'proxy',
      retryable: false,
    };
  }

  private createNetworkError(error: unknown): LLMError {
    return {
      type: 'network_error',
      statusCode: 0,
      message: error instanceof Error ? error.message : String(error),
      suggestion: 'Check your network connection and try again.',
      provider: 'proxy',
      retryable: true,
    };
  }

  private isLLMError(error: unknown): error is LLMError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'statusCode' in error &&
      'provider' in error
    );
  }
}
