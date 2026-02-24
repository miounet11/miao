import * as vscode from 'vscode';
import * as os from 'os';

/**
 * Crash report data
 */
export interface CrashReport {
	id: string;
	timestamp: string;
	version: string;
	platform: string;
	arch: string;
	error: {
		message: string;
		stack?: string;
		type: string;
	};
	context: {
		extensions: string[];
		workspace?: string;
		memory: {
			total: number;
			free: number;
			used: number;
		};
	};
	user?: {
		id: string;
		email?: string;
	};
}

/**
 * Crash reporter service
 */
export class CrashReporter {
	private enabled: boolean = false;
	private userId: string | null = null;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly apiBaseUrl: string = 'https://api.miaoda.com'
	) {}

	/**
	 * Initialize crash reporter
	 */
	async initialize(): Promise<void> {
		// Check if user has consented to telemetry
		const consent = this.context.globalState.get<boolean>('miaoda.telemetry.consent');

		if (consent === undefined) {
			// First time - ask for consent
			await this.requestConsent();
		} else {
			this.enabled = consent;
		}

		if (this.enabled) {
			this.setupErrorHandlers();
		}
	}

	/**
	 * Request telemetry consent
	 */
	private async requestConsent(): Promise<void> {
		const message = [
			'Help improve Miaoda IDE by sending anonymous crash reports and usage data.',
			'',
			'We collect:',
			'• Crash reports and error logs',
			'• Feature usage statistics',
			'• Performance metrics',
			'',
			'We DO NOT collect:',
			'• Code content',
			'• File paths',
			'• Personal information',
		].join('\n');

		const choice = await vscode.window.showInformationMessage(
			message,
			{ modal: true },
			'Enable',
			'Disable'
		);

		const consent = choice === 'Enable';
		await this.context.globalState.update('miaoda.telemetry.consent', consent);
		this.enabled = consent;

		if (consent) {
			vscode.window.showInformationMessage('Thank you for helping improve Miaoda IDE!');
		}
	}

	/**
	 * Setup error handlers
	 */
	private setupErrorHandlers(): void {
		// Handle uncaught errors
		process.on('uncaughtException', (error) => {
			this.reportCrash(error);
		});

		process.on('unhandledRejection', (reason) => {
			const error = reason instanceof Error ? reason : new Error(String(reason));
			this.reportCrash(error);
		});
	}

	/**
	 * Report crash
	 */
	async reportCrash(error: Error): Promise<void> {
		if (!this.enabled) {
			return;
		}

		try {
			const report = await this.createCrashReport(error);
			await this.sendCrashReport(report);

			// Show recovery dialog
			await this.showRecoveryDialog(error);
		} catch (e) {
			console.error('Failed to report crash:', e);
		}
	}

	/**
	 * Create crash report
	 */
	private async createCrashReport(error: Error): Promise<CrashReport> {
		const extensions = vscode.extensions.all
			.filter(ext => ext.isActive)
			.map(ext => `${ext.id}@${ext.packageJSON.version}`);

		const memUsage = process.memoryUsage();
		const totalMem = os.totalmem();
		const freeMem = os.freemem();

		const report: CrashReport = {
			id: this.generateReportId(),
			timestamp: new Date().toISOString(),
			version: this.getVersion(),
			platform: os.platform(),
			arch: os.arch(),
			error: {
				message: error.message,
				stack: error.stack,
				type: error.name,
			},
			context: {
				extensions,
				workspace: vscode.workspace.workspaceFolders?.[0]?.name,
				memory: {
					total: totalMem,
					free: freeMem,
					used: memUsage.heapUsed,
				},
			},
		};

		// Add user info if authenticated
		const authService = vscode.extensions.getExtension('miaoda.auth-service');
		if (authService) {
			try {
				const authAPI = await authService.activate();
				const authState = authAPI.getAuthState();
				if (authState.isAuthenticated && authState.user) {
					report.user = {
						id: authState.user.id,
						email: authState.user.email,
					};
				}
			} catch (e) {
				// Ignore auth errors
			}
		}

		return report;
	}

	/**
	 * Send crash report to server
	 */
	private async sendCrashReport(report: CrashReport): Promise<void> {
		try {
			const response = await fetch(`${this.apiBaseUrl}/api/v1/telemetry/crash`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(report),
			});

			if (!response.ok) {
				console.error('Failed to send crash report:', response.status);
			}
		} catch (error) {
			console.error('Failed to send crash report:', error);
		}
	}

	/**
	 * Show recovery dialog
	 */
	private async showRecoveryDialog(error: Error): Promise<void> {
		const action = await vscode.window.showErrorMessage(
			`Miaoda IDE encountered an error: ${error.message}`,
			'Reload Window',
			'View Logs',
			'Report Issue'
		);

		switch (action) {
			case 'Reload Window':
				vscode.commands.executeCommand('workbench.action.reloadWindow');
				break;
			case 'View Logs':
				vscode.commands.executeCommand('workbench.action.showLogs');
				break;
			case 'Report Issue':
				vscode.env.openExternal(
					vscode.Uri.parse('https://github.com/miaoda/miaoda-ide/issues/new')
				);
				break;
		}
	}

	/**
	 * Generate report ID
	 */
	private generateReportId(): string {
		return `crash-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Get app version
	 */
	private getVersion(): string {
		// In production, this would come from package.json
		return '1.0.0';
	}

	/**
	 * Enable telemetry
	 */
	async enable(): Promise<void> {
		await this.context.globalState.update('miaoda.telemetry.consent', true);
		this.enabled = true;
		this.setupErrorHandlers();
		vscode.window.showInformationMessage('Telemetry enabled');
	}

	/**
	 * Disable telemetry
	 */
	async disable(): Promise<void> {
		await this.context.globalState.update('miaoda.telemetry.consent', false);
		this.enabled = false;
		vscode.window.showInformationMessage('Telemetry disabled');
	}

	/**
	 * Check if telemetry is enabled
	 */
	isEnabled(): boolean {
		return this.enabled;
	}
}
