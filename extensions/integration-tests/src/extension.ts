import * as vscode from 'vscode';
import { SetupValidator } from './setup-validator';

export function activate(context: vscode.ExtensionContext) {
	console.log('Integration Tests extension activated');

	// Register validate setup command
	context.subscriptions.push(
		vscode.commands.registerCommand('miaoda.test.validateSetup', async () => {
			const validator = new SetupValidator();

			vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Validating Miaoda IDE setup...',
					cancellable: false,
				},
				async () => {
					const results = await validator.validate();
					const report = validator.generateReport(results);

					// Show report in output channel
					const outputChannel = vscode.window.createOutputChannel('Miaoda Validation');
					outputChannel.clear();
					outputChannel.appendLine(report);
					outputChannel.show();

					// Show summary
					const failed = results.filter(r => !r.passed).length;
					if (failed === 0) {
						vscode.window.showInformationMessage('✓ All validations passed!');
					} else {
						vscode.window.showErrorMessage(
							`✗ ${failed} validation(s) failed. Check output for details.`
						);
					}
				}
			);
		})
	);

	// Register run integration tests command
	context.subscriptions.push(
		vscode.commands.registerCommand('miaoda.test.runIntegration', async () => {
			vscode.window.showInformationMessage(
				'Running integration tests... Check terminal for output.'
			);

			// Run tests using vitest
			const terminal = vscode.window.createTerminal('Miaoda Tests');
			terminal.show();
			terminal.sendText('cd extensions/integration-tests && npm test');
		})
	);

	// Register run E2E tests command
	context.subscriptions.push(
		vscode.commands.registerCommand('miaoda.test.runE2E', async () => {
			vscode.window.showInformationMessage(
				'Running E2E tests... This may take several minutes.'
			);

			const terminal = vscode.window.createTerminal('Miaoda E2E Tests');
			terminal.show();
			terminal.sendText(
				'cd extensions/integration-tests && npm test -- e2e-scenarios.test.ts'
			);
		})
	);
}

export function deactivate() {
	console.log('Integration Tests extension deactivated');
}
