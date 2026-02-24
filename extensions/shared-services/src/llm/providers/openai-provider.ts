import OpenAI from 'openai';
import type {
	LLMRequest,
	LLMResponse,
	LLMChunk,
	LLMProviderConfig,
	ProviderStatus,
	ModelInfo,
} from '../../ILLMAdapter';
import { BaseLLMProvider } from '../../LLMAdapter';

import type { LLMError } from '../llm-error';

/**
 * OpenAI provider interface
 */
export interface IOpenAIProvider {
	complete(request: LLMRequest): Promise<LLMResponse>;
	stream(request: LLMRequest): AsyncIterable<LLMChunk>;
	getStatus(): Promise<ProviderStatus>;
	listModels(): Promise<ModelInfo[]>;
}

/**
 * Real OpenAI provider using the official openai SDK.
 * Implements complete() for non-streaming and stream() as AsyncIterable<LLMChunk>.
 */
export class OpenAIProvider extends BaseLLMProvider implements IOpenAIProvider {
	private client: OpenAI;

	constructor(config: LLMProviderConfig) {
		super(config);
		this.client = new OpenAI({
			apiKey: config.apiKey,
			...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
		});
	}

	/**
	 * Send a non-streaming completion request via OpenAI SDK.
	 */
	async complete(request: LLMRequest): Promise<LLMResponse> {
		try {
			const response = await this.client.chat.completions.create({
				model: this.config.model,
				messages: request.messages.map((msg) => ({
					role: msg.role as 'system' | 'user' | 'assistant',
					content: msg.content,
				})),
				max_tokens: request.maxTokens ?? this.config.maxTokens,
				temperature: request.temperature ?? this.config.temperature,
				...(request.tools && request.tools.length > 0
					? {
						tools: request.tools.map((tool) => ({
							type: 'function' as const,
							function: {
								name: tool.name,
								description: tool.description,
								parameters: tool.parameters,
							},
						})),
					}
					: {}),
			});

			const choice = response.choices[0];
			const toolCalls = choice?.message?.tool_calls
				?.filter((tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { type: 'function' } => tc.type === 'function')
				.map((tc) => ({
					id: tc.id,
					name: tc.function.name,
					arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
				}));

			return {
				content: choice?.message?.content ?? '',
				toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
				usage: {
					promptTokens: response.usage?.prompt_tokens ?? 0,
					completionTokens: response.usage?.completion_tokens ?? 0,
				},
				model: response.model,
			};
		} catch (error) {
			throw this.mapError(error);
		}
	}

	/**
	 * Stream completion response via AsyncIterable, yielding LLMChunk objects.
	 */
	async *stream(request: LLMRequest): AsyncIterable<LLMChunk> {
		try {
			const stream = await this.client.chat.completions.create({
				model: this.config.model,
				messages: request.messages.map((msg) => ({
					role: msg.role as 'system' | 'user' | 'assistant',
					content: msg.content,
				})),
				max_tokens: request.maxTokens ?? this.config.maxTokens,
				temperature: request.temperature ?? this.config.temperature,
				stream: true,
			});

			for await (const chunk of stream) {
				const delta = chunk.choices[0]?.delta;
				const content = delta?.content ?? '';
				const finishReason = chunk.choices[0]?.finish_reason;

				yield {
					content,
					done: finishReason === 'stop',
				};
			}
		} catch (error) {
			throw this.mapError(error);
		}
	}

	/**
	 * Check provider connectivity by listing models.
	 */
	async getStatus(): Promise<ProviderStatus> {
		try {
			await this.client.models.list();
			return {
				connected: true,
				provider: 'openai',
				model: this.config.model,
			};
		} catch (error) {
			return {
				connected: false,
				provider: 'openai',
				model: this.config.model,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * List available OpenAI models.
	 */
	async listModels(): Promise<ModelInfo[]> {
		try {
			const response = await this.client.models.list();
			const chatModels = [];
			for await (const model of response) {
				if (model.id.startsWith('gpt-')) {
					chatModels.push({
						id: model.id,
						name: model.id,
						provider: 'openai',
						contextWindow: this.getContextWindow(model.id),
					});
				}
			}
			return chatModels.length > 0 ? chatModels : this.getDefaultModels();
		} catch {
			return this.getDefaultModels();
		}
	}

	/**
	 * Map SDK/API errors to structured LLMError.
	 */
	private mapError(error: unknown): LLMError {
		if (error instanceof OpenAI.APIError) {
			const status = error.status ?? 500;

			if (status === 401) {
				return {
					type: 'auth_error',
					statusCode: status,
					message: error.message,
					suggestion: 'Check your OpenAI API key is valid and has not expired.',
					provider: 'openai',
					retryable: false,
				};
			}
			if (status === 429) {
				return {
					type: 'rate_limit',
					statusCode: status,
					message: error.message,
					suggestion: 'You have exceeded the rate limit. Wait a moment and try again, or upgrade your plan.',
					provider: 'openai',
					retryable: true,
				};
			}
			if (status === 404) {
				return {
					type: 'model_not_found',
					statusCode: status,
					message: error.message,
					suggestion: `The model "${this.config.model}" was not found. Check the model name or your API access.`,
					provider: 'openai',
					retryable: false,
				};
			}
			if (error.message?.includes('context_length') || error.message?.includes('maximum context length')) {
				return {
					type: 'context_length',
					statusCode: status,
					message: error.message,
					suggestion: 'Reduce the input length or use a model with a larger context window.',
					provider: 'openai',
					retryable: false,
				};
			}

			return {
				type: 'server_error',
				statusCode: status,
				message: error.message,
				suggestion: 'An OpenAI server error occurred. Try again later.',
				provider: 'openai',
				retryable: status >= 500,
			};
		}

		return {
			type: 'network_error',
			statusCode: 0,
			message: error instanceof Error ? error.message : String(error),
			suggestion: 'Check your network connection and try again.',
			provider: 'openai',
			retryable: true,
		};
	}

	private getContextWindow(modelId: string): number {
		const contextWindows: Record<string, number> = {
			'gpt-4': 8192,
			'gpt-4-turbo': 128000,
			'gpt-4o': 128000,
			'gpt-4o-mini': 128000,
			'gpt-3.5-turbo': 16385,
		};
		// Match by prefix for versioned model names like gpt-4-0613
		for (const [prefix, window] of Object.entries(contextWindows)) {
			if (modelId.startsWith(prefix)) {
				return window;
			}
		}
		return 8192;
	}

	private getDefaultModels(): ModelInfo[] {
		return [
			{ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000 },
			{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000 },
			{ id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000 },
			{ id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', contextWindow: 16385 },
		];
	}
}
