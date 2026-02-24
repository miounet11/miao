import * as vscode from 'vscode';
import type { ICompletionCache } from './inline-completion-provider';
import * as crypto from 'crypto';

/**
 * LRU cache for completion results
 */
export class CompletionCache implements ICompletionCache {
	private cache: Map<string, { value: string; timestamp: number }> = new Map();
	private readonly maxSize: number;

	constructor(maxSize: number = 1000) {
		this.maxSize = maxSize;
	}

	/**
	 * Get cached completion
	 */
	get(key: string): string | undefined {
		const entry = this.cache.get(key);
		if (entry) {
			// Move to end (LRU)
			this.cache.delete(key);
			this.cache.set(key, entry);
			return entry.value;
		}
		return undefined;
	}

	/**
	 * Set cached completion
	 */
	set(key: string, value: string): void {
		// Remove oldest if at capacity
		if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey) {
				this.cache.delete(firstKey);
			}
		}

		this.cache.set(key, { value, timestamp: Date.now() });
	}

	/**
	 * Generate cache key from file path, position, and prefix
	 */
	generateKey(filePath: string, position: vscode.Position, prefix: string): string {
		// Use last 200 chars of prefix for key
		const prefixSample = prefix.slice(-200);
		const keyString = `${filePath}:${position.line}:${position.character}:${prefixSample}`;
		return crypto.createHash('sha256').update(keyString).digest('hex');
	}

	/**
	 * Clear all cached entries
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get cache size
	 */
	size(): number {
		return this.cache.size;
	}
}
