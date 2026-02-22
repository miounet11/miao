/**
 * AI 模型提供商接口
 */
export interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  apiKey?: string;
  baseUrl?: string;
}

/**
 * AI 模型
 */
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  costPer1kTokens: number;
  supportsStreaming: boolean;
}

/**
 * AI 请求
 */
export interface AIRequest {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * AI 响应
 */
export interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
  finishReason: 'stop' | 'length' | 'error';
  cost?: number;
}

/**
 * 流式响应回调
 */
export type StreamCallback = (chunk: string) => void;

/**
 * AI 客户端接口
 */
export interface IAIClient {
  complete(request: AIRequest): Promise<AIResponse>;
  completeStream(request: AIRequest, callback: StreamCallback): Promise<AIResponse>;
  listModels(): Promise<AIModel[]>;
}
