import * as vscode from 'vscode';

/**
 * Browser capability for web browsing operations
 * Delegates to Browser Bridge extension
 */
export class BrowserCapability {
	private readonly name = 'browser';
	private readonly description = 'Browse web pages and interact with web content';

	/**
	 * Open URL in browser
	 */
	async openUrl(url: string): Promise<void> {
		try {
			// Try to use Browser Bridge extension if available
			await vscode.commands.executeCommand('miaoda.browserBridge.open', url);
		} catch (error) {
			// Fallback to external browser
			await vscode.env.openExternal(vscode.Uri.parse(url));
		}
	}

	/**
	 * Navigate to URL
	 */
	async navigate(url: string): Promise<void> {
		try {
			await vscode.commands.executeCommand('miaoda.browserBridge.navigate', url);
		} catch (error) {
			throw new Error('Browser Bridge extension not available');
		}
	}

	/**
	 * Get page content
	 */
	async getPageContent(): Promise<string> {
		try {
			const content = await vscode.commands.executeCommand<string>('miaoda.browserBridge.getContent');
			return content || '';
		} catch (error) {
			throw new Error('Browser Bridge extension not available');
		}
	}

	/**
	 * Execute JavaScript in page
	 */
	async executeScript(script: string): Promise<any> {
		try {
			return await vscode.commands.executeCommand('miaoda.browserBridge.executeScript', script);
		} catch (error) {
			throw new Error('Browser Bridge extension not available');
		}
	}

	/**
	 * Take screenshot
	 */
	async takeScreenshot(): Promise<string> {
		try {
			const screenshot = await vscode.commands.executeCommand<string>('miaoda.browserBridge.screenshot');
			return screenshot || '';
		} catch (error) {
			throw new Error('Browser Bridge extension not available');
		}
	}

	/**
	 * Check if Browser Bridge is available
	 */
	private async isBrowserBridgeAvailable(): Promise<boolean> {
		const extensions = vscode.extensions.all;
		return extensions.some(ext => ext.id.includes('browser-bridge'));
	}

	/**
	 * Get capability metadata
	 */
	async getMetadata() {
		const available = await this.isBrowserBridgeAvailable();
		return {
			name: this.name,
			description: this.description,
			available,
			methods: ['openUrl', 'navigate', 'getPageContent', 'executeScript', 'takeScreenshot'],
			note: available ? undefined : 'Browser Bridge extension not installed',
		};
	}
}
