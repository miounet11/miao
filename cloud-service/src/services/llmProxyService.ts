import { getPostgresPool } from '../config/database';
import { QuotaService } from './quotaService';
import type { SubscriptionPlan } from './subscriptionService';

/**
 * LLM request
 */
export interface LLMProxyRequest {
	model: string;
	messages: Array<{ role: string; content: string }>;
	maxTokens?: number;
	temperature?: number;
	stream?: boolean;
}

/**
 * LLM response
 */
export interface LLMProxyResponse {
	content: string;
	model: string;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

/**
 * Token usage info
 */
export interface TokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

/**
 * Allowed models by plan
 */
const ALLOWED_MODELS: Record<SubscriptionPlan, string[]> = {
	free: ['gpt-3.5-turbo', 'claude-3-5-haiku-20241022'],
	pro: [
		'gpt-3.5-turbo',
		'gpt-4o-mini',
		'claude-3-5-haiku-20241022',
		'claude-3-5-sonnet-20241022',
	],
	business: [
		'gpt-3.5-turbo',
		'gpt-4o-mini',
		'gpt-4o',
		'claude-3-5-haiku-20241022',
		'claude-3-5-sonnet-20241022',
		'claude-opus-4-20250514',
	],
};

/**
 * LLM Proxy Service
 */
export class LLMProxyService {
	private quotaService: QuotaService;

	constructor() {
		this.quotaService = new QuotaService();
	}

	/**
	 * Complete (non-streaming) request
	 */
	async complete(userId: number, request: LLMProxyRequest): Promise<LLMProxyResponse> {
		// Get user plan
		const plan = await this.getUserPlan(userId);

		// Check model permission
		if (!this.isModelAllowed(request.model, plan)) {
			throw new Error(
				`Model "${request.model}" is not available in your plan. Upgrade to access this model.`,
				{ cause: { statusCode: 403 } } as any
			);
		}

		// Check and consume quota
		const quotaResult = await this.quotaService.consumeQuota(userId, plan);
		if (!quotaResult.allowed) {
			const error: any = new Error(
				`Quota exceeded. ${quotaResult.remaining} requests remaining. Resets at ${quotaResult.resetAt.toISOString()}. ${quotaResult.upgradeSuggestion}`
			);
			error.statusCode = 429;
			error.quotaInfo = quotaResult;
			throw error;
		}

		// Forward request to upstream LLM provider
		const response = await this.forwardToUpstream(request);

		// Record usage
		await this.recordUsage(userId, request.model, response.usage);

		return response;
	}

	/**
	 * Stream request
	 */
	async *stream(userId: number, request: LLMProxyRequest): AsyncIterable<string> {
		// Get user plan
		const plan = await this.getUserPlan(userId);

		// Check model permission
		if (!this.isModelAllowed(request.model, plan)) {
			throw new Error(
				`Model "${request.model}" is not available in your plan. Upgrade to access this model.`,
				{ cause: { statusCode: 403 } } as any
			);
		}

		// Check and consume quota
		const quotaResult = await this.quotaService.consumeQuota(userId, plan);
		if (!quotaResult.allowed) {
			const error: any = new Error(
				`Quota exceeded. ${quotaResult.remaining} requests remaining. Resets at ${quotaResult.resetAt.toISOString()}. ${quotaResult.upgradeSuggestion}`
			);
			error.statusCode = 429;
			error.quotaInfo = quotaResult;
			throw error;
		}

		// Forward stream to upstream
		let totalTokens = 0;
		for await (const chunk of this.forwardStreamToUpstream(request)) {
			yield chunk;
			// Estimate tokens (rough approximation)
			totalTokens += chunk.length / 4;
		}

		// Record usage (estimated)
		await this.recordUsage(userId, request.model, {
			promptTokens: Math.floor(JSON.stringify(request.messages).length / 4),
			completionTokens: Math.floor(totalTokens),
			totalTokens: Math.floor(totalTokens + JSON.stringify(request.messages).length / 4),
		});
	}

	/**
	 * Get user plan
	 */
	private async getUserPlan(userId: number): Promise<SubscriptionPlan> {
		const pool = getPostgresPool();
		const result = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);

		if (result.rows.length === 0) {
			throw new Error('User not found');
		}

		return result.rows[0].plan as SubscriptionPlan;
	}

	/**
	 * Check if model is allowed for plan
	 */
	private isModelAllowed(model: string, plan: SubscriptionPlan): boolean {
		const allowedModels = ALLOWED_MODELS[plan];
		return allowedModels.includes(model);
	}

