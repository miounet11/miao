import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SSHHost {
  name: string;
  host: string;
  port: number;
  user: string;
  identityFile?: string;
  proxyJump?: string;
  forwardAgent?: boolean;
}

export class SSHConfigManager {
  private configPath: string;

  constructor() {
    const config = vscode.workspace.getConfiguration('miaoda.remote.ssh');
    this.configPath = config.get('configFile') || '~/.ssh/config';
    this.configPath = this.expandPath(this.configPath);
  }

  private expandPath(filePath: string): string {
    return filePath.replace(/^~/, os.homedir());
  }

  async getHosts(): Promise<SSHHost[]> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return [];
      }

      const content = fs.readFileSync(this.configPath, 'utf-8');
      return this.parseSSHConfig(content);
    } catch (err) {
      console.error('Failed to read SSH config:', err);
      return [];
    }
  }

  private parseSSHConfig(content: string): SSHHost[] {
    const hosts: SSHHost[] = [];
    const lines = content.split('\n');
    let currentHost: Partial<SSHHost> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      if (trimmed.toLowerCase().startsWith('host ')) {
        // Save previous host
        if (currentHost && currentHost.name && currentHost.host) {
          hosts.push(this.normalizeHost(currentHost));
        }

        // Start new host
        const hostName = trimmed.substring(5).trim();
        // Skip wildcard hosts
        if (hostName.includes('*') || hostName.includes('?')) {
          currentHost = null;
          continue;
        }

        currentHost = {
          name: hostName,
          port: 22,
        };
      } else if (currentHost) {
        const [key, ...valueParts] = trimmed.split(/\s+/);
        const value = valueParts.join(' ');
        const lowerKey = key.toLowerCase();

        if (lowerKey === 'hostname') {
          currentHost.host = value;
        } else if (lowerKey === 'port') {
          currentHost.port = parseInt(value) || 22;
        } else if (lowerKey === 'user') {
          currentHost.user = value;
        } else if (lowerKey === 'identityfile') {
          currentHost.identityFile = this.expandPath(value);
        } else if (lowerKey === 'proxyjump') {
          currentHost.proxyJump = value;
        } else if (lowerKey === 'forwardagent') {
          currentHost.forwardAgent = value.toLowerCase() === 'yes';
        }
      }
    }

    // Save last host
    if (currentHost && currentHost.name && currentHost.host) {
      hosts.push(this.normalizeHost(currentHost));
    }

    return hosts;
  }

  private normalizeHost(host: Partial<SSHHost>): SSHHost {
    return {
      name: host.name!,
      host: host.host!,
      port: host.port || 22,
      user: host.user || os.userInfo().username,
      identityFile: host.identityFile,
      proxyJump: host.proxyJump,
      forwardAgent: host.forwardAgent,
    };
  }

  async addHost(host: SSHHost): Promise<void> {
    try {
      // Ensure SSH directory exists
      const sshDir = path.dirname(this.configPath);
      if (!fs.existsSync(sshDir)) {
        fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });
      }

      // Build config entry
      const config = [
        `\nHost ${host.name}`,
        `  HostName ${host.host}`,
        `  Port ${host.port}`,
        `  User ${host.user}`,
      ];

      if (host.identityFile) {
        config.push(`  IdentityFile ${host.identityFile}`);
      }

      if (host.proxyJump) {
        config.push(`  ProxyJump ${host.proxyJump}`);
      }

      if (host.forwardAgent) {
        config.push(`  ForwardAgent yes`);
      }

      const content = config.join('\n') + '\n';

      // Append to config file
      fs.appendFileSync(this.configPath, content, { mode: 0o600 });
    } catch (err) {
      throw new Error(`Failed to add SSH host: ${err}`);
    }
  }

  async removeHost(hostName: string): Promise<void> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return;
      }

      const content = fs.readFileSync(this.configPath, 'utf-8');
      const lines = content.split('\n');
      const newLines: string[] = [];
      let skipUntilNextHost = false;

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.toLowerCase().startsWith('host ')) {
          const name = trimmed.substring(5).trim();
          if (name === hostName) {
            skipUntilNextHost = true;
            continue;
          } else {
            skipUntilNextHost = false;
          }
        }

        if (!skipUntilNextHost) {
          newLines.push(line);
        }
      }

      fs.writeFileSync(this.configPath, newLines.join('\n'), { mode: 0o600 });
    } catch (err) {
      throw new Error(`Failed to remove SSH host: ${err}`);
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }
}
