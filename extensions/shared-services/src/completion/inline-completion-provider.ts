import * as vscode from 'vscode';
import { getLLMAdapter } from '../LLMAdapter';
import type { LLMRequest } from '../ILLMAdapter';

/**
 * Inline completion provider for AI-powered code suggestions
 */
export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
	private debounceController?: IDebounceController;
	private cache?: ICompletionCache;

	constructor(debounceController?: IDebounceController, cache?: ICompletionCache) {
		this.debounceController = debounceController;
		this.cache = cache;
	}

	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | undefined> {
		// Check cancellation
		if (token.isCancellationRequested) {
			return undefined;
		}

		// Debounce rapid typing
		if (this.debounceController && !this.debounceController.shouldTrigger()) {
			return undefined;
		}

		// Build context
		const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
		const suffix = document.getText(new vscode.Range(position, document.lineAt(document.lineCount - 1).range.end));
		const languageId = document.languageId;

		// Check cache
		if (this.cache) {
			const cacheKey = this.cache.generateKey(document.uri.fsPath, position, prefix);
			const cached = this.cache.get(cacheKey);
			if (cached) {
				return [new vscode.InlineCompletionItem(cached)];
			}
		}

		try {
			const llmAdapter = getLLMAdapter();
			const request: LLMRequest = {
				messages: [
					{
						role: 'system',
						content: `You are a code completion assistant. Complete the code at the cursor position. Language: ${languageId}. Only return the completion text, no explanations.`,
					},
					{
						role: 'user',
						content: `Complete this code:\n\n${prefix}<CURSOR>${suffix.slice(0, 500)}`,
					},
				],
				maxTokens: 256,
				temperature: 0.2,
			};

			const response = await llmAdapter.complete(request);
			const completion = response.content.trim();

			// Cache result
			if (this.cache && completion) {
				const cacheKey = this.cache.generateKey(document.uri.fsPath, position, prefix);
				this.cache.set(cacheKey, completion);
			}

			return completion ? [new vscode.InlineCompletionItem(completion)] : undefined;
		} catch (error) {
			console.error('Inline completion error:', error);
			return undefined;
		}
	}
}

/**
 * Debounce controller interface
 */
export interface IDebounceController {
	shouldTrigger(): boolean;
	reset(): void;
}

/**
 * Completion cache interface
 */
export interface ICompletionCache {
	get(key: string): string | undefined;
	set(key: string, value: string): void;
	generateKey(filePath: string, position: vscode.Position, prefix: string): string;
	clear(): void;
}
