import { getCapabilityRegistry } from 'shared-services';
import type { ClientCapability } from 'shared-services';
import { FilesystemCapability } from './FilesystemCapability';
import { TerminalCapability } from './TerminalCapability';
import { EditorCapability } from './EditorCapability';
import { GitCapability } from './GitCapability';
import { BrowserCapability } from './BrowserCapability';

/**
 * Register all client capabilities to the registry
 */
export async function registerAllCapabilities(): Promise<void> {
	const registry = getCapabilityRegistry();

	// Initialize capability instances
	const filesystemCap = new FilesystemCapability();
	const terminalCap = new TerminalCapability();
	const editorCap = new EditorCapability();
	const gitCap = new GitCapability();
	const browserCap = new BrowserCapability();

	// Register Filesystem capability
	registry.register({
		name: 'filesystem',
		description: 'File system operations',
		type: 'filesystem',
		available: true,
		invoke: async (params: any) => {
			const { method, args } = params;
			switch (method) {
				case 'readFile':
					return { success: true, data: await filesystemCap.readFile(args.filePath) };
				case 'writeFile':
					await filesystemCap.writeFile(args.filePath, args.content);
					return { success: true, data: null };
				case 'listDirectory':
					return { success: true, data: await filesystemCap.listDirectory(args.dirPath) };
				case 'exists':
					return { success: true, data: await filesystemCap.exists(args.filePath) };
				case 'delete':
					await filesystemCap.delete(args.filePath);
					return { success: true, data: null };
				default:
					return { success: false, data: null, error: `Unknown method: ${method}` };
			}
		},
	});

	// Register Terminal capability
	registry.register({
		name: 'terminal',
		description: 'Terminal operations',
		type: 'terminal',
		available: true,
		invoke: async (params: any) => {
			const { method, args } = params;
			switch (method) {
				case 'executeCommand':
					return { success: true, data: await terminalCap.executeCommand(args.command, args.waitForCompletion) };
				case 'createTerminal':
					terminalCap.createTerminal(args.name);
					return { success: true, data: null };
				case 'closeTerminal':
					terminalCap.closeTerminal();
					return { success: true, data: null };
				default:
					return { success: false, data: null, error: `Unknown method: ${method}` };
			}
		},
	});

	// Register Editor capability
	registry.register({
		name: 'editor',
		description: 'Editor operations',
		type: 'editor',
		available: true,
		invoke: async (params: any) => {
			const { method, args } = params;
			switch (method) {
				case 'getActiveEditorContent':
					return { success: true, data: editorCap.getActiveEditorContent() };
				case 'replaceText':
					await editorCap.replaceText(args.startLine, args.startChar, args.endLine, args.endChar, args.newText);
					return { success: true, data: null };
				case 'insertText':
					await editorCap.insertText(args.text);
					return { success: true, data: null };
				case 'getSelectedText':
					return { success: true, data: editorCap.getSelectedText() };
				case 'formatDocument':
					await editorCap.formatDocument();
					return { success: true, data: null };
				case 'goToLine':
					await editorCap.goToLine(args.line);
					return { success: true, data: null };
				default:
					return { success: false, data: null, error: `Unknown method: ${method}` };
			}
		},
	});

	// Register Git capability
	registry.register({
		name: 'git',
		description: 'Git operations',
		type: 'git',
		available: true,
		invoke: async (params: any) => {
			const { method, args } = params;
			switch (method) {
				case 'getStatus':
					return { success: true, data: await gitCap.getStatus() };
				case 'stageFiles':
					await gitCap.stageFiles(args.files);
					return { success: true, data: null };
				case 'commit':
					return { success: true, data: await gitCap.commit(args.message) };
				case 'push':
					return { success: true, data: await gitCap.push(args.remote, args.branch) };
				case 'pull':
					return { success: true, data: await gitCap.pull(args.remote, args.branch) };
				case 'createBranch':
					return { success: true, data: await gitCap.createBranch(args.branchName) };
				case 'switchBranch':
					return { success: true, data: await gitCap.switchBranch(args.branchName) };
				case 'getCurrentBranch':
					return { success: true, data: await gitCap.getCurrentBranch() };
				case 'getLog':
					return { success: true, data: await gitCap.getLog(args.limit) };
				case 'getDiff':
					return { success: true, data: await gitCap.getDiff(args.staged) };
				default:
					return { success: false, data: null, error: `Unknown method: ${method}` };
			}
		},
	});

	// Register Browser capability
	const browserMetadata = await browserCap.getMetadata();
	registry.register({
		name: 'browser',
		description: 'Browser automation',
		type: 'browser',
		available: browserMetadata.available,
		invoke: async (params: any) => {
			const { method, args } = params;
			switch (method) {
				case 'openUrl':
					await browserCap.openUrl(args.url);
					return { success: true, data: null };
				case 'navigate':
					await browserCap.navigate(args.url);
					return { success: true, data: null };
				case 'getPageContent':
					return { success: true, data: await browserCap.getPageContent() };
				case 'executeScript':
					return { success: true, data: await browserCap.executeScript(args.script) };
				case 'takeScreenshot':
					return { success: true, data: await browserCap.takeScreenshot() };
				default:
					return { success: false, data: null, error: `Unknown method: ${method}` };
			}
		},
	});

	console.log('✅ All capabilities registered');
}

/**
 * Get list of all registered capabilities with their status
 */
export function getCapabilitiesStatus(): Array<{ type: string; available: boolean; methods: string[] }> {
	const registry = getCapabilityRegistry();
	const capabilities = registry.listCapabilities();

	return capabilities.map(cap => ({
		type: cap.type,
		available: cap.available,
		methods: [], // Methods are internal to capability classes
	}));
}
