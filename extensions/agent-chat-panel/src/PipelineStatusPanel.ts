import * as vscode from 'vscode';

/**
 * Pipeline status panel for displaying autonomous pipeline execution
 */
export class PipelineStatusPanel {
	private panel: vscode.WebviewPanel | undefined;
	private currentPipelineId: string | null = null;
	private updateInterval: NodeJS.Timeout | null = null;

	constructor(private readonly context: vscode.ExtensionContext) {}

	/**
	 * Show pipeline status panel
	 */
	show(pipelineId: string): void {
		this.currentPipelineId = pipelineId;

		if (this.panel) {
			this.panel.reveal();
		} else {
			this.panel = vscode.window.createWebviewPanel(
				'miaodaPipelineStatus',
				'Pipeline Status',
				vscode.ViewColumn.Two,
				{
					enableScripts: true,
					retainContextWhenHidden: true,
				}
			);

			this.panel.webview.html = this.getHtmlContent();

			this.panel.webview.onDidReceiveMessage(
				async (message) => {
					switch (message.command) {
						case 'pause':
							await this.pausePipeline();
							break;
						case 'resume':
							await this.resumePipeline();
							break;
						case 'cancel':
							await this.cancelPipeline();
							break;
						case 'refresh':
							await this.updateStatus();
							break;
					}
				},
				undefined,
				this.context.subscriptions
			);

			this.panel.onDidDispose(() => {
				this.stopAutoUpdate();
				this.panel = undefined;
			});
		}

		// Start auto-update
		this.startAutoUpdate();
		this.updateStatus();
	}

	/**
	 * Update pipeline status
	 */
	private async updateStatus(): Promise<void> {
		if (!this.currentPipelineId || !this.panel) {
			return;
		}

		try {
			// Get orchestrator extension
			const orchestrator = vscode.extensions.getExtension('miaoda.agent-orchestrator');
			if (!orchestrator) {
				return;
			}

			const api = await orchestrator.activate();
			const pipeline = api.getPipeline();

			if (!pipeline) {
				return;
			}

			const state = await pipeline.getState(this.currentPipelineId);

			if (state) {
				this.panel.webview.postMessage({
					type: 'update',
					state,
				});

				// Stop auto-update if pipeline is completed or failed
				if (state.status === 'completed' || state.status === 'failed') {
					this.stopAutoUpdate();
				}
			}
		} catch (error) {
			console.error('Failed to update pipeline status:', error);
		}
	}

	/**
	 * Pause pipeline
	 */
	private async pausePipeline(): Promise<void> {
		if (!this.currentPipelineId) {
			return;
		}

		try {
			const orchestrator = vscode.extensions.getExtension('miaoda.agent-orchestrator');
			if (!orchestrator) {
				return;
			}

			const api = await orchestrator.activate();
			const pipeline = api.getPipeline();

			if (pipeline) {
				await pipeline.pause(this.currentPipelineId);
				vscode.window.showInformationMessage('Pipeline paused');
				await this.updateStatus();
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to pause pipeline: ${error.message}`);
		}
	}

	/**
	 * Resume pipeline
	 */
	private async resumePipeline(): Promise<void> {
		if (!this.currentPipelineId) {
			return;
		}

		try {
			const orchestrator = vscode.extensions.getExtension('miaoda.agent-orchestrator');
			if (!orchestrator) {
				return;
			}

			const api = await orchestrator.activate();
			const pipeline = api.getPipeline();

			if (pipeline) {
				await pipeline.resume(this.currentPipelineId);
				vscode.window.showInformationMessage('Pipeline resumed');
				this.startAutoUpdate();
				await this.updateStatus();
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to resume pipeline: ${error.message}`);
		}
	}

