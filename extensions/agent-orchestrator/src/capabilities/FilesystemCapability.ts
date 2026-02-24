import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Filesystem capability for file operations
 */
export class FilesystemCapability {
	private readonly name = 'filesystem';
	private readonly description = 'Read, write, and manage files and directories';

	/**
	 * Read file content
	 */
	async readFile(filePath: string): Promise<string> {
		const absolutePath = this.resolveWorkspacePath(filePath);
		const content = await fs.promises.readFile(absolutePath, 'utf-8');
		return content;
	}

	/**
	 * Write file content
	 */
	async writeFile(filePath: string, content: string): Promise<void> {
		const absolutePath = this.resolveWorkspacePath(filePath);
		const dir = path.dirname(absolutePath);

		// Ensure directory exists
		if (!fs.existsSync(dir)) {
			await fs.promises.mkdir(dir, { recursive: true });
		}

		await fs.promises.writeFile(absolutePath, content, 'utf-8');
	}

	/**
	 * List directory contents
	 */
	async listDirectory(dirPath: string): Promise<string[]> {
		const absolutePath = this.resolveWorkspacePath(dirPath);
		const entries = await fs.promises.readdir(absolutePath);
		return entries;
	}

	/**
	 * Check if file/directory exists
	 */
	async exists(filePath: string): Promise<boolean> {
		const absolutePath = this.resolveWorkspacePath(filePath);
		return fs.existsSync(absolutePath);
	}

	/**
	 * Delete file or directory
	 */
	async delete(filePath: string): Promise<void> {
		const absolutePath = this.resolveWorkspacePath(filePath);
		const stat = await fs.promises.stat(absolutePath);

		if (stat.isDirectory()) {
			await fs.promises.rm(absolutePath, { recursive: true });
		} else {
			await fs.promises.unlink(absolutePath);
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
			methods: ['readFile', 'writeFile', 'listDirectory', 'exists', 'delete'],
		};
	}

	/**
	 * Resolve workspace-relative path to absolute path
	 */
	private resolveWorkspacePath(filePath: string): string {
		if (path.isAbsolute(filePath)) {
			return filePath;
		}

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			throw new Error('No workspace folder open');
		}

		return path.join(workspaceFolder.uri.fsPath, filePath);
	}
}
