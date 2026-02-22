# Quick Start Guide - Miaoda Remote SSH

Get started with SSH remote development in 5 minutes!

## Prerequisites

- Miaoda IDE installed
- SSH access to a remote server
- Username and password OR SSH private key

## Step 1: Install the Extension

The extension is built-in to Miaoda IDE. If you need to rebuild it:

```bash
cd extensions/miaoda-remote-ssh
./install.sh
```

## Step 2: Add Your First SSH Host

### Option A: Using the UI

1. Open Miaoda IDE
2. Click the Remote Explorer icon in the Activity Bar (left sidebar)
3. Click the `+` icon in the SSH Targets view
4. Fill in the details:
   - **Host name**: `my-server` (any name you like)
   - **Hostname**: `192.168.1.100` (your server's IP or domain)
   - **Username**: `root` (your SSH username)
   - **Port**: `22` (default SSH port)
   - **Private key**: `~/.ssh/id_rsa` (optional, leave empty for password auth)

### Option B: Edit SSH Config Directly

1. Open Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Type: `Remote-SSH: Open SSH Configuration File`
3. Add your host:

```
Host my-server
  HostName 192.168.1.100
  Port 22
  User root
  IdentityFile ~/.ssh/id_rsa
```

4. Save the file
5. Click refresh icon in SSH Targets view

## Step 3: Connect to Your Server

1. In the SSH Targets view, click on your host (`my-server`)
2. Enter your password or passphrase when prompted
3. Wait for connection (you'll see a notification)
4. Choose an action:
   - **Open Folder**: Browse and edit remote files
   - **Open Terminal**: Run commands on the server
   - **Later**: Just stay connected

## Step 4: Work Remotely

### Edit Remote Files

1. After connecting, choose "Open Folder"
2. Enter the remote path (e.g., `/home/user/project`)
3. The folder opens in Explorer
4. Edit files as if they were local!

### Use Remote Terminal

1. Right-click on your host in SSH Targets
2. Select "Open Remote Terminal"
3. Run commands: `ls`, `cd`, `npm install`, etc.
4. Full terminal experience with colors and formatting

### Check Connection Status

Look at the bottom-left status bar:
- `SSH: Disconnected` - Not connected
- `SSH: user@host` - Connected (click to disconnect)

## Common Scenarios

### Scenario 1: Web Development on Remote Server

```bash
# Connect to server
# Open folder: /var/www/myapp
# Edit files in Explorer
# Open terminal and run:
npm install
npm run dev
```

### Scenario 2: System Administration

```bash
# Connect to server
# Open terminal
# Run admin commands:
sudo systemctl status nginx
sudo tail -f /var/log/syslog
sudo apt update && sudo apt upgrade
```

### Scenario 3: Multiple Servers

1. Add multiple hosts to SSH config
2. Connect to first server
3. Open new window (`Cmd+Shift+N`)
4. Connect to second server
5. Work on both simultaneously!

## Tips & Tricks

### Use SSH Keys (Recommended)

**Why?** More secure, no password typing, faster connection

**How?**

```bash
# Generate key (on your local machine)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_miaoda

# Copy to server
ssh-copy-id -i ~/.ssh/id_rsa_miaoda.pub user@host

# Add to SSH config
Host my-server
  HostName host
  User user
  IdentityFile ~/.ssh/id_rsa_miaoda
```

### Keep Connections Alive

Add to your SSH config:

```
Host *
  ServerAliveInterval 60
  ServerAliveCountMax 3
```

Or in Miaoda settings:

```json
{
  "miaoda.remote.ssh.keepaliveInterval": 60000
}
```

### Quick Connect

1. Press `Cmd+Shift+P` (or `Ctrl+Shift+P`)
2. Type: `Remote-SSH: Connect to Host`
3. Select host from list
4. Done!

### Disconnect Quickly

Click the status bar item (`SSH: user@host`) to disconnect.

## Troubleshooting

### Can't Connect?

**Check 1:** Can you SSH from terminal?
```bash
ssh user@host
```

If this works, the extension should work too.

**Check 2:** Is SSH server running?
```bash
# On the server:
sudo systemctl status sshd
```

**Check 3:** Firewall blocking?
```bash
# Check if port 22 is open:
telnet host 22
# or
nc -zv host 22
```

### Authentication Failed?

**For password auth:**
- Double-check username and password
- Try connecting via terminal first

**For key auth:**
- Check key permissions: `chmod 600 ~/.ssh/id_rsa`
- Verify key is on server: `cat ~/.ssh/authorized_keys`
- Check key format (should be OpenSSH)

### Files Won't Open?

**Check permissions:**
```bash
# On the server:
ls -la /path/to/file
```

**Check SFTP:**
```bash
# On the server:
grep Subsystem /etc/ssh/sshd_config
# Should show: Subsystem sftp /usr/lib/openssh/sftp-server
```

## Next Steps

- Read [README.md](README.md) for full feature list
- Check [DOCUMENTATION.md](DOCUMENTATION.md) for advanced usage
- Configure settings in `settings.json`
- Set up multiple servers for your workflow

## Getting Help

- Check the Output panel: View → Output → "Miaoda Remote SSH"
- Enable debug logging in settings
- Report issues on GitHub

## Example Configurations

### Basic Server

```
Host webserver
  HostName 192.168.1.100
  User www-data
  Port 22
```

### Server with Custom Key

```
Host production
  HostName prod.example.com
  User deploy
  Port 2222
  IdentityFile ~/.ssh/id_rsa_production
```

### Server Behind Bastion (Jump Host)

```
Host bastion
  HostName bastion.example.com
  User jumpuser
  IdentityFile ~/.ssh/id_rsa_bastion

Host internal-server
  HostName 10.0.1.100
  User admin
  ProxyJump bastion
  IdentityFile ~/.ssh/id_rsa_internal
```

### Multiple Servers

```
Host dev
  HostName dev.example.com
  User developer

Host staging
  HostName staging.example.com
  User developer

Host prod
  HostName prod.example.com
  User deploy
  IdentityFile ~/.ssh/id_rsa_prod
```

---

**Happy Remote Coding!** 🚀
