import { getLLMAdapter } from '../LLMAdapter';
import type { LLMRequest } from '../ILLMAdapter';

/**
 * Supported programming languages
 */
export type SupportedLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'go' | 'rust';

/**
 * Code generation request
 */
export interface CodeGenRequest {
	language: SupportedLanguage;
	description: string;
	context?: string;
}

/**
 * Code modification request
 */
export interface CodeModifyRequest {
	language: SupportedLanguage;
	code: string;
	instruction: string;
}

/**
 * Code generation response
 */
export interface CodeGenResponse {
	code: string;
	dependencies?: string[];
	explanation?: string;
}

/**
 * Code generator interface
 */
export interface ICodeGenerator {
	generate(request: CodeGenRequest): Promise<CodeGenResponse>;
	modify(request: CodeModifyRequest): Promise<CodeGenResponse>;
}

/**
 * AI-powered code generator
 */
export class CodeGenerator implements ICodeGenerator {
	private readonly supportedLanguages: SupportedLanguage[] = [
		'python',
		'javascript',
		'typescript',
		'java',
		'go',
		'rust',
	];

	/**
	 * Generate code from natural language description
	 */
	async generate(request: CodeGenRequest): Promise<CodeGenResponse> {
		if (!this.supportedLanguages.includes(request.language)) {
			throw new Error(`Unsupported language: ${request.language}`);
		}

		const llmAdapter = getLLMAdapter();
		const systemPrompt = this.buildGenerateSystemPrompt(request.language);
		const userPrompt = this.buildGenerateUserPrompt(request);

		const llmRequest: LLMRequest = {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			maxTokens: 2048,
			temperature: 0.3,
		};

		try {
			const response = await llmAdapter.complete(llmRequest);
			return this.parseCodeGenResponse(response.content, request.language);
		} catch (error) {
			if (this.isLLMError(error)) {
				throw new Error(`Code generation failed: ${error.message}. ${error.suggestion}`);
			}
			throw new Error(`Code generation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Modify existing code based on instruction
	 */
	async modify(request: CodeModifyRequest): Promise<CodeGenResponse> {
		if (!this.supportedLanguages.includes(request.language)) {
			throw new Error(`Unsupported language: ${request.language}`);
		}

		const llmAdapter = getLLMAdapter();
		const systemPrompt = this.buildModifySystemPrompt(request.language);
		const userPrompt = this.buildModifyUserPrompt(request);

		const llmRequest: LLMRequest = {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			maxTokens: 2048,
			temperature: 0.3,
		};

		try {
			const response = await llmAdapter.complete(llmRequest);
			return this.parseCodeGenResponse(response.content, request.language);
		} catch (error) {
			if (this.isLLMError(error)) {
				throw new Error(`Code modification failed: ${error.message}. ${error.suggestion}`);
			}
			throw new Error(`Code modification failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private buildGenerateSystemPrompt(language: SupportedLanguage): string {
		return `You are an expert ${language} programmer. Generate clean, idiomatic ${language} code based on user descriptions.

Rules:
1. Return ONLY the code, no explanations unless asked
2. If external dependencies are needed, add them as comments at the top: // Dependencies: package@version
3. Follow ${language} best practices and conventions
4. Include error handling where appropriate
5. Add brief inline comments for complex logic`;
	}

	private buildGenerateUserPrompt(request: CodeGenRequest): string {
		let prompt = `Generate ${request.language} code for: ${request.description}`;
		if (request.context) {
			prompt += `\n\nContext:\n${request.context}`;
		}
		return prompt;
	}

	private buildModifySystemPrompt(language: SupportedLanguage): string {
		return `You are an expert ${language} programmer. Modify the provided code according to user instructions.

Rules:
1. Return ONLY the modified code
2. Preserve existing functionality unless instructed to change it
3. If new dependencies are needed, add them as comments: // Dependencies: package@version
4. Follow ${language} best practices
5. Maintain code style consistency`;
	}

	private buildModifyUserPrompt(request: CodeModifyRequest): string {
		return `Modify this ${request.language} code:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\`\n\nInstruction: ${request.instruction}`;
	}

	private parseCodeGenResponse(content: string, language: SupportedLanguage): CodeGenResponse {
		// Extract code from markdown code blocks if present
		const codeBlockRegex = new RegExp(`\`\`\`(?:${language})?\\s*([\\s\\S]*?)\`\`\``, 'i');
		const match = content.match(codeBlockRegex);
		const code = match ? match[1].trim() : content.trim();

		// Extract dependencies from comments
		const dependencies: string[] = [];
		const depRegex = /(?:\/\/|#)\s*Dependencies?:\s*([^\n]+)/gi;
		let depMatch;
		while ((depMatch = depRegex.exec(code)) !== null) {
			const deps = depMatch[1].split(',').map(d => d.trim());
			dependencies.push(...deps);
		}

		return {
			code,
			dependencies: dependencies.length > 0 ? dependencies : undefined,
		};
	}

	private isLLMError(error: unknown): error is { type: string; message: string; suggestion: string } {
		return (
			typeof error === 'object' &&
			error !== null &&
			'type' in error &&
			'message' in error &&
			'suggestion' in error
		);
	}
}
