import * as vscode from 'vscode';

/**
 * Auto-updater service for Miaoda IDE
 * Checks for updates and notifies users
 */
export class AutoUpdater {
	private checkInterval: NodeJS.Timeout | null = null;
	private readonly UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly updateUrl: string = 'https://releases.miaoda.com'
	) {}

	/**
	 * Initialize auto-updater
	 */
	async initialize(): Promise<void> {
		// Check for updates on startup
		await this.checkForUpdates(false);

		// Start periodic checks
		this.startPeriodicChecks();
	}

	/**
	 * Check for updates
	 */
	async checkForUpdates(showNoUpdateMessage: boolean = true): Promise<void> {
		try {
			const currentVersion = this.getCurrentVersion();
			const latestVersion = await this.fetchLatestVersion();

			if (!latestVersion) {
				return;
			}

			if (this.isNewerVersion(latestVersion, currentVersion)) {
				await this.showUpdateNotification(latestVersion);
			} else if (showNoUpdateMessage) {
				vscode.window.showInformationMessage('You are using the latest version of Miaoda IDE');
			}
		} catch (error) {
			console.error('Failed to check for updates:', error);
		}
	}

	/**
	 * Get current version
	 */
	private getCurrentVersion(): string {
		// In Electron app, this would come from package.json
		// For now, return a placeholder
		return '1.0.0';
	}

	/**
	 * Fetch latest version from update server
	 */
	private async fetchLatestVersion(): Promise<string | null> {
		try {
			const platform = this.getPlatform();
			const metadataUrl = `${this.updateUrl}/latest-${platform}.yml`;

			const response = await fetch(metadataUrl);
			if (!response.ok) {
				return null;
			}

			const yaml = await response.text();
			const versionMatch = yaml.match(/version:\s*([\d.]+)/);

			return versionMatch ? versionMatch[1] : null;
		} catch (error) {
			console.error('Failed to fetch latest version:', error);
			return null;
		}
	}

	/**
	 * Check if version is newer
	 */
	private isNewerVersion(latest: string, current: string): boolean {
		const latestParts = latest.split('.').map(Number);
		const currentParts = current.split('.').map(Number);

		for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
			const latestPart = latestParts[i] || 0;
			const currentPart = currentParts[i] || 0;

			if (latestPart > currentPart) {
				return true;
			}
			if (latestPart < currentPart) {
				return false;
			}
		}

		return false;
	}

	/**
	 * Show update notification
	 */
	private async showUpdateNotification(version: string): Promise<void> {
		const action = await vscode.window.showInformationMessage(
			`A new version of Miaoda IDE (${version}) is available!`,
			'Download',
			'Release Notes',
			'Later'
		);

		if (action === 'Download') {
			const downloadUrl = this.getDownloadUrl(version);
			vscode.env.openExternal(vscode.Uri.parse(downloadUrl));
		} else if (action === 'Release Notes') {
			const releaseNotesUrl = `${this.updateUrl}/releases/${version}`;
			vscode.env.openExternal(vscode.Uri.parse(releaseNotesUrl));
		}
	}

	/**
	 * Get download URL for current platform
	 */
	private getDownloadUrl(version: string): string {
		const platform = this.getPlatform();
		const arch = process.arch === 'arm64' ? 'arm64' : 'x64';

		let ext = '';
		switch (platform) {
			case 'mac':
				ext = 'dmg';
				break;
			case 'win':
				ext = 'exe';
				break;
			case 'linux':
				ext = 'AppImage';
				break;
		}

		return `${this.updateUrl}/Miaoda-IDE-${version}-${platform}-${arch}.${ext}`;
	}

	/**
	 * Get platform identifier
	 */
	private getPlatform(): string {
		switch (process.platform) {
			case 'darwin':
				return 'mac';
			case 'win32':
				return 'win';
			case 'linux':
				return 'linux';
			default:
				return 'linux';
		}
	}

	/**
	 * Start periodic update checks
	 */
	private startPeriodicChecks(): void {
		this.stopPeriodicChecks();

		this.checkInterval = setInterval(() => {
			this.checkForUpdates(false);
		}, this.UPDATE_CHECK_INTERVAL);
	}

	/**
	 * Stop periodic update checks
	 */
	private stopPeriodicChecks(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}

	dispose(): void {
		this.stopPeriodicChecks();
	}
}
