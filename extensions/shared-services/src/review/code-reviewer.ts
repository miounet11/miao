import { getLLMAdapter } from '../LLMAdapter';
import type { LLMRequest } from '../ILLMAdapter';

/**
 * Code issue type
 */
export type IssueType = 'security' | 'performance' | 'style' | 'bug';

/**
 * Code issue severity
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Code review issue
 */
export interface CodeIssue {
	id: string;
	type: IssueType;
	severity: IssueSeverity;
	line: number;
	column: number;
	endLine: number;
	endColumn: number;
	message: string;
	suggestion?: string;
	fixCode?: string;
}

/**
 * Code review request
 */
export interface CodeReviewRequest {
	code: string;
	language: string;
	filePath?: string;
}

/**
 * Code review response
 */
export interface CodeReviewResponse {
	issues: CodeIssue[];
	summary: string;
	overallScore: number; // 0-100
}

/**
 * Code reviewer interface
 */
export interface ICodeReviewer {
	review(request: CodeReviewRequest): Promise<CodeReviewResponse>;
	applyFix(code: string, issue: CodeIssue): Promise<string>;
}

/**
 * AI-powered code reviewer
 */
export class CodeReviewer implements ICodeReviewer {
	/**
	 * Review code and detect issues
	 */
	async review(request: CodeReviewRequest): Promise<CodeReviewResponse> {
		const llmAdapter = getLLMAdapter();
		const systemPrompt = this.buildReviewSystemPrompt();
		const userPrompt = this.buildReviewUserPrompt(request);

		const llmRequest: LLMRequest = {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			maxTokens: 2048,
			temperature: 0.2,
		};

		try {
			const response = await llmAdapter.complete(llmRequest);
			return this.parseReviewResponse(response.content);
		} catch (error) {
			throw new Error(`Code review failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Apply fix for a specific issue
	 */
	async applyFix(code: string, issue: CodeIssue): Promise<string> {
		if (!issue.fixCode) {
			// Generate fix if not provided
			const llmAdapter = getLLMAdapter();
			const systemPrompt = 'You are a code fixing assistant. Generate only the fixed code, no explanations.';
			const userPrompt = `Fix this issue in the code:

Issue: ${issue.message}
Suggestion: ${issue.suggestion || 'Fix the issue'}

Original code:
\`\`\`
${code}
\`\`\`

Return ONLY the fixed code.`;

			const llmRequest: LLMRequest = {
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt },
				],
				maxTokens: 2048,
				temperature: 0.2,
			};

			const response = await llmAdapter.complete(llmRequest);
			return this.extractCode(response.content);
		}

		// Apply provided fix
		const lines = code.split('\n');
		const fixLines = issue.fixCode.split('\n');

		// Replace lines
		lines.splice(issue.line, issue.endLine - issue.line + 1, ...fixLines);

		return lines.join('\n');
	}

	/**
	 * Build system prompt for code review
	 */
	private buildReviewSystemPrompt(): string {
		return `You are an expert code reviewer. Analyze code for:

1. **Security vulnerabilities**: SQL injection, XSS, insecure dependencies, hardcoded secrets
2. **Performance bottlenecks**: Inefficient algorithms, memory leaks, unnecessary computations
3. **Code style issues**: Inconsistent formatting, naming conventions, missing documentation
4. **Potential bugs**: Null pointer errors, race conditions, logic errors, edge cases

Return your analysis in JSON format:
{
  "issues": [
    {
      "type": "security|performance|style|bug",
      "severity": "critical|high|medium|low",
      "line": <line_number>,
      "column": <column_number>,
      "endLine": <end_line_number>,
      "endColumn": <end_column_number>,
      "message": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "summary": "Overall assessment",
  "overallScore": <0-100>
}

If no issues found, return:
{
  "issues": [],
  "summary": "Code review passed. No issues detected.",
  "overallScore": 100
}`;
	}

	/**
	 * Build user prompt for code review
	 */
	private buildReviewUserPrompt(request: CodeReviewRequest): string {
		let prompt = `Review this ${request.language} code:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\``;
		if (request.filePath) {
			prompt += `\n\nFile: ${request.filePath}`;
		}
		return prompt;
	}

	/**
	 * Parse LLM response into CodeReviewResponse
	 */
	private parseReviewResponse(content: string): CodeReviewResponse {
		try {
			// Extract JSON from markdown code blocks if present
			const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
			const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

			const parsed = JSON.parse(jsonStr);

			// Add unique IDs to issues
			const issues: CodeIssue[] = (parsed.issues || []).map((issue: any, index: number) => ({
				id: `issue-${Date.now()}-${index}`,
				type: issue.type,
				severity: issue.severity,
				line: issue.line,
				column: issue.column || 0,
				endLine: issue.endLine || issue.line,
				endColumn: issue.endColumn || 999,
				message: issue.message,
				suggestion: issue.suggestion,
				fixCode: issue.fixCode,
			}));

			return {
				issues,
				summary: parsed.summary || 'Code review completed',
				overallScore: parsed.overallScore || 100,
			};
		} catch (error) {
			// Fallback: return no issues if parsing fails
			return {
				issues: [],
				summary: 'Code review completed (parsing error)',
				overallScore: 100,
			};
		}
	}

	/**
	 * Extract code from markdown code blocks
	 */
	private extractCode(content: string): string {
		const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/;
		const match = content.match(codeBlockRegex);
		return match ? match[1].trim() : content.trim();
	}
}
