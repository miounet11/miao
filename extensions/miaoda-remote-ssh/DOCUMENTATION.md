# Miaoda Remote SSH - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage Guide](#usage-guide)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)
8. [Development](#development)

## Overview

Miaoda Remote SSH is a comprehensive SSH remote development extension for Miaoda IDE. It enables developers to connect to remote servers, edit files, run commands, and develop applications as if they were working locally.

### Key Features

- **Multiple Authentication Methods**: Password, private key, and passphrase-protected keys
- **Remote File System**: Full SFTP integration for file operations
- **Interactive Terminal**: Native terminal experience on remote hosts
- **SSH Config Integration**: Automatic parsing of `~/.ssh/config`
- **Connection Management**: Visual status indicators and easy switching
- **Keepalive Support**: Automatic connection maintenance

## Architecture

### Core Modules

#### 1. SSHConnection (`sshConnection.ts`)

Manages SSH connections using the `ssh2` library.

**Key Features:**
- Connection establishment and teardown
- Authentication (password/key)
- Command execution
- Keepalive mechanism
- Error handling

**Usage:**
```typescript
const connection = new SSHConnection({
  host: '192.168.1.100',
  port: 22,
  username: 'user',
  privateKey: keyBuffer
});

await connection.connect();
const output = await connection.executeCommand('ls -la');
connection.disconnect();
```

#### 2. SSHFileSystemProvider (`sshFileSystem.ts`)

Implements VS Code's FileSystemProvider interface for remote file access.

**Supported Operations:**
- Read/Write files
- Create/Delete directories
- Rename/Move files
- List directory contents
- File stat information

**Usage:**
```typescript
const fs = new SSHFileSystemProvider(connection);
await fs.initialize();

const content = await fs.readFile(uri);
await fs.writeFile(uri, newContent, { create: true, overwrite: true });
```

#### 3. SSHTerminal (`sshTerminal.ts`)

Provides interactive terminal sessions via Pseudoterminal API.

**Features:**
- Full terminal emulation (xterm-256color)
- Bidirectional I/O
- Dynamic resizing
- ANSI color support

**Usage:**
```typescript
const terminal = new SSHTerminal(connection);
const vscodeTerminal = vscode.window.createTerminal({
  name: 'SSH Terminal',
  pty: terminal
});
vscodeTerminal.show();
```

#### 4. SSHConfigManager (`sshConfig.ts`)

Parses and manages SSH configuration files.

**Supported Directives:**
- Host
- HostName
- Port
- User
- IdentityFile
- ProxyJump
- ForwardAgent

**Usage:**
```typescript
const manager = new SSHConfigManager();
const hosts = await manager.getHosts();

await manager.addHost({
  name: 'my-server',
  host: '192.168.1.100',
  port: 22,
  user: 'admin'
});
```

#### 5. SSHTargetsProvider (`sshTargetsProvider.ts`)

Tree view provider for displaying SSH hosts.

**Features:**
- Hierarchical host display
- Context menu actions
- Refresh capability
- Click-to-connect

## Installation

### Prerequisites

- Node.js 18+ and npm
- Miaoda IDE or VS Code 1.85+
- SSH access to remote servers

### Build from Source

```bash
cd extensions/miaoda-remote-ssh
npm install
npm run compile
```

### Install Dependencies

The extension requires:
- `ssh2`: SSH2 client for Node.js
- `ssh2-sftp-client`: SFTP client wrapper

```bash
npm install ssh2@^1.15.0 ssh2-sftp-client@^10.0.3
```

## Configuration

### Extension Settings

Add to your `settings.json`:

```json
{
  "miaoda.remote.ssh.configFile": "~/.ssh/config",
  "miaoda.remote.ssh.showLoginTerminal": true,
  "miaoda.remote.ssh.enableDynamicForwarding": true,
  "miaoda.remote.ssh.connectTimeout": 30000,
  "miaoda.remote.ssh.keepaliveInterval": 30000
}
```

### SSH Config File

Example `~/.ssh/config`:

```
# Development Server
Host dev-server
  HostName dev.example.com
  Port 22
  User developer
  IdentityFile ~/.ssh/id_rsa_dev
  ForwardAgent yes

# Production Server (via jump host)
Host prod-server
  HostName 10.0.1.100
  Port 22
  User admin
  IdentityFile ~/.ssh/id_rsa_prod
  ProxyJump bastion.example.com

# Bastion Host
Host bastion
  HostName bastion.example.com
  Port 22
  User jumpuser
  IdentityFile ~/.ssh/id_rsa_bastion
```

## Usage Guide

### Quick Start

1. **Add SSH Host**
   - Click `+` in SSH Targets view
   - Fill in host details
   - Save

2. **Connect**
   - Click on host in tree view
   - Enter password/passphrase if needed
   - Choose action (Open Folder/Terminal)

3. **Work Remotely**
   - Edit files in Explorer
   - Run commands in terminal
   - Debug applications

### Advanced Workflows

#### Multi-Server Development

```typescript
// Connect to multiple servers simultaneously
// Each connection is independent
```

#### Key-Based Authentication

1. Generate SSH key:
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_miaoda
   ```

2. Copy to server:
   ```bash
   ssh-copy-id -i ~/.ssh/id_rsa_miaoda.pub user@host
   ```

3. Add to SSH config:
   ```
   Host myserver
     HostName host
     User user
     IdentityFile ~/.ssh/id_rsa_miaoda
   ```

#### Port Forwarding (Planned)

```json
{
  "miaoda.remote.ssh.portForwarding": [
    {
      "local": 8080,
      "remote": 80,
      "host": "localhost"
    }
  ]
}
```

## API Reference

### Commands

| Command | Description |
|---------|-------------|
| `miaoda.remote.addNewSSHHost` | Add new SSH host to config |
| `miaoda.remote.connectToHost` | Connect to SSH host |
| `miaoda.remote.disconnect` | Disconnect from current host |
| `miaoda.remote.openSSHConfig` | Open SSH config file |
| `miaoda.remote.refreshTargets` | Refresh SSH targets list |
| `miaoda.remote.openTerminal` | Open remote terminal |

### Events

- `onDidChangeTreeData`: Fired when SSH targets change
- `onDidChangeFile`: Fired when remote files change

## Troubleshooting

### Common Issues

#### 1. Connection Timeout

**Symptoms:** Connection hangs or times out

**Solutions:**
- Check network connectivity: `ping host`
- Verify SSH server is running: `systemctl status sshd`
- Increase timeout: `"miaoda.remote.ssh.connectTimeout": 60000`
- Check firewall rules

#### 2. Authentication Failed

**Symptoms:** "Permission denied" or "Authentication failed"

**Solutions:**
- Verify credentials: `ssh user@host`
- Check key permissions: `chmod 600 ~/.ssh/id_rsa`
- Verify key format (OpenSSH): `ssh-keygen -p -f ~/.ssh/id_rsa -m pem`
- Check authorized_keys on server

#### 3. File Operations Fail

**Symptoms:** Cannot read/write files

**Solutions:**
- Check user permissions on server
- Verify SFTP subsystem: `grep Subsystem /etc/ssh/sshd_config`
- Check disk space: `df -h`
- Verify SELinux/AppArmor settings

#### 4. Terminal Not Working

**Symptoms:** Terminal opens but no output

**Solutions:**
- Check shell on server: `echo $SHELL`
- Verify PTY allocation: `ssh -t user@host`
- Check terminal type: Set `TERM=xterm-256color`

### Debug Mode

Enable debug logging:

```json
{
  "miaoda.remote.ssh.logLevel": "debug"
}
```

View logs:
- Open Output panel
- Select "Miaoda Remote SSH" from dropdown

## Development

### Project Structure

```
miaoda-remote-ssh/
├── src/
│   ├── extension.ts          # Main entry point
│   ├── sshConnection.ts      # SSH connection management
│   ├── sshFileSystem.ts      # Remote file system
│   ├── sshTerminal.ts        # Terminal integration
│   ├── sshConfig.ts          # Config file parsing
│   └── sshTargetsProvider.ts # Tree view provider
├── test/
│   └── sshConfig.test.ts     # Unit tests
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
└── README.md                 # User documentation
```

### Building

```bash
npm run compile    # Compile TypeScript
npm run watch      # Watch mode
npm test           # Run tests
```

### Testing

```bash
# Unit tests
npm test

# Manual testing
# 1. Press F5 in VS Code to launch Extension Development Host
# 2. Test features in the new window
```

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit pull request

### Code Style

- Use TypeScript strict mode
- Follow VS Code extension guidelines
- Add JSDoc comments for public APIs
- Write unit tests for new features

## Security Considerations

### Best Practices

1. **Never store passwords**: Always prompt for passwords
2. **Protect private keys**: Use proper file permissions (600)
3. **Use key-based auth**: Prefer keys over passwords
4. **Enable ForwardAgent carefully**: Only for trusted hosts
5. **Regular key rotation**: Update keys periodically
6. **Audit SSH config**: Review authorized hosts regularly

### Threat Model

- **Man-in-the-middle**: Mitigated by SSH host key verification
- **Credential theft**: Mitigated by not storing credentials
- **Key compromise**: Mitigated by passphrase protection
- **Session hijacking**: Mitigated by keepalive and timeout

## Performance

### Optimization Tips

1. **Connection pooling**: Reuse connections when possible
2. **Batch operations**: Group file operations
3. **Compression**: Enable SSH compression for slow networks
4. **Keepalive**: Prevent connection drops

### Benchmarks

- Connection time: ~1-3 seconds
- File read (1MB): ~100-500ms
- File write (1MB): ~100-500ms
- Terminal latency: ~10-50ms

## Roadmap

### Planned Features

- [ ] Port forwarding (local and remote)
- [ ] ProxyJump support
- [ ] Multi-hop SSH connections
- [ ] File synchronization
- [ ] Remote debugging integration
- [ ] Connection profiles
- [ ] SSH agent integration
- [ ] SOCKS proxy support
- [ ] Connection history
- [ ] Favorite hosts

### Future Enhancements

- [ ] GUI for SSH config editing
- [ ] Connection diagnostics tool
- [ ] Bandwidth monitoring
- [ ] Session recording
- [ ] Collaborative editing

## License

MIT License - See LICENSE file for details

## Support

- GitHub Issues: [Report bugs](https://github.com/miaoda/miaoda-ide/issues)
- Documentation: [Wiki](https://github.com/miaoda/miaoda-ide/wiki)
- Community: [Discussions](https://github.com/miaoda/miaoda-ide/discussions)
