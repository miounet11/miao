import type { IDebounceController } from './inline-completion-provider';

/**
 * Debounce controller to avoid redundant LLM requests during rapid typing
 */
export class DebounceController implements IDebounceController {
	private lastTriggerTime: number = 0;
	private readonly debounceMs: number;

	constructor(debounceMs: number = 300) {
		this.debounceMs = debounceMs;
	}

	/**
	 * Check if enough time has passed since last trigger
	 */
	shouldTrigger(): boolean {
		const now = Date.now();
		if (now - this.lastTriggerTime >= this.debounceMs) {
			this.lastTriggerTime = now;
			return true;
		}
		return false;
	}

	/**
	 * Reset debounce timer
	 */
	reset(): void {
		this.lastTriggerTime = 0;
	}
}
