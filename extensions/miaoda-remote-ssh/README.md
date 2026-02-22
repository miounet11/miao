# Miaoda Remote - SSH

SSH remote development support for Miaoda IDE. Connect to remote servers via SSH and work with remote files, terminals, and more.

## Features

- **SSH Connection Management**: Connect to remote servers using SSH with password or key-based authentication
- **Remote File System**: Browse, edit, and manage files on remote servers
- **Remote Terminal**: Open interactive terminal sessions on remote hosts
- **SSH Config Integration**: Automatically reads and manages `~/.ssh/config` file
- **Connection Status**: Visual status bar indicator showing connection state
- **Multiple Authentication Methods**: Support for password, private key, and passphrase-protected keys

## Usage

### Adding a New SSH Host

1. Click the `+` icon in the SSH Targets view
2. Enter the host details:
   - Host name (alias)
   - Hostname or IP address
   - Username
   - Port (default: 22)
   - Private key path (optional)

### Connecting to a Host

1. Click on a host in the SSH Targets view, or
2. Use the command palette: `Remote-SSH: Connect to Host`
3. Enter password or passphrase if required
4. Choose to open a remote folder or terminal

### Opening Remote Files

Once connected, you can:
- Browse remote files in the Explorer
- Edit files directly on the remote server
- Create, delete, and rename files and folders

### Opening Remote Terminal

1. Right-click on a host in SSH Targets view
2. Select "Open Remote Terminal", or
3. Use command: `Remote-SSH: Open Remote Terminal`

### Managing SSH Config

Use the command `Remote-SSH: Open SSH Configuration File` to edit your SSH config directly.

## Configuration

### Settings

- `miaoda.remote.ssh.configFile`: Path to SSH config file (default: `~/.ssh/config`)
- `miaoda.remote.ssh.showLoginTerminal`: Show terminal during SSH connection (default: `true`)
- `miaoda.remote.ssh.enableDynamicForwarding`: Enable dynamic port forwarding (default: `true`)
- `miaoda.remote.ssh.connectTimeout`: SSH connection timeout in milliseconds (default: `30000`)
- `miaoda.remote.ssh.keepaliveInterval`: SSH keepalive interval in milliseconds (default: `30000`)

### SSH Config File Format

The extension reads standard SSH config format:

```
Host my-server
  HostName 192.168.1.100
  Port 22
  User root
  IdentityFile ~/.ssh/id_rsa
  ForwardAgent yes
```

## Requirements

- SSH server must be accessible from your machine
- For key-based authentication, private key must be in OpenSSH format
- Network connectivity to remote host

## Known Limitations

- File watching is not supported for remote files
- ProxyJump is parsed but not fully implemented yet
- Port forwarding is planned for future releases

## Troubleshooting

### Connection Timeout

If you experience connection timeouts:
1. Check network connectivity to the remote host
2. Verify SSH server is running on the remote host
3. Increase `miaoda.remote.ssh.connectTimeout` setting

### Authentication Failed

1. Verify username and password/key are correct
2. Check private key permissions (should be 600)
3. Ensure private key is in OpenSSH format
4. Try connecting via terminal first to verify credentials

### File Operations Fail

1. Check user permissions on remote server
2. Verify SFTP subsystem is enabled on SSH server
3. Check disk space on remote server

## Security

- Passwords are never stored, only used during connection
- Private keys are read from disk but not stored in memory longer than necessary
- SSH config file should have proper permissions (600)
- Use key-based authentication when possible

## License

MIT License - See LICENSE file for details