	/**
	 * Forward request to upstream LLM provider
	 */
	private async forwardToUpstream(request: LLMProxyRequest): Promise<LLMProxyResponse> {
		// Determine provider based on model
		const provider = this.getProviderForModel(request.model);

		if (provider === 'openai') {
			return this.forwardToOpenAI(request);
		} else if (provider === 'anthropic') {
			return this.forwardToAnthropic(request);
		} else {
			throw new Error(`Unsupported model: ${request.model}`);
		}
	}

	/**
	 * Forward stream to upstream LLM provider
	 */
	private async *forwardStreamToUpstream(request: LLMProxyRequest): AsyncIterable<string> {
		const provider = this.getProviderForModel(request.model);

		if (provider === 'openai') {
			yield* this.streamFromOpenAI(request);
		} else if (provider === 'anthropic') {
			yield* this.streamFromAnthropic(request);
		} else {
			throw new Error(`Unsupported model: ${request.model}`);
		}
	}

	/**
	 * Get provider for model
	 */
	private getProviderForModel(model: string): 'openai' | 'anthropic' {
		if (model.startsWith('gpt-')) {
			return 'openai';
		} else if (model.startsWith('claude-')) {
			return 'anthropic';
		} else {
			throw new Error(`Unknown model: ${model}`);
		}
	}

	/**
	 * Forward to OpenAI
	 */
	private async forwardToOpenAI(request: LLMProxyRequest): Promise<LLMProxyResponse> {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error('OpenAI API key not configured');
		}

		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: request.model,
				messages: request.messages,
				max_tokens: request.maxTokens,
				temperature: request.temperature,
			}),
		});

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.statusText}`);
		}

		const data = await response.json();

		return {
			content: data.choices[0].message.content,
			model: data.model,
			usage: {
				promptTokens: data.usage.prompt_tokens,
				completionTokens: data.usage.completion_tokens,
				totalTokens: data.usage.total_tokens,
			},
		};
	}

	/**
	 * Stream from OpenAI
	 */
	private async *streamFromOpenAI(request: LLMProxyRequest): AsyncIterable<string> {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error('OpenAI API key not configured');
		}

		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: request.model,
				messages: request.messages,
				max_tokens: request.maxTokens,
				temperature: request.temperature,
				stream: true,
			}),
		});

		if (!response.ok || !response.body) {
			throw new Error(`OpenAI API error: ${response.statusText}`);
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value);
			yield chunk;
		}
	}

	/**
	 * Forward to Anthropic
	 */
	private async forwardToAnthropic(request: LLMProxyRequest): Promise<LLMProxyResponse> {
		const apiKey = process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			throw new Error('Anthropic API key not configured');
		}

		const systemMessage = request.messages.find(m => m.role === 'system')?.content;
		const userMessages = request.messages.filter(m => m.role !== 'system');

		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: request.model,
				max_tokens: request.maxTokens || 4096,
				messages: userMessages,
				...(systemMessage ? { system: systemMessage } : {}),
			}),
		});

		if (!response.ok) {
			throw new Error(`Anthropic API error: ${response.statusText}`);
		}

		const data = await response.json();

		return {
			content: data.content[0].text,
			model: data.model,
			usage: {
				promptTokens: data.usage.input_tokens,
				completionTokens: data.usage.output_tokens,
				totalTokens: data.usage.input_tokens + data.usage.output_tokens,
			},
		};
	}

	/**
	 * Stream from Anthropic
	 */
	private async *streamFromAnthropic(request: LLMProxyRequest): AsyncIterable<string> {
		const apiKey = process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			throw new Error('Anthropic API key not configured');
		}

		const systemMessage = request.messages.find(m => m.role === 'system')?.content;
		const userMessages = request.messages.filter(m => m.role !== 'system');

		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: request.model,
				max_tokens: request.maxTokens || 4096,
				messages: userMessages,
				stream: true,
				...(systemMessage ? { system: systemMessage } : {}),
			}),
		});

		if (!response.ok || !response.body) {
			throw new Error(`Anthropic API error: ${response.statusText}`);
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value);
			yield chunk;
		}
	}

	/**
	 * Record usage
	 */
	private async recordUsage(userId: number, model: string, usage: TokenUsage): Promise<void> {
		const pool = getPostgresPool();
		await pool.query(
			`INSERT INTO usage_records (user_id, model, prompt_tokens, completion_tokens, total_tokens)
			 VALUES ($1, $2, $3, $4, $5)`,
			[userId, model, usage.promptTokens, usage.completionTokens, usage.totalTokens]
		);
	}
}
