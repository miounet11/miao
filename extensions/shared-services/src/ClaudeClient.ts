import { AIRequest, AIResponse, IAIClient, AIModel, StreamCallback } from './AIProvider';

/**
 * Claude API 客户端
 */
export class ClaudeClient implements IAIClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1';

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
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens || 4096,
          temperature: request.temperature || 0.7,
          system: request.systemPrompt,
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error: any = await response.json();
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
      }

      const data: any = await response.json();

      // 计算 token 使用
      const tokensUsed = data.usage.input_tokens + data.usage.output_tokens;

      // 计算成本
      const cost = this.calculateCost(request.model, tokensUsed);

      return {
        content: data.content[0].text,
        tokensUsed,
        model: request.model,
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
        cost,
      };
    } catch (error) {
      throw new Error(
        `Claude API request failed: ${error instanceof Error ? error.message : String(error)}`
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
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens || 4096,
          temperature: request.temperature || 0.7,
          system: request.systemPrompt,
          stream: true,
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let tokensUsed = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'content_block_delta') {
              const text = data.delta.text;
              fullContent += text;
              callback(text);
            } else if (data.type === 'message_delta') {
              tokensUsed = data.usage?.output_tokens || 0;
            }
          }
        }
      }

      return {
        content: fullContent,
        tokensUsed,
        model: request.model,
        finishReason: 'stop',
        cost: this.calculateCost(request.model, tokensUsed),
      };
    } catch (error) {
      throw new Error(
        `Claude streaming failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 列出模型
   */
  async listModels(): Promise<AIModel[]> {
    return [
      {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        provider: 'anthropic',
        maxTokens: 200000,
        costPer1kTokens: 0.015,
        supportsStreaming: true,
      },
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        provider: 'anthropic',
        maxTokens: 200000,
        costPer1kTokens: 0.003,
        supportsStreaming: true,
      },
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        provider: 'anthropic',
        maxTokens: 200000,
        costPer1kTokens: 0.0008,
        supportsStreaming: true,
      },
    ];
  }

  /**
   * 计算成本
   */
  private calculateCost(model: string, tokens: number): number {
    const costMap: Record<string, number> = {
      'claude-opus-4-6': 0.015,
      'claude-sonnet-4-6': 0.003,
      'claude-haiku-4-5': 0.0008,
    };

    const costPer1k = costMap[model] || 0.003;
    return (tokens / 1000) * costPer1k;
  }
}
