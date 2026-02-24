import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git capability for version control operations
 */
export class GitCapability {
	private readonly name = 'git';
	private readonly description = 'Perform Git operations';

	/**
	 * Execute git command
	 */
	private async executeGit(command: string): Promise<string> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			throw new Error('No workspace folder open');
		}

		const { stdout, stderr } = await execAsync(command, {
			cwd: workspaceFolder.uri.fsPath,
		});

		if (stderr && !stderr.includes('warning')) {
			throw new Error(stderr);
		}

		return stdout.trim();
	}

	/**
	 * Get git status
	 */
	async getStatus(): Promise<string> {
		return this.executeGit('git status --short');
	}

	/**
	 * Stage files
	 */
	async stageFiles(files: string[]): Promise<void> {
		const fileList = files.join(' ');
		await this.executeGit(`git add ${fileList}`);
	}

	/**
	 * Commit changes
	 */
	async commit(message: string): Promise<string> {
		return this.executeGit(`git commit -m "${message}"`);
	}

	/**
	 * Push to remote
	 */
	async push(remote: string = 'origin', branch?: string): Promise<string> {
		const branchArg = branch ? ` ${branch}` : '';
		return this.executeGit(`git push ${remote}${branchArg}`);
	}

	/**
	 * Pull from remote
	 */
	async pull(remote: string = 'origin', branch?: string): Promise<string> {
		const branchArg = branch ? ` ${branch}` : '';
		return this.executeGit(`git pull ${remote}${branchArg}`);
	}

	/**
	 * Create branch
	 */
	async createBranch(branchName: string): Promise<string> {
		return this.executeGit(`git checkout -b ${branchName}`);
	}

	/**
	 * Switch branch
	 */
	async switchBranch(branchName: string): Promise<string> {
		return this.executeGit(`git checkout ${branchName}`);
	}

	/**
	 * Get current branch
	 */
	async getCurrentBranch(): Promise<string> {
		return this.executeGit('git branch --show-current');
	}

	/**
	 * Get git log
	 */
	async getLog(limit: number = 10): Promise<string> {
		return this.executeGit(`git log --oneline -n ${limit}`);
	}

	/**
	 * Get diff
	 */
	async getDiff(staged: boolean = false): Promise<string> {
		const stagedFlag = staged ? '--staged' : '';
		return this.executeGit(`git diff ${stagedFlag}`);
	}

	/**
	 * Get capability metadata
	 */
	getMetadata() {
		return {
			name: this.name,
			description: this.description,
			available: true,
			methods: ['getStatus', 'stageFiles', 'commit', 'push', 'pull', 'createBranch', 'switchBranch', 'getCurrentBranch', 'getLog', 'getDiff'],
		};
	}
}