	/**
	 * Cancel pipeline
	 */
	private async cancelPipeline(): Promise<void> {
		if (!this.currentPipelineId) {
			return;
		}

		const confirm = await vscode.window.showWarningMessage(
			'Are you sure you want to cancel this pipeline?',
			'Yes',
			'No'
		);

		if (confirm !== 'Yes') {
			return;
		}

		try {
			const orchestrator = vscode.extensions.getExtension('miaoda.agent-orchestrator');
			if (!orchestrator) {
				return;
			}

			const api = await orchestrator.activate();
			const pipeline = api.getPipeline();

			if (pipeline) {
				await pipeline.cancel(this.currentPipelineId);
				vscode.window.showInformationMessage('Pipeline cancelled');
				this.stopAutoUpdate();
				await this.updateStatus();
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to cancel pipeline: ${error.message}`);
		}
	}

	/**
	 * Start auto-update
	 */
	private startAutoUpdate(): void {
		this.stopAutoUpdate();
		this.updateInterval = setInterval(() => {
			this.updateStatus();
		}, 2000); // Update every 2 seconds
	}

	/**
	 * Stop auto-update
	 */
	private stopAutoUpdate(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = null;
		}
	}

	/**
	 * Get HTML content for webview
	 */
	private getHtmlContent(): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Pipeline Status</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			padding: 20px;
			margin: 0;
		}
		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20px;
			padding-bottom: 10px;
			border-bottom: 1px solid var(--vscode-panel-border);
		}
		h1 {
			margin: 0;
			font-size: 24px;
		}
		.status-badge {
			padding: 4px 12px;
			border-radius: 12px;
			font-size: 12px;
			font-weight: 600;
			text-transform: uppercase;
		}
		.status-pending { background: var(--vscode-editorWarning-background); color: var(--vscode-editorWarning-foreground); }
		.status-running { background: var(--vscode-editorInfo-background); color: var(--vscode-editorInfo-foreground); }
		.status-paused { background: var(--vscode-editorWarning-background); color: var(--vscode-editorWarning-foreground); }
		.status-completed { background: var(--vscode-testing-iconPassed); color: white; }
		.status-failed { background: var(--vscode-editorError-background); color: var(--vscode-editorError-foreground); }
		.progress-bar {
			width: 100%;
			height: 8px;
			background: var(--vscode-progressBar-background);
			border-radius: 4px;
			overflow: hidden;
			margin: 20px 0;
		}
		.progress-fill {
			height: 100%;
			background: var(--vscode-progressBar-background);
			transition: width 0.3s ease;
		}
		.stages {
			margin-top: 30px;
		}
		.stage {
			margin-bottom: 20px;
			padding: 15px;
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
		}
		.stage-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 10px;
		}
		.stage-name {
			font-weight: 600;
			font-size: 16px;
			text-transform: capitalize;
		}
		.stage-status {
			font-size: 12px;
		}
		.stage-icon {
			margin-right: 8px;
		}
		.stage-pending { opacity: 0.5; }
		.stage-running { border-left: 3px solid var(--vscode-editorInfo-foreground); }
		.stage-completed { border-left: 3px solid var(--vscode-testing-iconPassed); }
		.stage-failed { border-left: 3px solid var(--vscode-editorError-foreground); }
		.stage-output {
			margin-top: 10px;
			padding: 10px;
			background: var(--vscode-textCodeBlock-background);
			border-radius: 4px;
			font-family: var(--vscode-editor-font-family);
			font-size: 12px;
			white-space: pre-wrap;
			max-height: 200px;
			overflow-y: auto;
		}
		.controls {
			display: flex;
			gap: 10px;
			margin-top: 20px;
		}
		button {
			padding: 8px 16px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 2px;
			cursor: pointer;
			font-size: 13px;
		}
		button:hover {
			background: var(--vscode-button-hoverBackground);
		}
		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		.secondary {
			background: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
		}
		.secondary:hover {
			background: var(--vscode-button-secondaryHoverBackground);
		}
		.danger {
			background: var(--vscode-editorError-foreground);
		}
	</style>
</head>
<body>
	<div class="header">
		<h1>Pipeline Execution</h1>
		<span id="status-badge" class="status-badge">Pending</span>
	</div>

	<div class="progress-bar">
		<div id="progress-fill" class="progress-fill" style="width: 0%"></div>
	</div>

	<div id="progress-text" style="text-align: center; margin-bottom: 20px;">0%</div>

	<div class="stages" id="stages"></div>

	<div class="controls">
		<button id="pause-btn" onclick="pausePipeline()">⏸ Pause</button>
		<button id="resume-btn" onclick="resumePipeline()" disabled>▶ Resume</button>
		<button id="cancel-btn" class="danger" onclick="cancelPipeline()">✕ Cancel</button>
		<button class="secondary" onclick="refresh()">🔄 Refresh</button>
	</div>

	<script>
		const vscode = acquireVsCodeApi();

		function pausePipeline() {
			vscode.postMessage({ command: 'pause' });
		}

		function resumePipeline() {
			vscode.postMessage({ command: 'resume' });
		}

		function cancelPipeline() {
			vscode.postMessage({ command: 'cancel' });
		}

		function refresh() {
			vscode.postMessage({ command: 'refresh' });
		}

		window.addEventListener('message', (event) => {
			const message = event.data;

			if (message.type === 'update') {
				updateUI(message.state);
			}
		});

		function updateUI(state) {
			// Update status badge
			const statusBadge = document.getElementById('status-badge');
			statusBadge.textContent = state.status;
			statusBadge.className = 'status-badge status-' + state.status;

			// Update progress
			const progressFill = document.getElementById('progress-fill');
			const progressText = document.getElementById('progress-text');
			progressFill.style.width = state.progress + '%';
			progressText.textContent = Math.round(state.progress) + '%';

			// Update stages
			const stagesContainer = document.getElementById('stages');
			stagesContainer.innerHTML = '';

			const allStages = ['requirements', 'design', 'coding', 'testing', 'deployment'];

			allStages.forEach(stageName => {
				const stageResult = state.stageResults.find(r => r.stage === stageName);
				const isCompleted = state.completedStages.includes(stageName);
				const isCurrent = state.currentStage === stageName && state.status === 'running';

				let stageClass = 'stage';
				let icon = '⏳';
				let statusText = 'Pending';

				if (stageResult) {
					if (stageResult.success) {
						stageClass += ' stage-completed';
						icon = '✓';
						statusText = 'Completed';
					} else {
						stageClass += ' stage-failed';
						icon = '✗';
						statusText = 'Failed';
					}
				} else if (isCurrent) {
					stageClass += ' stage-running';
					icon = '▶';
					statusText = 'Running';
				} else {
					stageClass += ' stage-pending';
				}

				const stageDiv = document.createElement('div');
				stageDiv.className = stageClass;
				stageDiv.innerHTML = \`
					<div class="stage-header">
						<div>
							<span class="stage-icon">\${icon}</span>
							<span class="stage-name">\${stageName}</span>
						</div>
						<span class="stage-status">\${statusText}</span>
					</div>
					\${stageResult && stageResult.output ? \`<div class="stage-output">\${escapeHtml(stageResult.output.substring(0, 500))}</div>\` : ''}
				\`;

				stagesContainer.appendChild(stageDiv);
			});

			// Update controls
			const pauseBtn = document.getElementById('pause-btn');
			const resumeBtn = document.getElementById('resume-btn');
			const cancelBtn = document.getElementById('cancel-btn');

			pauseBtn.disabled = state.status !== 'running';
			resumeBtn.disabled = state.status !== 'paused';
			cancelBtn.disabled = state.status === 'completed' || state.status === 'failed';
		}

		function escapeHtml(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}
	</script>
</body>
</html>`;
	}

	dispose(): void {
		this.stopAutoUpdate();
		this.panel?.dispose();
	}
}
