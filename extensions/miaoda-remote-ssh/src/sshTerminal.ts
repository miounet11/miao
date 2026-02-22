import * as vscode from 'vscode';
import { SSHConnection } from './sshConnection';
import { ClientChannel } from 'ssh2';

export class SSHTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;

  private closeEmitter = new vscode.EventEmitter<number>();
  onDidClose: vscode.Event<number> = this.closeEmitter.event;

  private connection: SSHConnection;
  private shell?: ClientChannel;
  private dimensions?: vscode.TerminalDimensions;

  constructor(connection: SSHConnection) {
    this.connection = connection;
  }

  async open(initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
    this.dimensions = initialDimensions;

    return new Promise((resolve, reject) => {
      if (!this.connection.isConnected()) {
        reject(new Error('SSH connection is not established'));
        return;
      }

      this.connection.getClient().shell(
        {
          cols: initialDimensions?.columns || 80,
          rows: initialDimensions?.rows || 24,
          term: 'xterm-256color',
        },
        (err, stream) => {
          if (err) {
            this.writeEmitter.fire(`\r\n\x1b[31mError: ${err.message}\x1b[0m\r\n`);
            reject(err);
            return;
          }

          this.shell = stream;

          stream.on('data', (data: Buffer) => {
            this.writeEmitter.fire(data.toString());
          });

          stream.on('close', () => {
            this.writeEmitter.fire('\r\n\x1b[33mConnection closed\x1b[0m\r\n');
            this.closeEmitter.fire(0);
          });

          stream.on('error', (err: Error) => {
            this.writeEmitter.fire(`\r\n\x1b[31mStream error: ${err.message}\x1b[0m\r\n`);
            this.closeEmitter.fire(1);
          });

          stream.stderr.on('data', (data: Buffer) => {
            this.writeEmitter.fire(data.toString());
          });

          resolve();
        }
      );
    });
  }

  close(): void {
    if (this.shell) {
      this.shell.end();
      this.shell = undefined;
    }
  }

  handleInput(data: string): void {
    if (this.shell) {
      this.shell.write(data);
    }
  }

  setDimensions(dimensions: vscode.TerminalDimensions): void {
    this.dimensions = dimensions;
    if (this.shell) {
      this.shell.setWindow(dimensions.rows, dimensions.columns, 0, 0);
    }
  }
}
