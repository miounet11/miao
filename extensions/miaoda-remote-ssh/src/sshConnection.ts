import { Client, ConnectConfig } from 'ssh2';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
  passphrase?: string;
  keepaliveInterval?: number;
  readyTimeout?: number;
}

export class SSHConnection {
  private client: Client;
  private config: SSHConfig;
  private connected: boolean = false;
  private keepaliveTimer?: NodeJS.Timeout;

  constructor(config: SSHConfig) {
    this.client = new Client();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectConfig: ConnectConfig = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        readyTimeout: this.config.readyTimeout || 30000,
      };

      // Add authentication method
      if (this.config.password) {
        connectConfig.password = this.config.password;
      } else if (this.config.privateKey) {
        connectConfig.privateKey = this.config.privateKey;
        if (this.config.passphrase) {
          connectConfig.passphrase = this.config.passphrase;
        }
      }

      this.client
        .on('ready', () => {
          this.connected = true;
          this.startKeepalive();
          vscode.window.showInformationMessage(
            `Connected to ${this.config.username}@${this.config.host}`
          );
          resolve();
        })
        .on('error', (err) => {
          this.connected = false;
          vscode.window.showErrorMessage(
            `SSH connection failed: ${err.message}`
          );
          reject(err);
        })
        .on('close', () => {
          this.connected = false;
          this.stopKeepalive();
          vscode.window.showInformationMessage(
            `Disconnected from ${this.config.host}`
          );
        })
        .connect(connectConfig);
    });
  }

  private startKeepalive(): void {
    const interval = this.config.keepaliveInterval || 30000;
    this.keepaliveTimer = setInterval(() => {
      if (this.connected) {
        this.client.exec('echo keepalive', (err) => {
          if (err) {
            console.error('Keepalive failed:', err);
          }
        });
      }
    }, interval);
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = undefined;
    }
  }

  async executeCommand(command: string): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to SSH host');
    }

    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        let errorOutput = '';

        stream
          .on('data', (data: Buffer) => {
            output += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            errorOutput += data.toString();
          });

        stream.on('close', (code: number) => {
          if (code !== 0 && errorOutput) {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
          } else {
            resolve(output);
          }
        });

        stream.on('error', reject);
      });
    });
  }

  disconnect(): void {
    if (this.connected) {
      this.stopKeepalive();
      this.client.end();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): Client {
    return this.client;
  }

  getConfig(): SSHConfig {
    return this.config;
  }

  static async loadPrivateKey(keyPath: string, passphrase?: string): Promise<Buffer> {
    const expandedPath = keyPath.replace('~', os.homedir());

    if (!fs.existsSync(expandedPath)) {
      throw new Error(`Private key not found: ${expandedPath}`);
    }

    return fs.readFileSync(expandedPath);
  }
}
