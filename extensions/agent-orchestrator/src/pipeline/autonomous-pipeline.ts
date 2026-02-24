import { getLLMAdapter } from 'shared-services';
import type { LLMRequest } from 'shared-services';

/**
 * Pipeline stage
 */
export type PipelineStage = 'requirements' | 'design' | 'coding' | 'testing' | 'deployment';

/**
 * Pipeline status
 */
export type PipelineStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

/**
 * Stage result
 */
export interface StageResult {
	stage: PipelineStage;
	success: boolean;
	output: string;
	artifacts?: StageArtifacts; // Structured output
	error?: string;
	duration: number;
	retryCount?: number;
}

/**
 * Structured artifacts from each stage
 */
export interface StageArtifacts {
	requirements?: {
		functional: string[];
		nonfunctional: string[];
		acceptanceCriteria: string[];
	};
	design?: {
		architecture: string;
		components: Array<{ name: string; responsibility: string }>;
		dataModel: string;
		apis: Array<{ endpoint: string; method: string; description: string }>;
	};
	coding?: {
		files: Array<{ path: string; content: string; language: string }>;
		changes: string[];
	};
	testing?: {
		testFiles: Array<{ path: string; content: string }>;
		testResults: { passed: number; failed: number; coverage?: number };
	};
	deployment?: {
		config: string;
		documentation: string;
		checklist: string[];
	};
}

/**
 * Pipeline state
 */
export interface PipelineState {
	id: string;
	status: PipelineStatus;
	currentStage: PipelineStage;
	completedStages: PipelineStage[];
	stageResults: StageResult[];
	progress: number; // 0-100
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
	task: string;
	context?: string;
	autoAdvance?: boolean; // Auto advance to next stage
	autoRetry?: boolean; // Auto retry on failure
	maxRetries?: number;
	stageTimeout?: number; // Timeout per stage in ms (default: 5 minutes)
}

/**
 * Pipeline execution report
 */
export interface PipelineReport {
	pipelineId: string;
	status: PipelineStatus;
	totalDuration: number;
	stages: Array<{
		stage: PipelineStage;
		success: boolean;
		duration: number;
		retries: number;
	}>;
	artifacts: StageArtifacts;
	summary: {
		codeChanges: string[];
		testsAdded: number;
		coverage?: number;
	};
}

/**
 * Autonomous pipeline interface
 */
export interface IAutonomousPipeline {
	create(config: PipelineConfig): Promise<PipelineState>;
	execute(pipelineId: string): Promise<void>;
	pause(pipelineId: string): Promise<void>;
	resume(pipelineId: string): Promise<void>;
	cancel(pipelineId: string): Promise<void>;
	getState(pipelineId: string): Promise<PipelineState | null>;
}

/**
 * Autonomous pipeline implementation
 */
export class AutonomousPipeline implements IAutonomousPipeline {
	private pipelines: Map<string, PipelineState> = new Map();
	private pipelineConfigs: Map<string, PipelineConfig> = new Map();
	private readonly stages: PipelineStage[] = ['requirements', 'design', 'coding', 'testing', 'deployment'];
	private readonly DEFAULT_STAGE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

