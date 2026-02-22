# Change Log

All notable changes to the "miaoda-remote-ssh" extension will be documented in this file.

## [1.0.0] - 2024-02-21

### Added
- Initial release of Miaoda Remote SSH extension
- SSH connection management with password and key-based authentication
- Remote file system support via SFTP
- Remote terminal integration
- SSH config file parsing and management
- SSH Targets tree view in Remote Explorer
- Status bar indicator for connection state
- Commands:
  - Add New SSH Host
  - Connect to Host
  - Disconnect from Host
  - Open SSH Configuration File
  - Refresh SSH Targets
  - Open Remote Terminal
- Configuration options for timeout, keepalive, and config file path
- Support for encrypted private keys with passphrase
- Automatic SSH config directory creation
- Connection keepalive mechanism

### Features
- Browse and edit remote files seamlessly
- Interactive terminal sessions on remote hosts
- Visual connection status in status bar
- Quick pick for selecting hosts
- Inline actions in tree view
- Error handling and user feedback

### Security
- Secure password input (masked)
- Private key support with proper permissions
- No credential storage
- SSH config file permission enforcement (600)
