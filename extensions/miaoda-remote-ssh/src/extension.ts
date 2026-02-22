import * as vscode from 'vscode';
import * as fs from 'fs';
import { SSHConfigManager, SSHHost } from './sshConfig';
import { SSHConnection, SSHConfig } from './sshConnection';
import { SSHFileSystemProvider } from './sshFileSystem';
import { SSHTerminal } from './sshTerminal';
import { SSHTargetsProvider, SSHHostItem } from './sshTargetsProvider';

let currentConnection: SSHConnection | undefined;
let currentFileSystem: SSHFileSystemProvider | undefined;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log('Miaoda Remote SSH extension is now active');

  const configManager = new SSHConfigManager();

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.text = '$(vm) SSH: Disconnected';
  statusBarItem.command = 'miaoda.remote.connectToHost';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // SSH Targets Tree View
  const sshTargetsProvider = new SSHTargetsProvider(configManager);
  const treeView = vscode.window.createTreeView('miaoda.remote.sshTargets', {
    treeDataProvider: sshTargetsProvider,
  });
  context.subscriptions.push(treeView);

  // Add New SSH Host
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.remote.addNewSSHHost', async () => {
      try {
        const name = await vscode.window.showInputBox({
          prompt: 'Enter SSH host name (alias)',
          placeHolder: 'my-server',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Host name is required';
            }
            if (value.includes(' ')) {
              return 'Host name cannot contain spaces';
            }
            return null;
          },
        });

        if (!name) return;

        const host = await vscode.window.showInputBox({
          prompt: 'Enter hostname or IP address',
          placeHolder: '192.168.1.100 or example.com',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Hostname is required';
            }
            return null;
          },
        });

        if (!host) return;

        const user = await vscode.window.showInputBox({
          prompt: 'Enter username',
          placeHolder: 'root',
          value: process.env.USER || 'root',
        });

        if (!user) return;

        const port = await vscode.window.showInputBox({
          prompt: 'Enter port',
          value: '22',
          validateInput: (value) => {
            const portNum = parseInt(value);
            if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
              return 'Port must be a number between 1 and 65535';
            }
            return null;
          },
        });

        const identityFile = await vscode.window.showInputBox({
          prompt: 'Enter path to private key (optional, press Enter to skip)',
          placeHolder: '~/.ssh/id_rsa',
        });

        await configManager.addHost({
          name,
          host,
          user,
          port: parseInt(port || '22'),
          identityFile: identityFile || undefined,
        });

        sshTargetsProvider.refresh();
        vscode.window.showInformationMessage(`SSH host "${name}" added successfully`);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to add SSH host: ${err}`);
      }
    })
  );

  // Connect to Host
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'miaoda.remote.connectToHost',
      async (hostItem?: SSHHostItem) => {
        try {
          let host: SSHHost;

          if (hostItem) {
            host = hostItem.host;
          } else {
            // Show quick pick
            const hosts = await configManager.getHosts();
            if (hosts.length === 0) {
              const addNew = await vscode.window.showInformationMessage(
                'No SSH hosts configured. Would you like to add one?',
                'Add Host',
                'Cancel'
              );
              if (addNew === 'Add Host') {
                await vscode.commands.executeCommand('miaoda.remote.addNewSSHHost');
              }
              return;
            }

            const selected = await vscode.window.showQuickPick(
              hosts.map((h) => ({
                label: h.name,
                description: `${h.user}@${h.host}:${h.port}`,
                host: h,
              })),
              { placeHolder: 'Select SSH host to connect' }
            );

            if (!selected) return;
            host = selected.host;
          }

          await connectToHost(host, context);
        } catch (err) {
          vscode.window.showErrorMessage(`Connection failed: ${err}`);
        }
      }
    )
  );

  // Disconnect
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.remote.disconnect', async () => {
      if (currentConnection) {
        currentConnection.disconnect();
        currentConnection = undefined;

        if (currentFileSystem) {
          await currentFileSystem.dispose();
          currentFileSystem = undefined;
        }

        statusBarItem.text = '$(vm) SSH: Disconnected';
        vscode.window.showInformationMessage('Disconnected from SSH host');
      } else {
        vscode.window.showInformationMessage('No active SSH connection');
      }
    })
  );

  // Open SSH Config
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.remote.openSSHConfig', async () => {
      const configPath = configManager.getConfigPath();
      const uri = vscode.Uri.file(configPath);

      try {
        // Create config file if it doesn't exist
        if (!fs.existsSync(configPath)) {
          fs.writeFileSync(
            configPath,
            '# SSH Config File\n# Add your SSH hosts here\n\n',
            { mode: 0o600 }
          );
        }

        await vscode.window.showTextDocument(uri);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to open SSH config: ${err}`);
      }
    })
  );

  // Refresh Targets
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.remote.refreshTargets', () => {
      sshTargetsProvider.refresh();
    })
  );

  // Open Terminal
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'miaoda.remote.openTerminal',
      async (hostItem?: SSHHostItem) => {
        try {
          let connection = currentConnection;

          // If not connected or connecting to different host, establish connection
          if (!connection || (hostItem && connection.getConfig().host !== hostItem.host.host)) {
            if (hostItem) {
              connection = await connectToHost(hostItem.host, context);
            } else {
              vscode.window.showErrorMessage('Please connect to a host first');
              return;
            }
          }

          if (!connection) {
            vscode.window.showErrorMessage('Failed to establish SSH connection');
            return;
          }

          const terminal = new SSHTerminal(connection);
          const vscodeTerminal = vscode.window.createTerminal({
            name: `SSH: ${connection.getConfig().username}@${connection.getConfig().host}`,
            pty: terminal,
          });

          vscodeTerminal.show();
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to open terminal: ${err}`);
        }
      }
    )
  );
}

async function connectToHost(
  host: SSHHost,
  context: vscode.ExtensionContext
): Promise<SSHConnection> {
  // Disconnect existing connection
  if (currentConnection) {
    currentConnection.disconnect();
  }

  const config = vscode.workspace.getConfiguration('miaoda.remote.ssh');

  // Build SSH config
  const sshConfig: SSHConfig = {
    host: host.host,
    port: host.port,
    username: host.user,
    readyTimeout: config.get('connectTimeout') || 30000,
    keepaliveInterval: config.get('keepaliveInterval') || 30000,
  };

  // Determine authentication method
  if (host.identityFile) {
    try {
      sshConfig.privateKey = await SSHConnection.loadPrivateKey(host.identityFile);

      // Check if key is encrypted
      const keyContent = sshConfig.privateKey.toString();
      if (keyContent.includes('ENCRYPTED')) {
        const passphrase = await vscode.window.showInputBox({
          prompt: 'Enter passphrase for private key',
          password: true,
        });
        if (passphrase) {
          sshConfig.passphrase = passphrase;
        }
      }
    } catch (err) {
      vscode.window.showWarningMessage(
        `Failed to load private key: ${err}. Falling back to password authentication.`
      );
    }
  }

  // If no private key, ask for password
  if (!sshConfig.privateKey) {
    const password = await vscode.window.showInputBox({
      prompt: `Enter password for ${host.user}@${host.host}`,
      password: true,
    });

    if (!password) {
      throw new Error('Password is required');
    }

    sshConfig.password = password;
  }

  // Create connection
  const connection = new SSHConnection(sshConfig);

  // Show progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Connecting to ${host.user}@${host.host}...`,
      cancellable: false,
    },
    async () => {
      await connection.connect();
    }
  );

  currentConnection = connection;

  // Update status bar
  statusBarItem.text = `$(vm-active) SSH: ${host.user}@${host.host}`;
  statusBarItem.tooltip = `Connected to ${host.name}`;
  statusBarItem.command = 'miaoda.remote.disconnect';

  // Initialize file system
  const fileSystem = new SSHFileSystemProvider(connection);
  await fileSystem.initialize();
  currentFileSystem = fileSystem;

  // Register file system provider
  const scheme = 'ssh';
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(scheme, fileSystem, {
      isCaseSensitive: true,
    })
  );

  // Ask if user wants to open a folder
  const openFolder = await vscode.window.showInformationMessage(
    `Connected to ${host.name}. Open a remote folder?`,
    'Open Folder',
    'Open Terminal',
    'Later'
  );

  if (openFolder === 'Open Folder') {
    const remotePath = await vscode.window.showInputBox({
      prompt: 'Enter remote folder path',
      value: '/home/' + host.user,
      placeHolder: '/path/to/folder',
    });

    if (remotePath) {
      const uri = vscode.Uri.parse(`${scheme}://${host.host}${remotePath}`);
      await vscode.commands.executeCommand('vscode.openFolder', uri, false);
    }
  } else if (openFolder === 'Open Terminal') {
    await vscode.commands.executeCommand('miaoda.remote.openTerminal');
  }

  return connection;
}

export function deactivate() {
  if (currentConnection) {
    currentConnection.disconnect();
  }
  if (currentFileSystem) {
    currentFileSystem.dispose();
  }
}
