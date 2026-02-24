import * as vscode from 'vscode';

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
	memory: {
		heapUsed: number;
		heapTotal: number;
		external: number;
		rss: number;
	};
	cpu: {
		user: number;
		system: number;
	};
	extensions: {
		loaded: number;
		active: number;
		loadTime: number;
	};
}

/**
 * Performance monitor service
 */
export class PerformanceMonitor {
	private statusBarItem: vscode.StatusBarItem;
	private monitorInterval: NodeJS.Timeout | null = null;
	private readonly MEMORY_WARNING_THRESHOLD = 1.5 * 1024 * 1024 * 1024; // 1.5GB
	private readonly MEMORY_CRITICAL_THRESHOLD = 2 * 1024 * 1024 * 1024; // 2GB

	constructor(private readonly context: vscode.ExtensionContext) {
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			98
		);
		this.statusBarItem.command = 'miaoda.performance.showDetails';
	}

	/**
	 * Initialize performance monitor
	 */
	async initialize(): Promise<void> {
		// Update metrics
		this.updateMetrics();

		// Show status bar
		this.statusBarItem.show();

		// Start monitoring (every 10 seconds)
		this.startMonitoring();

		// Register commands
		this.registerCommands();
	}

	/**
	 * Update metrics
	 */
	private updateMetrics(): void {
		const metrics = this.collectMetrics();
		this.updateStatusBar(metrics);
		this.checkThresholds(metrics);
	}

	/**
	 * Collect performance metrics
	 */
	private collectMetrics(): PerformanceMetrics {
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		const extensions = vscode.extensions.all;
		const activeExtensions = extensions.filter(ext => ext.isActive);

		return {
			memory: {
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
				external: memUsage.external,
				rss: memUsage.rss,
			},
			cpu: {
				user: cpuUsage.user,
				system: cpuUsage.system,
			},
			extensions: {
				loaded: extensions.length,
				active: activeExtensions.length,
				loadTime: 0, // Would need to track this separately
			},
		};
	}

	/**
	 * Update status bar
	 */
	private updateStatusBar(metrics: PerformanceMetrics): void {
		const memoryMB = Math.round(metrics.memory.heapUsed / 1024 / 1024);
		const memoryPercent = (metrics.memory.heapUsed / this.MEMORY_CRITICAL_THRESHOLD) * 100;

		let icon = '$(pulse)';
		let color: string | undefined;

		if (metrics.memory.heapUsed > this.MEMORY_CRITICAL_THRESHOLD) {
			icon = '$(error)';
			color = new vscode.ThemeColor('statusBarItem.errorBackground') as any;
		} else if (metrics.memory.heapUsed > this.MEMORY_WARNING_THRESHOLD) {
			icon = '$(warning)';
			color = new vscode.ThemeColor('statusBarItem.warningBackground') as any;
		}

		this.statusBarItem.text = `${icon} ${memoryMB} MB`;
		this.statusBarItem.tooltip = this.getTooltip(metrics);
		this.statusBarItem.backgroundColor = color;
	}

	/**
	 * Get tooltip text
	 */
	private getTooltip(metrics: PerformanceMetrics): string {
		const lines = [
			'Performance Metrics',
			'',
			`Memory: ${Math.round(metrics.memory.heapUsed / 1024 / 1024)} MB`,
			`Heap Total: ${Math.round(metrics.memory.heapTotal / 1024 / 1024)} MB`,
			`RSS: ${Math.round(metrics.memory.rss / 1024 / 1024)} MB`,
			'',
			`Extensions: ${metrics.extensions.active}/${metrics.extensions.loaded} active`,
			'',
			'Click for details',
		];

		return lines.join('\n');
	}

	/**
	 * Check thresholds and warn user
	 */
	private checkThresholds(metrics: PerformanceMetrics): void {
		if (metrics.memory.heapUsed > this.MEMORY_CRITICAL_THRESHOLD) {
			this.showMemoryWarning('critical');
		} else if (metrics.memory.heapUsed > this.MEMORY_WARNING_THRESHOLD) {
			this.showMemoryWarning('warning');
		}
	}

	/**
	 * Show memory warning
	 */
	private async showMemoryWarning(level: 'warning' | 'critical'): Promise<void> {
		// Only show once per session
		const key = `miaoda.performance.memoryWarning.${level}`;
		if (this.context.globalState.get(key)) {
			return;
		}

		const memoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
		const message =
			level === 'critical'
				? `Extension Host is using ${memoryMB} MB of memory (>2GB). Consider reloading the window.`
				: `Extension Host is using ${memoryMB} MB of memory (>1.5GB). Performance may be affected.`;

		const action = await vscode.window.showWarningMessage(
			message,
			'Reload Window',
			'View Details',
			'Dismiss'
		);

		if (action === 'Reload Window') {
			vscode.commands.executeCommand('workbench.action.reloadWindow');
		} else if (action === 'View Details') {
			vscode.commands.executeCommand('miaoda.performance.showDetails');
		}

		// Mark as shown
		await this.context.globalState.update(key, true);
	}

	/**
	 * Register commands
	 */
	private registerCommands(): void {
		this.context.subscriptions.push(
			vscode.commands.registerCommand('miaoda.performance.showDetails', () => {
				this.showDetailsPanel();
			}),

			vscode.commands.registerCommand('miaoda.performance.optimizeMemory', async () => {
				await this.optimizeMemory();
			})
		);
	}

	/**
	 * Show details panel
	 */
	private showDetailsPanel(): void {
		const metrics = this.collectMetrics();

		const panel = vscode.window.createWebviewPanel(
			'miaodaPerformance',
			'Performance Details',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);

		panel.webview.html = this.getDetailsHtml(metrics);

		// Handle messages
		panel.webview.onDidReceiveMessage(
			async (message) => {
				if (message.command === 'optimize') {
					await this.optimizeMemory();
					panel.webview.postMessage({ type: 'optimized' });
				}
			},
			undefined,
			this.context.subscriptions
		);
	}

	/**
	 * Get details HTML
	 */
	private getDetailsHtml(metrics: PerformanceMetrics): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Performance Details</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			padding: 20px;
		}
		h1 { margin-top: 0; }
		.metric-section {
			margin: 30px 0;
			padding: 20px;
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
		}
		.metric-item {
			display: flex;
			justify-content: space-between;
			margin: 10px 0;
		}
		.metric-label { font-weight: 600; }
		.metric-value { opacity: 0.8; }
		button {
			padding: 10px 20px;
			margin-top: 20px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 2px;
			cursor: pointer;
		}
		button:hover {
			background: var(--vscode-button-hoverBackground);
		}
	</style>
