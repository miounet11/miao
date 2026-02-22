import * as vscode from 'vscode';
import SftpClient from 'ssh2-sftp-client';
import { SSHConnection } from './sshConnection';
import { Client } from 'ssh2';

export class SSHFileSystemProvider implements vscode.FileSystemProvider {
  private sftp: SftpClient;
  private connection: SSHConnection;
  private initialized: boolean = false;

  constructor(connection: SSHConnection) {
    this.connection = connection;
    this.sftp = new SftpClient();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.sftp.connect({
        sock: this.connection.getClient() as any,
      });
      this.initialized = true;
    } catch (err) {
      throw new Error(`Failed to initialize SFTP: ${err}`);
    }
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    await this.ensureInitialized();
    try {
      const content = await this.sftp.get(uri.path);
      if (Buffer.isBuffer(content)) {
        return new Uint8Array(content);
      }
      throw new Error('Unexpected response type from SFTP');
    } catch (err) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      const exists = await this.sftp.exists(uri.path);

      if (exists && !options.overwrite) {
        throw vscode.FileSystemError.FileExists(uri);
      }

      if (!exists && !options.create) {
        throw vscode.FileSystemError.FileNotFound(uri);
      }

      await this.sftp.put(Buffer.from(content), uri.path);
      this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
    } catch (err) {
      throw vscode.FileSystemError.Unavailable(`Failed to write file: ${err}`);
    }
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    await this.ensureInitialized();

    try {
      const list = await this.sftp.list(uri.path);
      return list.map((item) => {
        const type = item.type === 'd' ? vscode.FileType.Directory :
                     item.type === 'l' ? vscode.FileType.SymbolicLink :
                     vscode.FileType.File;
        return [item.name, type];
      });
    } catch (err) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.sftp.mkdir(uri.path, true);
      this._emitter.fire([{ type: vscode.FileChangeType.Created, uri }]);
    } catch (err) {
      throw vscode.FileSystemError.Unavailable(`Failed to create directory: ${err}`);
    }
  }

  async delete(uri: vscode.Uri, options: { recursive: boolean }): Promise<void> {
    await this.ensureInitialized();

    try {
      const stat = await this.sftp.stat(uri.path);

      if (stat.isDirectory) {
        await this.sftp.rmdir(uri.path, options.recursive);
      } else {
        await this.sftp.delete(uri.path);
      }

      this._emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
    } catch (err) {
      throw vscode.FileSystemError.Unavailable(`Failed to delete: ${err}`);
    }
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      const exists = await this.sftp.exists(newUri.path);

      if (exists && !options.overwrite) {
        throw vscode.FileSystemError.FileExists(newUri);
      }

      await this.sftp.rename(oldUri.path, newUri.path);
      this._emitter.fire([
        { type: vscode.FileChangeType.Deleted, uri: oldUri },
        { type: vscode.FileChangeType.Created, uri: newUri },
      ]);
    } catch (err) {
      throw vscode.FileSystemError.Unavailable(`Failed to rename: ${err}`);
    }
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    await this.ensureInitialized();

    try {
      const stat = await this.sftp.stat(uri.path);
      return {
        type: stat.isDirectory ? vscode.FileType.Directory :
              stat.isSymbolicLink ? vscode.FileType.SymbolicLink :
              vscode.FileType.File,
        ctime: stat.accessTime || 0,
        mtime: stat.modifyTime || 0,
        size: stat.size || 0,
      };
    } catch (err) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async dispose(): Promise<void> {
    if (this.initialized) {
      await this.sftp.end();
      this.initialized = false;
    }
  }

  // Event emitters
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> =
    this._emitter.event;

  watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
    // File watching is not implemented for remote SSH
    // Return a dummy disposable
    return new vscode.Disposable(() => {});
  }
}
