import Anthropic from '@anthropic-ai/sdk';
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
 * Anthropic provider interface
 */
export interface IAnthropicProvider {
	complete(request: LLMRequest): Promise<LLMResponse>;
	stream(request: LLMRequest): AsyncIterable<LLMChunk>;
	getStatus(): Promise<ProviderStatus>;
	listModels(): Promise<ModelInfo[]>;
}

/**
 * Real Anthropic provider using the official @anthropic-ai/sdk.
 */
export class AnthropicProvider extends BaseLLMProvider implements IAnthropicProvider {
	private client: Anthropic;

	constructor(config: LLMProviderConfig) {
		super(config);
		this.client = new Anthropic({
			apiKey: config.apiKey,
			...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
		});
	}

	/**
	 * Send a non-streaming completion request via Anthropic SDK.
	 */
	async complete(request: LLMRequest): Promise<LLMResponse> {
		try {
			const systemMessage = request.messages.find(m => m.role === 'system')?.content;
			const userMessages = request.messages.filter(m => m.role !== 'system');

			const response = await this.client.messages.create({
				model: this.config.model,
				max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
				temperature: request.temperature ?? this.config.temperature,
				...(systemMessage ? { system: systemMessage } : {}),
				messages: userMessages.map((msg) => ({
					role: msg.role === 'assistant' ? 'assistant' : 'user',
					content: msg.content,
				})),
				...(request.tools && request.tools.length > 0
					? {
						tools: request.tools.map((tool) => ({
							name: tool.name,
							description: tool.description,
							input_schema: {
								type: 'object',
								...tool.parameters,
							},
						})),
					}
					: {}),
			});

			const textContent = response.content.find(c => c.type === 'text');
			const toolUseBlocks = response.content.filter((c): c is Anthropic.Messages.ToolUseBlock => c.type === 'tool_use');

			const toolCalls = toolUseBlocks.length > 0
				? toolUseBlocks.map((tc) => ({
					id: tc.id,
					name: tc.name,
					arguments: tc.input as Record<string, unknown>,
				}))
				: undefined;

			return {
				content: textContent && textContent.type === 'text' ? textContent.text : '',
				toolCalls,
				usage: {
					promptTokens: response.usage.input_tokens,
					completionTokens: response.usage.output_tokens,
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
			const systemMessage = request.messages.find(m => m.role === 'system')?.content;
			const userMessages = request.messages.filter(m => m.role !== 'system');

			const stream = await this.client.messages.stream({
				model: this.config.model,
				max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
				temperature: request.temperature ?? this.config.temperature,
				...(systemMessage ? { system: systemMessage } : {}),
				messages: userMessages.map((msg) => ({
					role: msg.role === 'assistant' ? 'assistant' : 'user',
					content: msg.content,
				})),
			});

			for await (const event of stream) {
				if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
					yield {
						content: event.delta.text,
						done: false,
					};
				} else if (event.type === 'message_stop') {
					yield {
						content: '',
						done: true,
					};
				}
			}
		} catch (error) {
			throw this.mapError(error);
		}
	}

	/**
	 * Check provider connectivity.
	 */
	async getStatus(): Promise<ProviderStatus> {
		try {
			await this.client.messages.create({
				model: this.config.model,
				max_tokens: 1,
				messages: [{ role: 'user', content: 'test' }],
			});
			return {
				connected: true,
				provider: 'anthropic',
				model: this.config.model,
			};
		} catch (error) {
			return {
				connected: false,
				provider: 'anthropic',
				model: this.config.model,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * List available Anthropic models.
	 */
	async listModels(): Promise<ModelInfo[]> {
		return [
			{ id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic', contextWindow: 200000 },
			{ id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', contextWindow: 200000 },
			{ id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', contextWindow: 200000 },
			{ id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', contextWindow: 200000 },
		];
	}

	/**
	 * Map SDK/API errors to structured LLMError.
	 */
	private mapError(error: unknown): LLMError {
		if (error instanceof Anthropic.APIError) {
			const status = error.status ?? 500;

			if (status === 401) {
				return {
					type: 'auth_error',
					statusCode: status,
					message: error.message,
					suggestion: 'Check your Anthropic API key is valid.',
					provider: 'anthropic',
					retryable: false,
				};
			}
			if (status === 429) {
				return {
					type: 'rate_limit',
					statusCode: status,
					message: error.message,
					suggestion: 'Rate limit exceeded. Wait and retry, or upgrade your plan.',
					provider: 'anthropic',
					retryable: true,
				};
			}
			if (status === 404) {
				return {
					type: 'model_not_found',
					statusCode: status,
					message: error.message,
					suggestion: `Model "${this.config.model}" not found. Check model name or API access.`,
					provider: 'anthropic',
					retryable: false,
				};
			}
			if (error.message?.includes('prompt is too long') || error.message?.includes('maximum context length')) {
				return {
					type: 'context_length',
					statusCode: status,
					message: error.message,
					suggestion: 'Reduce input length or use a model with larger context.',
					provider: 'anthropic',
					retryable: false,
				};
			}

			return {
				type: 'server_error',
				statusCode: status,
				message: error.message,
				suggestion: 'Anthropic server error. Try again later.',
				provider: 'anthropic',
				retryable: status >= 500,
			};
		}

		return {
			type: 'network_error',
			statusCode: 0,
			message: error instanceof Error ? error.message : String(error),
			suggestion: 'Check network connection and retry.',
			provider: 'anthropic',
			retryable: true,
		};
	}
}
