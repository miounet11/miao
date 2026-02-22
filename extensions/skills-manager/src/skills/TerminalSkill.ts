import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Skill, SkillExecutionContext, SkillResult } from '../ISkillsManager';

const execAsync = promisify(exec);

/**
 * Terminal Skill
 * Provides terminal command execution capabilities
 */
export class TerminalSkill implements Skill {
  id = 'builtin.terminal';
  name = 'Terminal';
  description = 'Execute terminal commands and scripts';
  category = 'terminal' as const;
  version = '1.0.0';
  author = 'Miaoda';
  tags = ['terminal', 'shell', 'command', 'exec'];
  timeout = 60000; // 60 seconds for long-running commands

  parameters = [
    {
      name: 'command',
      type: 'string' as const,
      description: 'Command to execute',
      required: true,
    },
    {
      name: 'cwd',
      type: 'string' as const,
      description: 'Working directory (defaults to workspace root)',
      required: false,
    },
    {
      name: 'env',
      type: 'object' as const,
      description: 'Environment variables',
      required: false,
    },
    {
      name: 'shell',
      type: 'string' as const,
      description: 'Shell to use (bash, zsh, sh, etc.)',
      required: false,
    },
    {
      name: 'timeout',
      type: 'number' as const,
      description: 'Command timeout in milliseconds',
      required: false,
    },
  ];

  async execute(params: any, context: SkillExecutionContext): Promise<SkillResult> {
    const { command, cwd, env, shell, timeout } = params;

    try {
      // Determine working directory
      const workingDir = cwd || this.getWorkingDirectory(context);

      // Prepare execution options
      const execOptions: any = {
        cwd: workingDir,
        env: { ...process.env, ...env },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      };

      if (shell) {
        execOptions.shell = shell;
      }

      if (timeout) {
        execOptions.timeout = timeout;
      }

      // Log to output channel
      if (context.outputChannel) {
        context.outputChannel.appendLine(`Executing: ${command}`);
        context.outputChannel.appendLine(`Working directory: ${workingDir}`);
      }

      // Execute command
      const startTime = Date.now();
      const { stdout, stderr } = await execAsync(command, execOptions);
      const duration = Date.now() - startTime;

      const stdoutStr = stdout?.toString() || '';
      const stderrStr = stderr?.toString() || '';

      // Log output
      if (context.outputChannel) {
        if (stdoutStr) {
          context.outputChannel.appendLine('STDOUT:');
          context.outputChannel.appendLine(stdoutStr);
        }
        if (stderrStr) {
          context.outputChannel.appendLine('STDERR:');
          context.outputChannel.appendLine(stderrStr);
        }
        context.outputChannel.appendLine(`Completed in ${duration}ms`);
      }

      return {
        success: true,
        data: {
          command,
          stdout: stdoutStr.trim(),
          stderr: stderrStr.trim(),
          exitCode: 0,
          duration,
        },
      };
    } catch (error: any) {
      // Handle execution errors
      const exitCode = error.code || -1;
      const stdout = error.stdout?.toString()?.trim() || '';
      const stderr = error.stderr?.toString()?.trim() || '';

      if (context.outputChannel) {
        context.outputChannel.appendLine(`Command failed with exit code ${exitCode}`);
        if (stdout) {
          context.outputChannel.appendLine('STDOUT:');
          context.outputChannel.appendLine(stdout);
        }
        if (stderr) {
          context.outputChannel.appendLine('STDERR:');
          context.outputChannel.appendLine(stderr);
        }
      }

      return {
        success: false,
        error: {
          code: 'COMMAND_EXECUTION_ERROR',
          message: error.message || 'Command execution failed',
          stack: error.stack,
        },
        data: {
          command,
          stdout,
          stderr,
          exitCode,
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

    // Fallback to home directory
    return process.env.HOME || process.env.USERPROFILE || '/';
  }
}
