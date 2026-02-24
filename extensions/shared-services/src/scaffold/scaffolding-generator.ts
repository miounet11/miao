import { getLLMAdapter } from '../LLMAdapter';
import type { LLMRequest } from '../ILLMAdapter';

/**
 * Project type
 */
export type ProjectType = 'web-frontend' | 'web-backend' | 'fullstack' | 'cli-tool';

/**
 * Tech stack
 */
export interface TechStack {
	framework?: string;
	language: string;
	packageManager?: string;
	testing?: string;
	linting?: string;
}

/**
 * Scaffolding request
 */
export interface ScaffoldingRequest {
	projectType: ProjectType;
	projectName: string;
	techStack: TechStack;
	description?: string;
}

/**
 * File structure
 */
export interface FileStructure {
	path: string;
	content: string;
	type: 'file' | 'directory';
}

/**
 * Scaffolding response
 */
export interface ScaffoldingResponse {
	files: FileStructure[];
	readme: string;
	installCommand: string;
	startCommand: string;
}

/**
 * Tech stack validation result
 */
export interface ValidationResult {
	valid: boolean;
	reason?: string;
	alternatives?: string[];
}

/**
 * Scaffolding generator interface
 */
export interface IScaffoldingGenerator {
	generate(request: ScaffoldingRequest): Promise<ScaffoldingResponse>;
	validateTechStack(projectType: ProjectType, techStack: TechStack): Promise<ValidationResult>;
}

/**
 * AI-powered scaffolding generator
 */
export class ScaffoldingGenerator implements IScaffoldingGenerator {
	private readonly supportedProjectTypes: ProjectType[] = [
		'web-frontend',
		'web-backend',
		'fullstack',
		'cli-tool',
	];

	/**
	 * Generate project scaffolding
	 */
	async generate(request: ScaffoldingRequest): Promise<ScaffoldingResponse> {
		if (!this.supportedProjectTypes.includes(request.projectType)) {
			throw new Error(`Unsupported project type: ${request.projectType}`);
		}

		// Validate tech stack
		const validation = await this.validateTechStack(request.projectType, request.techStack);
		if (!validation.valid) {
			throw new Error(`Invalid tech stack: ${validation.reason}`);
		}

		const llmAdapter = getLLMAdapter();
		const systemPrompt = this.buildGenerateSystemPrompt();
		const userPrompt = this.buildGenerateUserPrompt(request);

		const llmRequest: LLMRequest = {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			maxTokens: 4096,
			temperature: 0.3,
		};

		try {
			const response = await llmAdapter.complete(llmRequest);
			return this.parseScaffoldingResponse(response.content, request);
		} catch (error) {
			throw new Error(`Scaffolding generation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Validate tech stack compatibility
	 */
	async validateTechStack(projectType: ProjectType, techStack: TechStack): Promise<ValidationResult> {
		const llmAdapter = getLLMAdapter();
		const systemPrompt = 'You are a tech stack validation expert. Validate if the tech stack is compatible with the project type.';
		const userPrompt = `Project Type: ${projectType}
Tech Stack: ${JSON.stringify(techStack, null, 2)}

Is this tech stack compatible? Return JSON:
{
  "valid": true/false,
  "reason": "explanation if invalid",
  "alternatives": ["alternative1", "alternative2"] // if invalid
}`;

		const llmRequest: LLMRequest = {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			maxTokens: 512,
			temperature: 0.2,
		};

		try {
			const response = await llmAdapter.complete(llmRequest);
			const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
			const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.content.trim();
			return JSON.parse(jsonStr);
		} catch (error) {
			// Default to valid if validation fails
			return { valid: true };
		}
	}

	/**
	 * Build system prompt for scaffolding generation
	 */
	private buildGenerateSystemPrompt(): string {
		return `You are a project scaffolding expert. Generate complete project structure with:

1. Configuration files (package.json, tsconfig.json, etc.)
2. Source code structure
3. README.md with setup instructions
4. Basic implementation files

Return JSON format:
{
  "files": [
    {
      "path": "relative/path/to/file",
      "content": "file content",
      "type": "file" or "directory"
    }
  ],
  "readme": "README.md content",
  "installCommand": "npm install",
  "startCommand": "npm start"
}

Include all necessary files for a working project.`;
	}

	/**
	 * Build user prompt for scaffolding generation
	 */
	private buildGenerateUserPrompt(request: ScaffoldingRequest): string {
		let prompt = `Generate ${request.projectType} project scaffolding:

Project Name: ${request.projectName}
Language: ${request.techStack.language}`;

		if (request.techStack.framework) {
			prompt += `\nFramework: ${request.techStack.framework}`;
		}
		if (request.techStack.packageManager) {
			prompt += `\nPackage Manager: ${request.techStack.packageManager}`;
		}
		if (request.techStack.testing) {
			prompt += `\nTesting: ${request.techStack.testing}`;
		}
		if (request.techStack.linting) {
			prompt += `\nLinting: ${request.techStack.linting}`;
		}
		if (request.description) {
			prompt += `\nDescription: ${request.description}`;
		}

		prompt += '\n\nGenerate a complete, production-ready project structure.';

		return prompt;
	}

	/**
	 * Parse LLM response into ScaffoldingResponse
	 */
	private parseScaffoldingResponse(content: string, request: ScaffoldingRequest): ScaffoldingResponse {
		try {
			const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
			const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
			const parsed = JSON.parse(jsonStr);

			return {
				files: parsed.files || [],
				readme: parsed.readme || this.generateDefaultReadme(request),
				installCommand: parsed.installCommand || 'npm install',
				startCommand: parsed.startCommand || 'npm start',
			};
		} catch (error) {
			// Fallback: generate minimal structure
			return this.generateFallbackStructure(request);
		}
	}

	/**
	 * Generate default README
	 */
	private generateDefaultReadme(request: ScaffoldingRequest): string {
		return `# ${request.projectName}

${request.description || 'A new project'}

## Tech Stack

- Language: ${request.techStack.language}
${request.techStack.framework ? `- Framework: ${request.techStack.framework}` : ''}

## Setup

\`\`\`bash
npm install
npm start
\`\`\`

## Project Structure

Generated with Miaoda IDE.
`;
	}

	/**
	 * Generate fallback structure if parsing fails
	 */
	private generateFallbackStructure(request: ScaffoldingRequest): ScaffoldingResponse {
		const files: FileStructure[] = [
			{
				path: 'src',
				content: '',
				type: 'directory',
			},
			{
				path: 'src/index.ts',
				content: 'console.log("Hello World");',
				type: 'file',
			},
			{
				path: 'package.json',
				content: JSON.stringify(
					{
						name: request.projectName,
						version: '1.0.0',
						main: 'src/index.ts',
					},
					null,
					2
				),
				type: 'file',
			},
		];

		return {
			files,
			readme: this.generateDefaultReadme(request),
			installCommand: 'npm install',
			startCommand: 'npm start',
		};
	}
}
