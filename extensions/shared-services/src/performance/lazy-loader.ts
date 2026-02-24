import * as vscode from 'vscode';

/**
 * Extension load priority
 */
export enum LoadPriority {
	CRITICAL = 0, // Load immediately
	HIGH = 1, // Load after 1 second
	MEDIUM = 2, // Load after 5 seconds
	LOW = 3, // Load after 10 seconds
	ON_DEMAND = 4, // Load only when needed
}

/**
 * Extension metadata
 */
interface ExtensionMetadata {
	id: string;
	priority: LoadPriority;
	loaded: boolean;
	loadTime?: number;
}

/**
 * Lazy loader for extensions
 * Delays loading of non-critical extensions to improve startup time
 */
export class LazyLoader {
	private extensions: Map<string, ExtensionMetadata> = new Map();
	private loadTimers: Map<string, NodeJS.Timeout> = new Map();

	constructor(private readonly context: vscode.ExtensionContext) {}

	/**
	 * Register extension for lazy loading
	 */
	register(extensionId: string, priority: LoadPriority): void {
		this.extensions.set(extensionId, {
			id: extensionId,
			priority,
			loaded: false,
		});
	}

	/**
	 * Start lazy loading
	 */
	start(): void {
		for (const [id, metadata] of this.extensions) {
			if (metadata.priority === LoadPriority.CRITICAL) {
				// Load immediately
				this.loadExtension(id);
			} else if (metadata.priority !== LoadPriority.ON_DEMAND) {
				// Schedule delayed load
				const delay = this.getDelay(metadata.priority);
				const timer = setTimeout(() => {
					this.loadExtension(id);
				}, delay);

				this.loadTimers.set(id, timer);
			}
		}
	}

	/**
	 * Load extension
	 */
	private async loadExtension(extensionId: string): Promise<void> {
		const metadata = this.extensions.get(extensionId);
		if (!metadata || metadata.loaded) {
			return;
		}

		const startTime = Date.now();

		try {
			const extension = vscode.extensions.getExtension(extensionId);
			if (extension && !extension.isActive) {
				await extension.activate();
			}

			metadata.loaded = true;
			metadata.loadTime = Date.now() - startTime;

			console.log(`Lazy loaded ${extensionId} in ${metadata.loadTime}ms`);
		} catch (error) {
			console.error(`Failed to lazy load ${extensionId}:`, error);
		}
	}

	/**
	 * Load extension on demand
	 */
	async loadOnDemand(extensionId: string): Promise<void> {
		const metadata = this.extensions.get(extensionId);
		if (!metadata) {
			throw new Error(`Extension ${extensionId} not registered`);
		}

		if (metadata.loaded) {
			return;
		}

		await this.loadExtension(extensionId);
	}

	/**
	 * Get delay for priority
	 */
	private getDelay(priority: LoadPriority): number {
		switch (priority) {
			case LoadPriority.HIGH:
				return 1000; // 1 second
			case LoadPriority.MEDIUM:
				return 5000; // 5 seconds
			case LoadPriority.LOW:
				return 10000; // 10 seconds
			default:
				return 0;
		}
	}

	/**
	 * Get load stats
	 */
	getStats(): {
		total: number;
		loaded: number;
		pending: number;
		averageLoadTime: number;
	} {
		const extensions = Array.from(this.extensions.values());
		const loaded = extensions.filter(e => e.loaded);
		const totalLoadTime = loaded.reduce((sum, e) => sum + (e.loadTime || 0), 0);

		return {
			total: extensions.length,
			loaded: loaded.length,
			pending: extensions.length - loaded.length,
			averageLoadTime: loaded.length > 0 ? totalLoadTime / loaded.length : 0,
		};
	}

	/**
	 * Cancel all pending loads
	 */
	dispose(): void {
		for (const timer of this.loadTimers.values()) {
			clearTimeout(timer);
		}
		this.loadTimers.clear();
	}
}

/**
 * Default extension priorities
 */
export const DEFAULT_PRIORITIES: Record<string, LoadPriority> = {
	// Critical - load immediately
	'miaoda.auth-service': LoadPriority.CRITICAL,
	'miaoda.license-service': LoadPriority.CRITICAL,
	'miaoda.shared-services': LoadPriority.CRITICAL,

	// High priority - load after 1 second
	'miaoda.agent-chat-panel': LoadPriority.HIGH,
	'miaoda.agent-orchestrator': LoadPriority.HIGH,

	// Medium priority - load after 5 seconds
	'miaoda.skills-manager': LoadPriority.MEDIUM,

	// Low priority - load after 10 seconds
	'miaoda.browser-bridge': LoadPriority.LOW,

	// On demand - load only when needed
	// (none currently)
};
