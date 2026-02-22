import { AIRequest, AIResponse, IAIClient, AIModel, StreamCallback } from './AIProvider';

/**
 * OpenAI API 客户端
 */
export class OpenAIClient implements IAIClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
  }

  /**
   * 完成请求
   */
  async complete(request: AIRequest): Promise<AIResponse> {
    try {
      const messages: any[] = [];

      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: request.prompt,
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 4096,
        }),
      });

      if (!response.ok) {
        const error: any = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data: any = await response.json();

      const tokensUsed = data.usage.total_tokens;
      const cost = this.calculateCost(request.model, tokensUsed);

      return {
        content: data.choices[0].message.content,
        tokensUsed,
        model: request.model,
        finishReason: data.choices[0].finish_reason === 'stop' ? 'stop' : 'length',
        cost,
      };
    } catch (error) {
      throw new Error(
        `OpenAI API request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 流式完成
   */
  async completeStream(
    request: AIRequest,
    callback: StreamCallback
  ): Promise<AIResponse> {
    try {
      const messages: any[] = [];

      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: request.prompt,
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 4096,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullContent += content;
                callback(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Estimate tokens (rough approximation)
      const tokensUsed = Math.ceil(fullContent.length / 4);

      return {
        content: fullContent,
        tokensUsed,
        model: request.model,
        finishReason: 'stop',
        cost: this.calculateCost(request.model, tokensUsed),
      };
    } catch (error) {
      throw new Error(
        `OpenAI streaming failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 列出模型
   */
  async listModels(): Promise<AIModel[]> {
    return [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        maxTokens: 128000,
        costPer1kTokens: 0.01,
        supportsStreaming: true,
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        maxTokens: 8192,
        costPer1kTokens: 0.03,
        supportsStreaming: true,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        maxTokens: 16384,
        costPer1kTokens: 0.0015,
        supportsStreaming: true,
      },
    ];
  }

  /**
   * 计算成本
   */
  private calculateCost(model: string, tokens: number): number {
    const costMap: Record<string, number> = {
      'gpt-4-turbo': 0.01,
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.0015,
    };

    const costPer1k = costMap[model] || 0.01;
    return (tokens / 1000) * costPer1k;
  }
}
