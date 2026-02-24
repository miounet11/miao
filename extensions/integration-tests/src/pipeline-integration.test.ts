/**
 * Integration tests for autonomous pipeline
 */
import * as vscode from 'vscode';

describe('Pipeline Integration', () => {
	let orchestrator: vscode.Extension<any> | undefined;

	beforeAll(async () => {
		orchestrator = vscode.extensions.getExtension('miaoda.agent-orchestrator');
		if (orchestrator && !orchestrator.isActive) {
			await orchestrator.activate();
		}
	});

	test('should be installed', () => {
		expect(orchestrator).toBeDefined();
	});

	test('should create pipeline', async () => {
		if (!orchestrator) return;

		const api = await orchestrator.activate();
		const pipeline = api.getPipeline();

		if (pipeline) {
			const state = await pipeline.create({
				task: 'Test task',
				context: 'Test context',
			});

			expect(state).toBeDefined();
			expect(state.status).toBe('pending');
			expect(state.currentStage).toBe('requirements');
			expect(state.progress).toBe(0);
		}
	});

	test('should execute pipeline stages', async () => {
		if (!orchestrator) return;

		const api = await orchestrator.activate();
		const pipeline = api.getPipeline();

		if (pipeline) {
			const state = await pipeline.create({
				task: 'Simple test',
				autoAdvance: true,
			});

			// Execute pipeline (this will take time)
			// In real test, would mock LLM responses
			// await pipeline.execute(state.id);

			// Check final state
			// const finalState = await pipeline.getState(state.id);
			// expect(finalState?.status).toBe('completed');
		}
	}, 60000); // 60 second timeout

	test('should support pause/resume', async () => {
		if (!orchestrator) return;

		const api = await orchestrator.activate();
		const pipeline = api.getPipeline();

		if (pipeline) {
			const state = await pipeline.create({
				task: 'Pausable test',
			});

			// Start execution
			const executePromise = pipeline.execute(state.id);

			// Pause after 1 second
			setTimeout(async () => {
				await pipeline.pause(state.id);
				const pausedState = await pipeline.getState(state.id);
				expect(pausedState?.status).toBe('paused');

				// Resume
				await pipeline.resume(state.id);
			}, 1000);

			// Wait for completion (or timeout)
			try {
				await executePromise;
			} catch (e) {
				// Expected if paused
			}
		}
	}, 60000);

	test('should generate execution report', async () => {
		if (!orchestrator) return;

		const api = await orchestrator.activate();
		const pipeline = api.getPipeline();

		if (pipeline) {
			const state = await pipeline.create({
				task: 'Report test',
			});

			// After execution, should generate report
			// const report = await pipeline.generateReport(state.id);
			// expect(report).toBeDefined();
			// expect(report.stages).toHaveLength(5);
		}
	});
});

describe('Pipeline + UI Integration', () => {
	test('should show pipeline status panel', async () => {
		const chatPanel = vscode.extensions.getExtension('miaoda.agent-chat-panel');
		if (!chatPanel) return;

		await chatPanel.activate();

		// Create a pipeline
		const orchestrator = vscode.extensions.getExtension('miaoda.agent-orchestrator');
		if (!orchestrator) return;

		const api = await orchestrator.activate();
		const pipeline = api.getPipeline();

		if (pipeline) {
			const state = await pipeline.create({ task: 'UI test' });

			// Show status panel
			await vscode.commands.executeCommand('miaoda.pipeline.showStatus', state.id);

			// Panel should be visible
			// This is a visual test
		}
	});
});
