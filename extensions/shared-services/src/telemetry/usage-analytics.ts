import * as vscode from 'vscode';
import * as os from 'os';

/**
 * Usage event
 */
export interface UsageEvent {
	event: string;
	properties?: Record<string, any>;
	timestamp: string;
	sessionId: string;
}

/**
 * Session data
 */
interface SessionData {
	id: string;
	startTime: number;
	events: UsageEvent[];
}

/**
 * Usage analytics service
 */
export class UsageAnalytics {
	private enabled: boolean = false;
	private session: SessionData;
	private flushInterval: NodeJS.Timeout | null = null;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly apiBaseUrl: string = 'https://api.miaoda.com'
	) {
		this.session = this.createSession();
	}

	/**
	 * Initialize analytics
	 */
	async initialize(): Promise<void> {
		// Check telemetry consent
		const consent = this.context.globalState.get<boolean>('miaoda.telemetry.consent');
		this.enabled = consent === true;

		if (this.enabled) {
			this.trackEvent('session_start', {
				platform: os.platform(),
				arch: os.arch(),
				version: this.getVersion(),
			});

			// Start periodic flush (every 5 minutes)
			this.startPeriodicFlush();

			// Flush on window close
			this.context.subscriptions.push({
				dispose: () => this.flush(),
			});
		}
	}

	/**
	 * Track event
	 */
	trackEvent(event: string, properties?: Record<string, any>): void {
		if (!this.enabled) {
			return;
		}

		const usageEvent: UsageEvent = {
			event,
			properties: this.sanitizeProperties(properties),
			timestamp: new Date().toISOString(),
			sessionId: this.session.id,
		};

		this.session.events.push(usageEvent);

		// Auto-flush if buffer is large
		if (this.session.events.length >= 50) {
			this.flush();
		}
	}

	/**
	 * Track feature usage
	 */
	trackFeature(feature: string, metadata?: Record<string, any>): void {
		this.trackEvent('feature_used', {
			feature,
			...metadata,
		});
	}

	/**
	 * Track command execution
	 */
	trackCommand(command: string, duration?: number): void {
		this.trackEvent('command_executed', {
			command,
			duration,
		});
	}

	/**
	 * Track LLM request
	 */
	trackLLMRequest(provider: string, model: string, duration: number, tokens?: number): void {
		this.trackEvent('llm_request', {
			provider,
			model,
			duration,
			tokens,
		});
	}

	/**
	 * Track extension load time
	 */
	trackExtensionLoad(extensionId: string, duration: number): void {
		this.trackEvent('extension_loaded', {
			extensionId,
			duration,
		});
	}

	/**
	 * Track performance metric
	 */
	trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
		this.trackEvent('performance_metric', {
			metric,
			value,
			unit,
		});
	}

	/**
	 * Sanitize properties (remove PII)
	 */
	private sanitizeProperties(properties?: Record<string, any>): Record<string, any> | undefined {
		if (!properties) {
			return undefined;
		}

		const sanitized: Record<string, any> = {};

		for (const [key, value] of Object.entries(properties)) {
			// Skip sensitive keys
			if (this.isSensitiveKey(key)) {
				continue;
			}

			// Sanitize string values
			if (typeof value === 'string') {
				sanitized[key] = this.sanitizeString(value);
			} else {
				sanitized[key] = value;
			}
		}

		return sanitized;
	}

	/**
	 * Check if key is sensitive
	 */
	private isSensitiveKey(key: string): boolean {
		const sensitiveKeys = [
			'password',
			'token',
			'apikey',
			'secret',
			'email',
			'username',
			'path',
			'file',
			'directory',
		];

		return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
	}

	/**
	 * Sanitize string (remove file paths, emails, etc.)
	 */
	private sanitizeString(value: string): string {
		// Remove file paths
		let sanitized = value.replace(/\/[^\s]+/g, '[PATH]');
		sanitized = sanitized.replace(/[A-Z]:\\[^\s]+/g, '[PATH]');

		// Remove emails
		sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

		// Remove URLs
		sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[URL]');

		return sanitized;
	}

	/**
	 * Flush events to server
	 */
	async flush(): Promise<void> {
		if (!this.enabled || this.session.events.length === 0) {
			return;
		}

		const events = [...this.session.events];
		this.session.events = [];

		try {
			await this.sendEvents(events);
		} catch (error) {
			console.error('Failed to send analytics events:', error);
			// Re-add events to buffer
			this.session.events.unshift(...events);
		}
	}

	/**
	 * Send events to server
	 */
	private async sendEvents(events: UsageEvent[]): Promise<void> {
		const response = await fetch(`${this.apiBaseUrl}/api/v1/telemetry/events`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				sessionId: this.session.id,
				events,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
	}

	/**
	 * Create new session
	 */
	private createSession(): SessionData {
		return {
			id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
			startTime: Date.now(),
			events: [],
		};
	}

	/**
	 * Get app version
	 */
	private getVersion(): string {
		return '1.0.0';
	}

	/**
	 * Start periodic flush
	 */
	private startPeriodicFlush(): void {
		this.stopPeriodicFlush();

		this.flushInterval = setInterval(() => {
			this.flush();
		}, 5 * 60 * 1000); // 5 minutes
	}

	/**
	 * Stop periodic flush
	 */
	private stopPeriodicFlush(): void {
		if (this.flushInterval) {
			clearInterval(this.flushInterval);
			this.flushInterval = null;
		}
	}

	dispose(): void {
		this.stopPeriodicFlush();
		this.flush();
	}
}
