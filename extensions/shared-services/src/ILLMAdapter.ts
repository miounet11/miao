/**
 * LLM Adapter Layer for unified model access
 * Supports OpenAI, Anthropic, and Ollama providers
 */
export interface ILLMAdapter {
  /**
   * Send a completion request
   */
  complete(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Stream completion response
   */
  stream(request: LLMRequest): AsyncIterable<LLMChunk>;

  /**
   * Switch LLM provider without restart
   */
  setProvider(provider: LLMProviderConfig): void;

  /**
   * Get current provider status
   */
  getProviderStatus(): Promise<ProviderStatus>;

  /**
   * List available models
   */
  listModels(): Promise<ModelInfo[]>;
}

export interface LLMProviderConfig {
  type: 'openai' | 'anthropic' | 'ollama';
  apiKey?: string; // For OpenAI/Anthropic
  baseUrl?: string; // For Ollama or custom endpoints
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMRequest {
  messages: LLMMessage[];
  tools?: LLMTool[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
}

export interface LLMResponse {
  content: string;
  toolCalls?: LLMToolCall[];
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}

export interface LLMChunk {
  content: string;
  done: boolean;
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: JSONSchema;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ProviderStatus {
  connected: boolean;
  provider: string;
  model: string;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
}

export type JSONSchema = Record<string, unknown>;
