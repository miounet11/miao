import * as vscode from 'vscode';

/**
 * Usage information
 */
export interface UsageInfo {
	plan: 'free' | 'pro' | 'team' | 'enterprise';
	period: {
		start: string; // ISO date
		end: string; // ISO date
	};
	quota: {
		requests: { used: number; limit: number };
		tokens: { used: number; limit: number };
		storage: { used: number; limit: number }; // MB
	};
	features: {
		name: string;
		enabled: boolean;
		usage?: number;
		limit?: number;
	}[];
}

/**
 * Usage tracker service
 */
export class UsageTracker {
	private statusBarItem: vscode.StatusBarItem;
	private updateInterval: NodeJS.Timeout | null = null;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly apiBaseUrl: string = 'https://api.miaoda.com'
	) {
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			99
		);
		this.statusBarItem.command = 'miaoda.usage.showDetails';
	}

	/**
	 * Initialize usage tracker
	 */
	async initialize(): Promise<void> {
		// Update usage on startup
		await this.updateUsage();

		// Show status bar
		this.statusBarItem.show();

		// Start periodic updates (every 5 minutes)
		this.startPeriodicUpdates();

		// Register command
		this.context.subscriptions.push(
			vscode.commands.registerCommand('miaoda.usage.showDetails', () => {
				this.showUsageDetails();
			})
		);
	}

	/**
	 * Update usage information
	 */
	async updateUsage(): Promise<void> {
		try {
			const usage = await this.fetchUsage();

			if (usage) {
				this.updateStatusBar(usage);
			}
		} catch (error) {
			console.error('Failed to update usage:', error);
			this.statusBarItem.text = '$(warning) Usage unavailable';
		}
	}

	/**
	 * Fetch usage from API
	 */
	private async fetchUsage(): Promise<UsageInfo | null> {
		try {
			// Get access token from auth service
			const authService = vscode.extensions.getExtension('miaoda.auth-service');
			if (!authService) {
				return null;
			}

			const authAPI = await authService.activate();
			const accessToken = await authAPI.getAccessToken();

			if (!accessToken) {
				return null;
			}

			const response = await fetch(`${this.apiBaseUrl}/api/v1/usage/current`, {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
				},
			});

			if (!response.ok) {
				return null;
			}

			return await response.json() as UsageInfo;
		} catch (error) {
			console.error('Failed to fetch usage:', error);
			return null;
		}
	}

	/**
	 * Update status bar
	 */
	private updateStatusBar(usage: UsageInfo): void {
		const requestsPercent = (usage.quota.requests.used / usage.quota.requests.limit) * 100;
		const tokensPercent = (usage.quota.tokens.used / usage.quota.tokens.limit) * 100;

		let icon = '$(pulse)';
		let color: string | undefined;

		// Warning if usage > 80%
		if (requestsPercent > 80 || tokensPercent > 80) {
			icon = '$(warning)';
			color = new vscode.ThemeColor('statusBarItem.warningBackground') as any;
		}

		// Error if usage > 95%
		if (requestsPercent > 95 || tokensPercent > 95) {
			icon = '$(error)';
			color = new vscode.ThemeColor('statusBarItem.errorBackground') as any;
		}

		this.statusBarItem.text = `${icon} ${Math.round(requestsPercent)}% used`;
		this.statusBarItem.tooltip = this.getTooltip(usage);
		this.statusBarItem.backgroundColor = color;
	}

	/**
	 * Get tooltip text
	 */
	private getTooltip(usage: UsageInfo): string {
		const lines = [
			`Plan: ${usage.plan.toUpperCase()}`,
			`Period: ${new Date(usage.period.start).toLocaleDateString()} - ${new Date(usage.period.end).toLocaleDateString()}`,
			'',
			`Requests: ${usage.quota.requests.used.toLocaleString()} / ${usage.quota.requests.limit.toLocaleString()}`,
			`Tokens: ${usage.quota.tokens.used.toLocaleString()} / ${usage.quota.tokens.limit.toLocaleString()}`,
			`Storage: ${usage.quota.storage.used} MB / ${usage.quota.storage.limit} MB`,
			'',
			'Click for details',
		];

		return lines.join('\n');
	}

	/**
	 * Show usage details panel
	 */
	private async showUsageDetails(): Promise<void> {
		const usage = await this.fetchUsage();

		if (!usage) {
			vscode.window.showWarningMessage('Unable to fetch usage information. Please login.');
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'miaodaUsage',
			'Usage Details',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);

		panel.webview.html = this.getUsageHtml(usage);

		// Handle messages from webview
		panel.webview.onDidReceiveMessage(
			async (message) => {
				if (message.command === 'upgrade') {
					vscode.env.openExternal(vscode.Uri.parse('https://miaoda.com/pricing'));
				}
			},
			undefined,
			this.context.subscriptions
		);
	}

	/**
	 * Get usage HTML
	 */
	private getUsageHtml(usage: UsageInfo): string {
		const requestsPercent = (usage.quota.requests.used / usage.quota.requests.limit) * 100;
		const tokensPercent = (usage.quota.tokens.used / usage.quota.tokens.limit) * 100;
		const storagePercent = (usage.quota.storage.used / usage.quota.storage.limit) * 100;

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Usage Details</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			padding: 20px;
			margin: 0;
		}
		h1 {
			margin-top: 0;
		}
		.plan-badge {
			display: inline-block;
			padding: 4px 12px;
			border-radius: 12px;
			background: var(--vscode-badge-background);
			color: var(--vscode-badge-foreground);
			font-size: 12px;
			font-weight: 600;
			text-transform: uppercase;
			margin-left: 10px;
		}
		.period {
			margin: 20px 0;
			opacity: 0.8;
		}
		.quota-section {
			margin: 30px 0;
		}
		.quota-item {
			margin-bottom: 20px;
		}
		.quota-header {
			display: flex;
			justify-content: space-between;
			margin-bottom: 8px;
		}
		.quota-label {
			font-weight: 600;
		}
		.quota-value {
			opacity: 0.8;
		}
		.progress-bar {
			width: 100%;
			height: 8px;
			background: var(--vscode-progressBar-background);
			border-radius: 4px;
			overflow: hidden;
		}
		.progress-fill {
			height: 100%;
			background: var(--vscode-progressBar-background);
			transition: width 0.3s ease;
		}
		.progress-warning {
			background: var(--vscode-editorWarning-foreground);
		}
		.progress-error {
			background: var(--vscode-editorError-foreground);
		}
		.features {
			margin-top: 30px;
		}
		.feature-item {
			padding: 10px;
			margin-bottom: 8px;
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.feature-enabled {
			color: var(--vscode-testing-iconPassed);
		}
		.feature-disabled {
			opacity: 0.5;
		}
		button {
			padding: 10px 20px;
			margin-top: 20px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 2px;
			cursor: pointer;
			font-size: 14px;
		}
		button:hover {
			background: var(--vscode-button-hoverBackground);
		}
	</style>
</head>
<body>
	<h1>
		Usage Details
		<span class="plan-badge">${usage.plan}</span>
	</h1>

	<div class="period">
		Billing Period: ${new Date(usage.period.start).toLocaleDateString()} - ${new Date(usage.period.end).toLocaleDateString()}
	</div>

	<div class="quota-section">
		<h2>Quota Usage</h2>

		<div class="quota-item">
			<div class="quota-header">
				<span class="quota-label">API Requests</span>
				<span class="quota-value">${usage.quota.requests.used.toLocaleString()} / ${usage.quota.requests.limit.toLocaleString()}</span>
			</div>
			<div class="progress-bar">
				<div class="progress-fill ${requestsPercent > 95 ? 'progress-error' : requestsPercent > 80 ? 'progress-warning' : ''}" style="width: ${requestsPercent}%"></div>
			</div>
		</div>

		<div class="quota-item">
			<div class="quota-header">
				<span class="quota-label">Tokens</span>
				<span class="quota-value">${usage.quota.tokens.used.toLocaleString()} / ${usage.quota.tokens.limit.toLocaleString()}</span>
			</div>
			<div class="progress-bar">
				<div class="progress-fill ${tokensPercent > 95 ? 'progress-error' : tokensPercent > 80 ? 'progress-warning' : ''}" style="width: ${tokensPercent}%"></div>
			</div>
		</div>

		<div class="quota-item">
			<div class="quota-header">
				<span class="quota-label">Storage</span>
				<span class="quota-value">${usage.quota.storage.used} MB / ${usage.quota.storage.limit} MB</span>
			</div>
			<div class="progress-bar">
				<div class="progress-fill ${storagePercent > 95 ? 'progress-error' : storagePercent > 80 ? 'progress-warning' : ''}" style="width: ${storagePercent}%"></div>
			</div>
		</div>
	</div>

	<div class="features">
		<h2>Features</h2>
		${usage.features.map(f => `
			<div class="feature-item ${f.enabled ? 'feature-enabled' : 'feature-disabled'}">
				<span>${f.enabled ? '✓' : '✗'} ${f.name}</span>
				${f.usage !== undefined && f.limit !== undefined ? `<span>${f.usage} / ${f.limit}</span>` : ''}
			</div>
		`).join('')}
	</div>

	${usage.plan === 'free' ? '<button onclick="upgrade()">Upgrade Plan</button>' : ''}

	<script>
		const vscode = acquireVsCodeApi();

		function upgrade() {
			vscode.postMessage({ command: 'upgrade' });
		}
	</script>
</body>
</html>`;
	}

	/**
	 * Start periodic updates
	 */
	private startPeriodicUpdates(): void {
		this.stopPeriodicUpdates();

		this.updateInterval = setInterval(() => {
			this.updateUsage();
		}, 5 * 60 * 1000); // 5 minutes
	}

	/**
	 * Stop periodic updates
	 */
	private stopPeriodicUpdates(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = null;
		}
	}

	dispose(): void {
		this.stopPeriodicUpdates();
		this.statusBarItem.dispose();
	}
}
