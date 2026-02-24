/**
 * Capability exports
 */
export { FilesystemCapability } from './FilesystemCapability';
export { TerminalCapability } from './TerminalCapability';
export { EditorCapability } from './EditorCapability';
export { GitCapability } from './GitCapability';
export { BrowserCapability } from './BrowserCapability';

/**
 * Capability metadata interface
 */
export interface CapabilityMetadata {
	name: string;
	description: string;
	available: boolean;
	methods: string[];
	note?: string;
}