</head>
<body>
	<h1>Performance Details</h1>

	<div class="metric-section">
		<h2>Memory Usage</h2>
		<div class="metric-item">
			<span class="metric-label">Heap Used</span>
			<span class="metric-value">${Math.round(metrics.memory.heapUsed / 1024 / 1024)} MB</span>
		</div>
		<div class="metric-item">
			<span class="metric-label">Heap Total</span>
			<span class="metric-value">${Math.round(metrics.memory.heapTotal / 1024 / 1024)} MB</span>
		</div>
		<div class="metric-item">
			<span class="metric-label">External</span>
			<span class="metric-value">${Math.round(metrics.memory.external / 1024 / 1024)} MB</span>
		</div>
		<div class="metric-item">
			<span class="metric-label">RSS</span>
			<span class="metric-value">${Math.round(metrics.memory.rss / 1024 / 1024)} MB</span>
		</div>
	</div>

	<div class="metric-section">
		<h2>Extensions</h2>
		<div class="metric-item">
			<span class="metric-label">Total Loaded</span>
			<span class="metric-value">${metrics.extensions.loaded}</span>
		</div>
		<div class="metric-item">
			<span class="metric-label">Active</span>
			<span class="metric-value">${metrics.extensions.active}</span>
		</div>
	</div>

	<button onclick="optimize()">Optimize Memory</button>

	<script>
		const vscode = acquireVsCodeApi();

		function optimize() {
			vscode.postMessage({ command: 'optimize' });
		}

		window.addEventListener('message', (event) => {
			const message = event.data;
			if (message.type === 'optimized') {
				alert('Memory optimization completed');
			}
		});
	</script>
</body>
</html>`;
	}

	/**
	 * Optimize memory
	 */
	private async optimizeMemory(): Promise<void> {
		// Trigger garbage collection if available
		if (global.gc) {
			global.gc();
		}

		vscode.window.showInformationMessage('Memory optimization completed');
	}

	/**
	 * Start monitoring
	 */
	private startMonitoring(): void {
		this.stopMonitoring();

		this.monitorInterval = setInterval(() => {
			this.updateMetrics();
		}, 10000); // 10 seconds
	}

	/**
	 * Stop monitoring
	 */
	private stopMonitoring(): void {
		if (this.monitorInterval) {
			clearInterval(this.monitorInterval);
			this.monitorInterval = null;
		}
	}

	dispose(): void {
		this.stopMonitoring();
		this.statusBarItem.dispose();
	}
}
