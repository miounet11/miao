import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider, type LLMError } from '../llm/providers/openai-provider';
import type { LLMProviderConfig, LLMRequest } from '../ILLMAdapter';
import OpenAI from 'openai';

/**
 * Unit tests for OpenAI Provider implementation (Task 1.1)
 * Validates: Requirements 1.1, 1.3
 */

function makeHeaders(): Headers {
	return new Headers({ 'x-request-id': 'test-req-id' });
}

function makeAPIError(status: number, message: string): OpenAI.APIError {
	return new OpenAI.APIError(status, { message }, message, makeHeaders());
}

function makeConfig(overrides?: Partial<LLMProviderConfig>): LLMProviderConfig {
	return {
		type: 'openai',
		apiKey: 'test-api-key',
		model: 'gpt-4o',
		...overrides,
	};
}

function makeRequest(overrides?: Partial<LLMRequest>): LLMRequest {
	return {
		messages: [{ role: 'user', content: 'Hello' }],
		...overrides,
	};
}

describe('OpenAIProvider', () => {
	describe('constructor', () => {
		it('should create provider with API key', () => {
			const provider = new OpenAIProvider(makeConfig());
			expect(provider).toBeDefined();
		});

		it('should create provider with custom baseUrl', () => {
			const provider = new OpenAIProvider(makeConfig({ baseUrl: 'https://custom.api.com/v1' }));
			expect(provider).toBeDefined();
		});
	});

	describe('complete()', () => {
		it('should call OpenAI SDK and return LLMResponse', async () => {
			const provider = new OpenAIProvider(makeConfig());

			// Mock the internal client
			const mockCreate = vi.fn().mockResolvedValue({
				choices: [{
					message: { content: 'Hello back!', tool_calls: undefined },
					finish_reason: 'stop',
				}],
				usage: { prompt_tokens: 10, completion_tokens: 5 },
				model: 'gpt-4o',
			});
			(provider as any).client = { chat: { completions: { create: mockCreate } } };

			const response = await provider.complete(makeRequest());

			expect(response.content).toBe('Hello back!');
			expect(response.usage.promptTokens).toBe(10);
			expect(response.usage.completionTokens).toBe(5);
			expect(response.model).toBe('gpt-4o');
			expect(response.toolCalls).toBeUndefined();
		});

		it('should pass tools to OpenAI SDK when provided', async () => {
			const provider = new OpenAIProvider(makeConfig());

			const mockCreate = vi.fn().mockResolvedValue({
				choices: [{
					message: {
						content: null,
						tool_calls: [{
							id: 'call_1',
							type: 'function',
							function: { name: 'get_weather', arguments: '{"city":"Tokyo"}' },
						}],
					},
					finish_reason: 'tool_calls',
				}],
				usage: { prompt_tokens: 20, completion_tokens: 10 },
				model: 'gpt-4o',
			});
			(provider as any).client = { chat: { completions: { create: mockCreate } } };

			const response = await provider.complete(makeRequest({
				tools: [{
					name: 'get_weather',
					description: 'Get weather for a city',
					parameters: { type: 'object', properties: { city: { type: 'string' } } },
				}],
			}));

			expect(response.toolCalls).toHaveLength(1);
			expect(response.toolCalls![0].name).toBe('get_weather');
			expect(response.toolCalls![0].arguments).toEqual({ city: 'Tokyo' });

			// Verify tools were passed to SDK
			expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
				tools: expect.arrayContaining([
					expect.objectContaining({
						type: 'function',
						function: expect.objectContaining({ name: 'get_weather' }),
					}),
				]),
			}));
		});

		it('should map auth error (401) to structured LLMError', async () => {
			const provider = new OpenAIProvider(makeConfig());

			const apiError = makeAPIError(401, 'Invalid API key');
			const mockCreate = vi.fn().mockRejectedValue(apiError);
			(provider as any).client = { chat: { completions: { create: mockCreate } } };

			try {
				await provider.complete(makeRequest());
				expect.fail('Should have thrown');
			} catch (err) {
				const llmErr = err as LLMError;
				expect(llmErr.type).toBe('auth_error');
				expect(llmErr.statusCode).toBe(401);
				expect(llmErr.provider).toBe('openai');
				expect(llmErr.retryable).toBe(false);
				expect(llmErr.suggestion).toContain('API key');
			}
		});

		it('should map rate limit error (429) to structured LLMError', async () => {
			const provider = new OpenAIProvider(makeConfig());

			const apiError = makeAPIError(429, 'Rate limit exceeded');
			const mockCreate = vi.fn().mockRejectedValue(apiError);
			(provider as any).client = { chat: { completions: { create: mockCreate } } };

			try {
				await provider.complete(makeRequest());
				expect.fail('Should have thrown');
			} catch (err) {
				const llmErr = err as LLMError;
				expect(llmErr.type).toBe('rate_limit');
				expect(llmErr.statusCode).toBe(429);
				expect(llmErr.retryable).toBe(true);
			}
		});

		it('should map 404 to model_not_found error', async () => {
			const provider = new OpenAIProvider(makeConfig());

			const apiError = makeAPIError(404, 'Model not found');
			const mockCreate = vi.fn().mockRejectedValue(apiError);
			(provider as any).client = { chat: { completions: { create: mockCreate } } };

			try {
				await provider.complete(makeRequest());
				expect.fail('Should have thrown');
			} catch (err) {
				const llmErr = err as LLMError;
				expect(llmErr.type).toBe('model_not_found');
				expect(llmErr.retryable).toBe(false);
			}
		});

		it('should map network errors to network_error type', async () => {
			const provider = new OpenAIProvider(makeConfig());

			const mockCreate = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
			(provider as any).client = { chat: { completions: { create: mockCreate } } };

			try {
				await provider.complete(makeRequest());
				expect.fail('Should have thrown');
			} catch (err) {
				const llmErr = err as LLMError;
				expect(llmErr.type).toBe('network_error');
				expect(llmErr.retryable).toBe(true);
				expect(llmErr.suggestion).toContain('network');
			}
		});

		it('should map 500 server errors as retryable', async () => {
			const provider = new OpenAIProvider(makeConfig());

			const apiError = makeAPIError(500, 'Internal server error');
			const mockCreate = vi.fn().mockRejectedValue(apiError);
			(provider as any).client = { chat: { completions: { create: mockCreate } } };

			try {
				await provider.complete(makeRequest());
				expect.fail('Should have thrown');
			} catch (err) {
				const llmErr = err as LLMError;
				expect(llmErr.type).toBe('server_error');
				expect(llmErr.retryable).toBe(true);
			}
		});
	});

	describe('stream()', () => {
		it('should yield LLMChunk objects from streaming response', async () => {
			const provider = new OpenAIProvider(makeConfig());

			// Create an async iterable mock for the stream
			const mockChunks = [
				{ choices: [{ delta: { content: 'Hello' }, finish_reason: null }] },
				{ choices: [{ delta: { content: ' world' }, finish_reason: null }] },
				{ choices: [{ delta: { content: '' }, finish_reason: 'stop' }] },
			];

			const mockCreate = vi.fn().mockResolvedValue({
				[Symbol.asyncIterator]: async function* () {
					for (const chunk of mockChunks) {
						yield chunk;
					}
				},
			});
			(provider as any).client = { chat: { completions: { create: mockCreate } } };

			const chunks = [];
			for await (const chunk of provider.stream(makeRequest())) {
				chunks.push(chunk);
			}

			expect(chunks).toHaveLength(3);
			expect(chunks[0]).toEqual({ content: 'Hello', done: false });
			expect(chunks[1]).toEqual({ content: ' world', done: false });
			expect(chunks[2]).toEqual({ content: '', done: true });

			// Verify stream: true was passed
			expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stream: true }));
		});

		it('should throw structured error on stream failure', async () => {
			const provider = new OpenAIProvider(makeConfig());

			const apiError = makeAPIError(401, 'Unauthorized');
			const mockCreate = vi.fn().mockRejectedValue(apiError);
			(provider as any).client = { chat: { completions: { create: mockCreate } } };

			try {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				for await (const _chunk of provider.stream(makeRequest())) {
					// should not reach here
				}
				expect.fail('Should have thrown');
			} catch (err) {
				const llmErr = err as LLMError;
				expect(llmErr.type).toBe('auth_error');
			}
		});
	});

	describe('getStatus()', () => {
		it('should return connected status on success', async () => {
			const provider = new OpenAIProvider(makeConfig());

			const mockList = vi.fn().mockResolvedValue([]);
			(provider as any).client = { models: { list: mockList } };

			const status = await provider.getStatus();
			expect(status.connected).toBe(true);
			expect(status.provider).toBe('openai');
			expect(status.model).toBe('gpt-4o');
		});

		it('should return disconnected status on failure', async () => {
			const provider = new OpenAIProvider(makeConfig());

			const mockList = vi.fn().mockRejectedValue(new Error('Connection refused'));
			(provider as any).client = { models: { list: mockList } };

			const status = await provider.getStatus();
			expect(status.connected).toBe(false);
			expect(status.error).toContain('Connection refused');
		});
	});

	describe('listModels()', () => {
		it('should return default models on API failure', async () => {
			const provider = new OpenAIProvider(makeConfig());

			const mockList = vi.fn().mockRejectedValue(new Error('API error'));
			(provider as any).client = { models: { list: mockList } };

			const models = await provider.listModels();
			expect(models.length).toBeGreaterThan(0);
			expect(models.every(m => m.provider === 'openai')).toBe(true);
		});
	});
});
