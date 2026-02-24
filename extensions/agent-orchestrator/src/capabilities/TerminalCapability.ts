import * as vscode from 'vscode';

/**
 * Terminal capability for executing shell commands
 */
export class TerminalCapability {
	private readonly name = 'terminal';
	private readonly description = 'Execute shell commands in terminal';
	private terminal: vscode.Terminal | null = null;

	/**
	 * Execute command in terminal
	 */
	async executeCommand(command: string, waitForCompletion: boolean = false): Promise<string> {
		if (!this.terminal || this.terminal.exitStatus !== undefined) {
			this.terminal = vscode.window.createTerminal('Miaoda Agent');
		}

		this.terminal.show();
		this.terminal.sendText(command);

		if (waitForCompletion) {
			// Note: VSCode doesn't provide direct command output capture
			// This is a placeholder for future implementation
			return 'Command executed (output capture not available in VSCode API)';
		}

		return 'Command sent to terminal';
	}

	/**
	 * Create new terminal
	 */
	createTerminal(name?: string): void {
		this.terminal = vscode.window.createTerminal(name || 'Miaoda Agent');
		this.terminal.show();
	}

	/**
	 * Close terminal
	 */
	closeTerminal(): void {
		if (this.terminal) {
			this.terminal.dispose();
			this.terminal = null;
		}
	}

	/**
	 * Get capability metadata
	 */
	getMetadata() {
		return {
			name: this.name,
			description: this.description,
			available: true,
			methods: ['executeCommand', 'createTerminal', 'closeTerminal'],
		};
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.closeTerminal();
	}
}
