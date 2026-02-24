import * as vscode from 'vscode';
import { CrashReporter } from './crash-reporter';
import { UsageAnalytics } from './usage-analytics';

/**
 * Telemetry manager - unified interface for crash reporting and analytics
 */
export class TelemetryManager {
	private crashReporter: CrashReporter;
	private usageAnalytics: UsageAnalytics;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly apiBaseUrl: string = 'https://api.miaoda.com'
	) {
		this.crashReporter = new CrashReporter(context, apiBaseUrl);
		this.usageAnalytics = new UsageAnalytics(context, apiBaseUrl);
	}

	/**
	 * Initialize telemetry
	 */
	async initialize(): Promise<void> {
		await this.crashReporter.initialize();
		await this.usageAnalytics.initialize();

		// Register commands
		this.registerCommands();
	}

	/**
	 * Register telemetry commands
	 */
	private registerCommands(): void {
		this.context.subscriptions.push(
			vscode.commands.registerCommand('miaoda.telemetry.enable', async () => {
				await this.crashReporter.enable();
				await this.usageAnalytics.initialize();
			}),

			vscode.commands.registerCommand('miaoda.telemetry.disable', async () => {
				await this.crashReporter.disable();
			}),

			vscode.commands.registerCommand('miaoda.telemetry.showStatus', () => {
				const enabled = this.crashReporter.isEnabled();
				const message = enabled
					? 'Telemetry is enabled. Anonymous crash reports and usage data are being collected.'
					: 'Telemetry is disabled. No data is being collected.';

				vscode.window.showInformationMessage(message);
			})
		);
	}

	/**
	 * Get crash reporter
	 */
	getCrashReporter(): CrashReporter {
		return this.crashReporter;
	}

	/**
	 * Get usage analytics
	 */
	getUsageAnalytics(): UsageAnalytics {
		return this.usageAnalytics;
	}

	/**
	 * Track event (convenience method)
	 */
	trackEvent(event: string, properties?: Record<string, any>): void {
		this.usageAnalytics.trackEvent(event, properties);
	}

	/**
	 * Track feature usage (convenience method)
	 */
	trackFeature(feature: string, metadata?: Record<string, any>): void {
		this.usageAnalytics.trackFeature(feature, metadata);
	}

	/**
	 * Report crash (convenience method)
	 */
	async reportCrash(error: Error): Promise<void> {
		await this.crashReporter.reportCrash(error);
	}

	dispose(): void {
		this.usageAnalytics.dispose();
	}
}