	/**
	 * Create new pipeline
	 */
	async create(config: PipelineConfig): Promise<PipelineState> {
		const id = this.generateId();
		const state: PipelineState = {
			id,
			status: 'pending',
			currentStage: 'requirements',
			completedStages: [],
			stageResults: [],
			progress: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.pipelines.set(id, state);
		this.pipelineConfigs.set(id, config);
		return state;
	}

	/**
	 * Execute pipeline
	 */
	async execute(pipelineId: string): Promise<void> {
		const state = this.pipelines.get(pipelineId);
		if (!state) {
			throw new Error(`Pipeline ${pipelineId} not found`);
		}

		if (state.status === 'running') {
			throw new Error('Pipeline is already running');
		}

		state.status = 'running';
		state.updatedAt = new Date();

		try {
			// Execute stages sequentially
			for (const stage of this.stages) {
				// Check if pipeline was paused externally
				const currentState = this.pipelines.get(pipelineId);
				if (currentState?.status === 'paused') {
					break;
				}

				if (state.completedStages.includes(stage)) {
					continue; // Skip completed stages
				}

				state.currentStage = stage;
				state.updatedAt = new Date();

				const result = await this.executeStageWithRetry(pipelineId, stage, state);
				state.stageResults.push(result);

				if (result.success) {
					state.completedStages.push(stage);
					state.progress = (state.completedStages.length / this.stages.length) * 100;
				} else {
					// Stage failed after retries
					state.status = 'failed';
					state.updatedAt = new Date();
					throw new Error(`Stage ${stage} failed after ${result.retryCount || 0} retries: ${result.error}`);
				}
			}

			// All stages completed
			state.status = 'completed';
			state.progress = 100;
			state.updatedAt = new Date();
		} catch (error) {
			// Only set to failed if not already paused
			const currentState = this.pipelines.get(pipelineId);
			if (currentState && currentState.status !== 'paused') {
				currentState.status = 'failed';
				currentState.updatedAt = new Date();
			}
			throw error;
		}
	}

	/**
	 * Pause pipeline
	 */
	async pause(pipelineId: string): Promise<void> {
		const state = this.pipelines.get(pipelineId);
		if (!state) {
			throw new Error(`Pipeline ${pipelineId} not found`);
		}

		if (state.status === 'running') {
			state.status = 'paused';
			state.updatedAt = new Date();
		} else {
			throw new Error('Pipeline is not running');
		}
	}

	/**
	 * Resume pipeline
	 */
	async resume(pipelineId: string): Promise<void> {
		const state = this.pipelines.get(pipelineId);
		if (!state) {
			throw new Error(`Pipeline ${pipelineId} not found`);
		}

		if (state.status === 'paused') {
			// Resume execution
			await this.execute(pipelineId);
		} else {
			throw new Error('Pipeline is not paused');
		}
	}

	/**
	 * Cancel pipeline
	 */
	async cancel(pipelineId: string): Promise<void> {
		const state = this.pipelines.get(pipelineId);
		if (!state) {
			throw new Error(`Pipeline ${pipelineId} not found`);
		}

		state.status = 'failed';
		state.updatedAt = new Date();
	}

	/**
	 * Get pipeline state
	 */
	async getState(pipelineId: string): Promise<PipelineState | null> {
		return this.pipelines.get(pipelineId) || null;
	}

	/**
	 * Execute stage with retry logic
	 */
	private async executeStageWithRetry(
		pipelineId: string,
		stage: PipelineStage,
		state: PipelineState
	): Promise<StageResult> {
		const config = this.pipelineConfigs.get(pipelineId);
		const maxRetries = config?.autoRetry ? (config.maxRetries || 3) : 0;
		let lastError: string = '';

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			const result = await this.executeStage(stage, state, config);

			if (result.success) {
				result.retryCount = attempt;
				return result;
			}

			lastError = result.error || 'Unknown error';

			if (attempt < maxRetries) {
				// Wait before retry (exponential backoff)
				const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}

		// All retries failed
		return {
			stage,
			success: false,
			output: '',
			error: lastError,
			duration: 0,
			retryCount: maxRetries,
		};
	}

	/**
	 * Execute a single stage with timeout
	 */
	private async executeStage(
		stage: PipelineStage,
		state: PipelineState,
		config?: PipelineConfig
	): Promise<StageResult> {
		const startTime = Date.now();
		const timeout = config?.stageTimeout || this.DEFAULT_STAGE_TIMEOUT;

		try {
			const result = await Promise.race([
				this.executeStageInternal(stage, state, config),
				this.createTimeoutPromise(timeout, stage),
			]);

			const duration = Date.now() - startTime;
			return { ...result, duration };
		} catch (error) {
			const duration = Date.now() - startTime;
			return {
				stage,
				success: false,
				output: '',
				error: error instanceof Error ? error.message : String(error),
				duration,
			};
		}
	}

	/**
	 * Internal stage execution
	 */
	private async executeStageInternal(
		stage: PipelineStage,
		state: PipelineState,
		config?: PipelineConfig
	): Promise<Omit<StageResult, 'duration'>> {
		const llmAdapter = getLLMAdapter();
		const systemPrompt = this.getStageSystemPrompt(stage);
		const userPrompt = this.getStageUserPrompt(stage, state, config);

		const llmRequest: LLMRequest = {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			maxTokens: 4096,
			temperature: 0.3,
		};

		const response = await llmAdapter.complete(llmRequest);
		const artifacts = this.parseStageArtifacts(stage, response.content);

		return {
			stage,
			success: true,
			output: response.content,
			artifacts,
		};
	}

	/**
	 * Create timeout promise
	 */
	private createTimeoutPromise(timeout: number, stage: PipelineStage): Promise<never> {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error(`Stage ${stage} timed out after ${timeout}ms`));
			}, timeout);
		});
	}

	/**
	 * Get system prompt for stage
	 */
	private getStageSystemPrompt(stage: PipelineStage): string {
		const basePrompt = 'You are an expert AI agent in an autonomous development pipeline.';

		switch (stage) {
			case 'requirements':
				return `${basePrompt}

Role: Requirements Analyst

Your task:
1. Analyze the user's task description
2. Extract functional requirements (what the system should do)
3. Define non-functional requirements (performance, security, usability)
4. Create clear acceptance criteria for each requirement
5. Identify potential edge cases and constraints

Output format (JSON):
{
  "functional": ["requirement 1", "requirement 2", ...],
  "nonfunctional": ["requirement 1", "requirement 2", ...],
  "acceptanceCriteria": ["criteria 1", "criteria 2", ...]
}`;

			case 'design':
				return `${basePrompt}

Role: Software Architect

Your task:
1. Design system architecture based on requirements
2. Define components and their responsibilities
3. Design data models and schemas
4. Specify API endpoints and interfaces
5. Consider scalability and maintainability

Output format (JSON):
{
  "architecture": "description of overall architecture",
  "components": [{"name": "ComponentName", "responsibility": "what it does"}],
  "dataModel": "description of data structures",
  "apis": [{"endpoint": "/api/path", "method": "GET", "description": "what it does"}]
}`;

			case 'coding':
				return `${basePrompt}

Role: Senior Developer

Your task:
1. Implement code based on design specifications
2. Follow best practices and coding standards
3. Add proper error handling and validation
4. Include inline comments for complex logic
5. Ensure code is modular and testable

Output format (JSON):
{
  "files": [{"path": "src/file.ts", "content": "code here", "language": "typescript"}],
  "changes": ["summary of change 1", "summary of change 2"]
}`;

			case 'testing':
				return `${basePrompt}

Role: QA Engineer

Your task:
1. Write unit tests for all components
2. Create integration tests for API endpoints
3. Add edge case and error handling tests
4. Aim for >80% code coverage
5. Document test scenarios

Output format (JSON):
{
  "testFiles": [{"path": "tests/file.test.ts", "content": "test code here"}],
  "testResults": {"passed": 10, "failed": 0, "coverage": 85}
}`;

			case 'deployment':
				return `${basePrompt}

Role: DevOps Engineer

Your task:
1. Create deployment configuration (Docker, CI/CD)
2. Write deployment documentation
3. Create pre-deployment checklist
4. Document environment variables and dependencies
5. Add monitoring and logging setup

Output format (JSON):
{
  "config": "deployment configuration content",
  "documentation": "deployment guide",
  "checklist": ["step 1", "step 2", ...]
}`;
		}
	}

	/**
	 * Get user prompt for stage
	 */
	private getStageUserPrompt(
		stage: PipelineStage,
		state: PipelineState,
		config?: PipelineConfig
	): string {
		let prompt = `Task: ${config?.task || 'No task description'}\n\n`;

		if (config?.context) {
			prompt += `Context:\n${config.context}\n\n`;
		}

		// Include artifacts from previous stages
		const previousArtifacts = this.collectPreviousArtifacts(state);
		if (Object.keys(previousArtifacts).length > 0) {
			prompt += `Previous stages artifacts:\n${JSON.stringify(previousArtifacts, null, 2)}\n\n`;
		}

		prompt += `Complete the ${stage} stage following the output format specified in the system prompt.`;

		return prompt;
	}

	/**
	 * Collect artifacts from previous stages
	 */
	private collectPreviousArtifacts(state: PipelineState): Partial<StageArtifacts> {
		const artifacts: Partial<StageArtifacts> = {};

		for (const result of state.stageResults) {
			if (result.success && result.artifacts) {
				switch (result.stage) {
					case 'requirements':
						artifacts.requirements = result.artifacts.requirements;
						break;
					case 'design':
						artifacts.design = result.artifacts.design;
						break;
					case 'coding':
						artifacts.coding = result.artifacts.coding;
						break;
					case 'testing':
						artifacts.testing = result.artifacts.testing;
						break;
					case 'deployment':
						artifacts.deployment = result.artifacts.deployment;
						break;
				}
			}
		}

		return artifacts;
	}

	/**
	 * Parse stage artifacts from LLM output
	 */
	private parseStageArtifacts(stage: PipelineStage, output: string): StageArtifacts | undefined {
		try {
			// Try to extract JSON from output
			const jsonMatch = output.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				return undefined;
			}

			const parsed = JSON.parse(jsonMatch[0]);
			const artifacts: StageArtifacts = {};

			switch (stage) {
				case 'requirements':
					artifacts.requirements = parsed;
					break;
				case 'design':
					artifacts.design = parsed;
					break;
				case 'coding':
					artifacts.coding = parsed;
					break;
				case 'testing':
					artifacts.testing = parsed;
					break;
				case 'deployment':
					artifacts.deployment = parsed;
					break;
			}

			return artifacts;
		} catch (error) {
			console.warn(`Failed to parse artifacts for stage ${stage}:`, error);
			return undefined;
		}
	}

	/**
	 * Generate execution report
	 */
	async generateReport(pipelineId: string): Promise<PipelineReport | null> {
		const state = this.pipelines.get(pipelineId);
		if (!state) {
			return null;
		}

		const totalDuration = state.stageResults.reduce((sum, r) => sum + r.duration, 0);
		const allArtifacts = this.collectPreviousArtifacts(state);

		// Extract summary
		const codeChanges = allArtifacts.coding?.changes || [];
		const testsAdded = allArtifacts.testing?.testFiles?.length || 0;
		const coverage = allArtifacts.testing?.testResults?.coverage;

		return {
			pipelineId,
			status: state.status,
			totalDuration,
			stages: state.stageResults.map(r => ({
				stage: r.stage,
				success: r.success,
				duration: r.duration,
				retries: r.retryCount || 0,
			})),
			artifacts: allArtifacts,
			summary: {
				codeChanges,
				testsAdded,
				coverage,
			},
		};
	}

	/**
	 * Generate unique pipeline ID
	 */
	private generateId(): string {
		return `pipeline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}
}
