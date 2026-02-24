/**
 * ARIA helper utilities
 * Provides helpers for adding ARIA labels and roles to UI elements
 */

/**
 * ARIA roles
 */
export enum AriaRole {
	BUTTON = 'button',
	LINK = 'link',
	TEXTBOX = 'textbox',
	LIST = 'list',
	LISTITEM = 'listitem',
	MENU = 'menu',
	MENUITEM = 'menuitem',
	DIALOG = 'dialog',
	ALERT = 'alert',
	STATUS = 'status',
	PROGRESSBAR = 'progressbar',
	TAB = 'tab',
	TABPANEL = 'tabpanel',
	TREE = 'tree',
	TREEITEM = 'treeitem',
}

/**
 * ARIA attributes
 */
export interface AriaAttributes {
	role?: AriaRole;
	label?: string;
	labelledby?: string;
	describedby?: string;
	expanded?: boolean;
	selected?: boolean;
	disabled?: boolean;
	hidden?: boolean;
	live?: 'off' | 'polite' | 'assertive';
	atomic?: boolean;
	relevant?: string;
	busy?: boolean;
	valuenow?: number;
	valuemin?: number;
	valuemax?: number;
	valuetext?: string;
}

/**
 * ARIA helper class
 */
export class AriaHelper {
	/**
	 * Generate ARIA attributes string
	 */
	static generateAttributes(attrs: AriaAttributes): string {
		const parts: string[] = [];

		if (attrs.role) {
			parts.push(`role="${attrs.role}"`);
		}

		if (attrs.label) {
			parts.push(`aria-label="${this.escapeHtml(attrs.label)}"`);
		}

		if (attrs.labelledby) {
			parts.push(`aria-labelledby="${attrs.labelledby}"`);
		}

		if (attrs.describedby) {
			parts.push(`aria-describedby="${attrs.describedby}"`);
		}

		if (attrs.expanded !== undefined) {
			parts.push(`aria-expanded="${attrs.expanded}"`);
		}

		if (attrs.selected !== undefined) {
			parts.push(`aria-selected="${attrs.selected}"`);
		}

		if (attrs.disabled !== undefined) {
			parts.push(`aria-disabled="${attrs.disabled}"`);
		}

		if (attrs.hidden !== undefined) {
			parts.push(`aria-hidden="${attrs.hidden}"`);
		}

		if (attrs.live) {
			parts.push(`aria-live="${attrs.live}"`);
		}

		if (attrs.atomic !== undefined) {
			parts.push(`aria-atomic="${attrs.atomic}"`);
		}

		if (attrs.relevant) {
			parts.push(`aria-relevant="${attrs.relevant}"`);
		}

		if (attrs.busy !== undefined) {
			parts.push(`aria-busy="${attrs.busy}"`);
		}

		if (attrs.valuenow !== undefined) {
			parts.push(`aria-valuenow="${attrs.valuenow}"`);
		}

		if (attrs.valuemin !== undefined) {
			parts.push(`aria-valuemin="${attrs.valuemin}"`);
		}

		if (attrs.valuemax !== undefined) {
			parts.push(`aria-valuemax="${attrs.valuemax}"`);
		}

		if (attrs.valuetext) {
			parts.push(`aria-valuetext="${this.escapeHtml(attrs.valuetext)}"`);
		}

		return parts.join(' ');
	}

	/**
	 * Create button with ARIA
	 */
	static createButton(label: string, onClick: string, disabled: boolean = false): string {
		const attrs = this.generateAttributes({
			role: AriaRole.BUTTON,
			label,
			disabled,
		});

		return `<button ${attrs} onclick="${onClick}" ${disabled ? 'disabled' : ''}>${this.escapeHtml(label)}</button>`;
	}

	/**
	 * Create progress bar with ARIA
	 */
	static createProgressBar(value: number, max: number = 100, label?: string): string {
		const percent = Math.round((value / max) * 100);
		const attrs = this.generateAttributes({
			role: AriaRole.PROGRESSBAR,
			valuenow: value,
			valuemin: 0,
			valuemax: max,
			valuetext: `${percent}%`,
			label: label || `Progress: ${percent}%`,
		});

		return `<div ${attrs}><div style="width: ${percent}%"></div></div>`;
	}

	/**
	 * Create live region for announcements
	 */
	static createLiveRegion(id: string, polite: boolean = true): string {
		const attrs = this.generateAttributes({
			role: AriaRole.STATUS,
			live: polite ? 'polite' : 'assertive',
			atomic: true,
		});

		return `<div id="${id}" ${attrs}></div>`;
	}

	/**
	 * Create list with ARIA
	 */
	static createList(items: string[], label?: string): string {
		const listAttrs = this.generateAttributes({
			role: AriaRole.LIST,
			label,
		});

		const itemAttrs = this.generateAttributes({
			role: AriaRole.LISTITEM,
		});

		const itemsHtml = items
			.map(item => `<li ${itemAttrs}>${this.escapeHtml(item)}</li>`)
			.join('');

		return `<ul ${listAttrs}>${itemsHtml}</ul>`;
	}

	/**
	 * Escape HTML
	 */
	private static escapeHtml(text: string): string {
		const map: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;',
		};

		return text.replace(/[&<>"']/g, (m) => map[m]);
	}
}
