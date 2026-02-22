import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Skill, SkillExecutionContext, SkillResult } from '../ISkillsManager';

/**
 * File Operation Skill
 * Provides file system operations (read, write, delete)
 */
export class FileOperationSkill implements Skill {
  id = 'builtin.file-operation';
  name = 'File Operation';
  description = 'Perform file system operations (read, write, delete files)';
  category = 'file' as const;
  version = '1.0.0';
  author = 'Miaoda';
  tags = ['file', 'io', 'filesystem'];
  timeout = 10000;

  parameters = [
    {
      name: 'operation',
      type: 'string' as const,
      description: 'Operation to perform: read, write, delete, exists, list',
      required: true,
    },
    {
      name: 'path',
      type: 'string' as const,
      description: 'File or directory path',
      required: true,
    },
    {
      name: 'content',
      type: 'string' as const,
      description: 'Content to write (for write operation)',
      required: false,
    },
    {
      name: 'encoding',
      type: 'string' as const,
      description: 'File encoding (default: utf8)',
      required: false,
      default: 'utf8',
    },
  ];

  async execute(params: any, context: SkillExecutionContext): Promise<SkillResult> {
    const { operation, path: filePath, content, encoding = 'utf8' } = params;

    try {
      // Resolve path relative to workspace
      const resolvedPath = this.resolvePath(filePath, context);

      switch (operation) {
        case 'read':
          return await this.readFile(resolvedPath, encoding);

        case 'write':
          return await this.writeFile(resolvedPath, content, encoding);

        case 'delete':
          return await this.deleteFile(resolvedPath);

        case 'exists':
          return await this.fileExists(resolvedPath);

        case 'list':
          return await this.listDirectory(resolvedPath);

        default:
          return {
            success: false,
            error: {
              code: 'INVALID_OPERATION',
              message: `Invalid operation: ${operation}. Supported: read, write, delete, exists, list`,
            },
          };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_OPERATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  private resolvePath(filePath: string, context: SkillExecutionContext): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    if (context.workspaceFolder) {
      return path.join(context.workspaceFolder.uri.fsPath, filePath);
    }

    throw new Error('Relative path provided but no workspace folder available');
  }

  private async readFile(filePath: string, encoding: string): Promise<SkillResult> {
    const content = await fs.readFile(filePath, encoding as BufferEncoding);
    return {
      success: true,
      data: {
        content,
        path: filePath,
        size: content.length,
      },
    };
  }

  private async writeFile(filePath: string, content: string, encoding: string): Promise<SkillResult> {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(filePath, content, encoding as BufferEncoding);
    return {
      success: true,
      data: {
        path: filePath,
        bytesWritten: content.length,
      },
    };
  }

  private async deleteFile(filePath: string): Promise<SkillResult> {
    await fs.unlink(filePath);
    return {
      success: true,
      data: {
        path: filePath,
        deleted: true,
      },
    };
  }

  private async fileExists(filePath: string): Promise<SkillResult> {
    try {
      await fs.access(filePath);
      return {
        success: true,
        data: {
          path: filePath,
          exists: true,
        },
      };
    } catch {
      return {
        success: true,
        data: {
          path: filePath,
          exists: false,
        },
      };
    }
  }

  private async listDirectory(dirPath: string): Promise<SkillResult> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }));

    return {
      success: true,
      data: {
        path: dirPath,
        entries: files,
        count: files.length,
      },
    };
  }
}
