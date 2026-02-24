import { LLMRequest, LLMResponse } from '../ILLMAdapter';

/**
 * Request cache entry
 */
interface CacheEntry {
	request: LLMRequest;
	response: LLMResponse;
	timestamp: number;
}

/**
 * Pending request
 */
interface PendingRequest {
	resolve: (response: LLMResponse) => void;
	reject: (error: Error) => void;
}

/**
 * LLM request optimizer
 * Provides deduplication and caching for LLM requests
 */
export class LLMRequestOptimizer {
	private cache: Map<string, CacheEntry> = new Map();
	private pendingRequests: Map<string, PendingRequest[]> = new Map();
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
	private readonly MAX_CACHE_SIZE = 100;

	/**
	 * Optimize request (deduplicate and cache)
	 */
	async optimize(
		request: LLMRequest,
		executor: (req: LLMRequest) => Promise<LLMResponse>
	): Promise<LLMResponse> {
		const key = this.getRequestKey(request);

		// Check cache
		const cached = this.getFromCache(key);
		if (cached) {
			return cached;
		}

		// Check if request is already pending
		const pending = this.pendingRequests.get(key);
		if (pending) {
			// Wait for existing request
			return new Promise((resolve, reject) => {
				pending.push({ resolve, reject });
			});
		}

		// Execute new request
		this.pendingRequests.set(key, []);

		try {
			const response = await executor(request);

			// Cache response
			this.addToCache(key, request, response);

			// Resolve pending requests
			const waitingRequests = this.pendingRequests.get(key) || [];
			waitingRequests.forEach(({ resolve }) => resolve(response));

			this.pendingRequests.delete(key);

			return response;
		} catch (error) {
			// Reject pending requests
			const waitingRequests = this.pendingRequests.get(key) || [];
			waitingRequests.forEach(({ reject }) => reject(error as Error));

			this.pendingRequests.delete(key);

			throw error;
		}
	}

	/**
	 * Generate cache key from request
	 */
	private getRequestKey(request: LLMRequest): string {
		// Create deterministic key from request
		const parts = [
			JSON.stringify(request.messages),
			request.maxTokens || '',
			request.temperature || '',
			JSON.stringify(request.tools || []),
		];

		return parts.join('|');
	}

	/**
	 * Get from cache
	 */
	private getFromCache(key: string): LLMResponse | null {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		// Check if expired
		if (Date.now() - entry.timestamp > this.CACHE_TTL) {
			this.cache.delete(key);
			return null;
		}

		return entry.response;
	}

	/**
	 * Add to cache
	 */
	private addToCache(key: string, request: LLMRequest, response: LLMResponse): void {
		// Evict old entries if cache is full
		if (this.cache.size >= this.MAX_CACHE_SIZE) {
			const oldestKey = this.cache.keys().next().value as string | undefined;
			if (oldestKey) {
				this.cache.delete(oldestKey);
			}
		}

		this.cache.set(key, {
			request,
			response,
			timestamp: Date.now(),
		});
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get cache stats
	 */
	getStats(): { size: number; pending: number } {
		return {
			size: this.cache.size,
			pending: this.pendingRequests.size,
		};
	}
}
