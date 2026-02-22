import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Skill, SkillExecutionContext, SkillResult } from '../ISkillsManager';

const execAsync = promisify(exec);

/**
 * Git Operation Skill
 * Provides Git operations (commit, push, branch, status)
 */
export class GitOperationSkill implements Skill {
  id = 'builtin.git-operation';
  name = 'Git Operation';
  description = 'Perform Git operations (commit, push, branch, status, log)';
  category = 'git' as const;
  version = '1.0.0';
  author = 'Miaoda';
  tags = ['git', 'vcs', 'version-control'];
  timeout = 30000;

  parameters = [
    {
      name: 'operation',
      type: 'string' as const,
      description: 'Operation: status, commit, push, pull, branch, log, diff',
      required: true,
    },
    {
      name: 'message',
      type: 'string' as const,
      description: 'Commit message (for commit operation)',
      required: false,
    },
    {
      name: 'branch',
      type: 'string' as const,
      description: 'Branch name (for branch operations)',
      required: false,
    },
    {
      name: 'files',
      type: 'array' as const,
      description: 'Files to stage (for commit operation)',
      required: false,
    },
    {
      name: 'options',
      type: 'object' as const,
      description: 'Additional options for the operation',
      required: false,
    },
  ];

  async execute(params: any, context: SkillExecutionContext): Promise<SkillResult> {
    const { operation, message, branch, files, options = {} } = params;

    try {
      const cwd = this.getWorkingDirectory(context);

      switch (operation) {
        case 'status':
          return await this.gitStatus(cwd);

        case 'commit':
          if (!message) {
            return this.errorResult('MISSING_MESSAGE', 'Commit message is required');
          }
          return await this.gitCommit(cwd, message, files);

        case 'push':
          return await this.gitPush(cwd, options);

        case 'pull':
          return await this.gitPull(cwd, options);

        case 'branch':
          return await this.gitBranch(cwd, branch, options);

        case 'log':
          return await this.gitLog(cwd, options);

        case 'diff':
          return await this.gitDiff(cwd, options);

        default:
          return this.errorResult(
            'INVALID_OPERATION',
            `Invalid operation: ${operation}. Supported: status, commit, push, pull, branch, log, diff`
          );
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GIT_OPERATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  private getWorkingDirectory(context: SkillExecutionContext): string {
    if (context.workspaceFolder) {
      return context.workspaceFolder.uri.fsPath;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      return workspaceFolders[0].uri.fsPath;
    }

    throw new Error('No workspace folder available');
  }

  private async gitStatus(cwd: string): Promise<SkillResult> {
    const { stdout } = await execAsync('git status --porcelain', { cwd });
    const lines = stdout.trim().split('\n').filter(line => line);

    const files = lines.map(line => {
      const status = line.substring(0, 2);
      const path = line.substring(3);
      return { status, path };
    });

    return {
      success: true,
      data: {
        files,
        clean: files.length === 0,
        modified: files.filter(f => f.status.includes('M')).length,
        added: files.filter(f => f.status.includes('A')).length,
        deleted: files.filter(f => f.status.includes('D')).length,
        untracked: files.filter(f => f.status.includes('??')).length,
      },
    };
  }

  private async gitCommit(cwd: string, message: string, files?: string[]): Promise<SkillResult> {
    // Stage files if provided
    if (files && files.length > 0) {
      const fileArgs = files.map(f => `"${f}"`).join(' ');
      await execAsync(`git add ${fileArgs}`, { cwd });
    } else {
      // Stage all changes
      await execAsync('git add -A', { cwd });
    }

    // Commit
    const escapedMessage = message.replace(/"/g, '\\"');
    const { stdout } = await execAsync(`git commit -m "${escapedMessage}"`, { cwd });

    return {
      success: true,
      data: {
        message,
        output: stdout.trim(),
      },
    };
  }

  private async gitPush(cwd: string, options: any): Promise<SkillResult> {
    const remote = options.remote || 'origin';
    const branch = options.branch || '';
    const force = options.force ? '--force' : '';

    const command = `git push ${remote} ${branch} ${force}`.trim();
    const { stdout, stderr } = await execAsync(command, { cwd });

    return {
      success: true,
      data: {
        output: stdout.trim() || stderr.trim(),
      },
    };
  }

  private async gitPull(cwd: string, options: any): Promise<SkillResult> {
    const remote = options.remote || 'origin';
    const branch = options.branch || '';

    const command = `git pull ${remote} ${branch}`.trim();
    const { stdout, stderr } = await execAsync(command, { cwd });

    return {
      success: true,
      data: {
        output: stdout.trim() || stderr.trim(),
      },
    };
  }

  private async gitBranch(cwd: string, branch?: string, options: any = {}): Promise<SkillResult> {
    if (!branch) {
      // List branches
      const { stdout } = await execAsync('git branch -a', { cwd });
      const branches = stdout
        .trim()
        .split('\n')
        .map(line => ({
          name: line.replace(/^[\s*]+/, ''),
          current: line.startsWith('*'),
        }));

      return {
        success: true,
        data: { branches },
      };
    }

    // Create or switch branch
    if (options.create) {
      await execAsync(`git checkout -b ${branch}`, { cwd });
      return {
        success: true,
        data: {
          branch,
          created: true,
        },
      };
    } else {
      await execAsync(`git checkout ${branch}`, { cwd });
      return {
        success: true,
        data: {
          branch,
          switched: true,
        },
      };
    }
  }

  private async gitLog(cwd: string, options: any): Promise<SkillResult> {
    const limit = options.limit || 10;
    const format = options.format || '%H|%an|%ae|%ad|%s';

    const { stdout } = await execAsync(`git log -${limit} --pretty=format:"${format}"`, { cwd });
    const lines = stdout.trim().split('\n');

    const commits = lines.map(line => {
      const [hash, author, email, date, message] = line.split('|');
      return { hash, author, email, date, message };
    });

    return {
      success: true,
      data: {
        commits,
        count: commits.length,
      },
    };
  }

  private async gitDiff(cwd: string, options: any): Promise<SkillResult> {
    const staged = options.staged ? '--staged' : '';
    const file = options.file ? `-- ${options.file}` : '';

    const command = `git diff ${staged} ${file}`.trim();
    const { stdout } = await execAsync(command, { cwd });

    return {
      success: true,
      data: {
        diff: stdout,
        hasChanges: stdout.length > 0,
      },
    };
  }

  private errorResult(code: string, message: string): SkillResult {
    return {
      success: false,
      error: { code, message },
    };
  }
}
