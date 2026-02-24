/**
 * Setup validator - validates that all extensions are properly installed and configured
 */
import * as vscode from 'vscode';

export interface ValidationResult {
	passed: boolean;
	message: string;
	details?: string;
}

export class SetupValidator {
	/**
	 * Validate complete setup
	 */
	async validate(): Promise<ValidationResult[]> {
		const results: ValidationResult[] = [];

		// Validate extensions
		results.push(await this.validateExtensions());

		// Validate auth service
		results.push(await this.validateAuthService());

		// Validate license service
		results.push(await this.validateLicenseService());

		// Validate shared services
		results.push(await this.validateSharedServices());

		// Validate orchestrator
		results.push(await this.validateOrchestrator());

		// Validate chat panel
		results.push(await this.validateChatPanel());

		// Validate commands
		results.push(await this.validateCommands());

		return results;
	}

	/**
	 * Validate extensions are installed
	 */
	private async validateExtensions(): Promise<ValidationResult> {
		const requiredExtensions = [
			'miaoda.auth-service',
			'miaoda.license-service',
			'miaoda.shared-services',
			'miaoda.agent-orchestrator',
			'miaoda.agent-chat-panel',
		];

		const missing: string[] = [];

		for (const id of requiredExtensions) {
			const ext = vscode.extensions.getExtension(id);
			if (!ext) {
				missing.push(id);
			}
		}

		if (missing.length > 0) {
			return {
				passed: false,
				message: 'Missing required extensions',
				details: `Missing: ${missing.join(', ')}`,
			};
		}

		return {
			passed: true,
			message: 'All required extensions installed',
		};
	}

	/**
	 * Validate auth service
	 */
	private async validateAuthService(): Promise<ValidationResult> {
		const ext = vscode.extensions.getExtension('miaoda.auth-service');

		if (!ext) {
			return {
				passed: false,
				message: 'Auth service not installed',
			};
		}

		try {
			const api = await ext.activate();

			if (!api.getAuthManager || !api.getAccessToken || !api.isAuthenticated) {
				return {
					passed: false,
					message: 'Auth service API incomplete',
					details: 'Missing required API methods',
				};
			}

			return {
				passed: true,
				message: 'Auth service validated',
			};
		} catch (error) {
			return {
				passed: false,
				message: 'Auth service activation failed',
				details: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Validate license service
	 */
	private async validateLicenseService(): Promise<ValidationResult> {
		const ext = vscode.extensions.getExtension('miaoda.license-service');

		if (!ext) {
			return {
				passed: false,
				message: 'License service not installed',
			};
		}

		try {
			const api = await ext.activate();

			if (!api.getLicenseManager || !api.getLicenseInfo || !api.hasFeature) {
				return {
					passed: false,
					message: 'License service API incomplete',
				};
			}

			return {
				passed: true,
				message: 'License service validated',
			};
		} catch (error) {
			return {
				passed: false,
				message: 'License service activation failed',
				details: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Validate shared services
	 */
	private async validateSharedServices(): Promise<ValidationResult> {
		const ext = vscode.extensions.getExtension('miaoda.shared-services');

		if (!ext) {
			return {
				passed: false,
				message: 'Shared services not installed',
			};
		}

		// Shared services doesn't export API, just provides modules
		return {
			passed: true,
			message: 'Shared services validated',
		};
	}

	/**
	 * Validate orchestrator
	 */
	private async validateOrchestrator(): Promise<ValidationResult> {
		const ext = vscode.extensions.getExtension('miaoda.agent-orchestrator');

		if (!ext) {
			return {
				passed: false,
				message: 'Agent orchestrator not installed',
			};
		}

		try {
			const api = await ext.activate();

			if (!api.getPipeline) {
				return {
					passed: false,
					message: 'Orchestrator API incomplete',
				};
			}

			return {
				passed: true,
				message: 'Agent orchestrator validated',
			};
		} catch (error) {
			return {
				passed: false,
				message: 'Orchestrator activation failed',
				details: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Validate chat panel
	 */
	private async validateChatPanel(): Promise<ValidationResult> {
		const ext = vscode.extensions.getExtension('miaoda.agent-chat-panel');

		if (!ext) {
			return {
				passed: false,
				message: 'Chat panel not installed',
			};
		}

		try {
			await ext.activate();

			return {
				passed: true,
				message: 'Chat panel validated',
			};
		} catch (error) {
			return {
				passed: false,
				message: 'Chat panel activation failed',
				details: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Validate commands are registered
	 */
	private async validateCommands(): Promise<ValidationResult> {
		const requiredCommands = [
			// Auth
			'miaoda.auth.login',
			'miaoda.auth.logout',
			// License
			'miaoda.license.verify',
			'miaoda.license.showInfo',
			// Pipeline
			'miaoda.pipeline.showStatus',
			// Usage
			'miaoda.usage.showDetails',
			// Performance
			'miaoda.performance.showDetails',
			// Accessibility
			'miaoda.accessibility.toggleScreenReader',
		];

		const allCommands = await vscode.commands.getCommands();
		const missing: string[] = [];

		for (const cmd of requiredCommands) {
			if (!allCommands.includes(cmd)) {
				missing.push(cmd);
			}
		}

		if (missing.length > 0) {
			return {
				passed: false,
				message: 'Missing required commands',
				details: `Missing: ${missing.join(', ')}`,
			};
		}

		return {
			passed: true,
			message: 'All required commands registered',
		};
	}

	/**
	 * Generate validation report
	 */
	generateReport(results: ValidationResult[]): string {
		const lines: string[] = [];
		lines.push('='.repeat(60));
		lines.push('Miaoda IDE Setup Validation Report');
		lines.push('='.repeat(60));
		lines.push('');

		const passed = results.filter(r => r.passed).length;
		const failed = results.filter(r => !r.passed).length;

		lines.push(`Total: ${results.length}`);
		lines.push(`Passed: ${passed}`);
		lines.push(`Failed: ${failed}`);
		lines.push('');

		for (const result of results) {
			const icon = result.passed ? '✓' : '✗';
			lines.push(`${icon} ${result.message}`);
			if (result.details) {
				lines.push(`  ${result.details}`);
			}
		}

		lines.push('');
		lines.push('='.repeat(60));

		if (failed === 0) {
			lines.push('✓ All validations passed!');
		} else {
			lines.push(`✗ ${failed} validation(s) failed`);
		}

		lines.push('='.repeat(60));

		return lines.join('\n');
	}
}
