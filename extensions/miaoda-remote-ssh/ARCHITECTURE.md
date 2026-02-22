# Miaoda Remote SSH - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Miaoda IDE                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              User Interface Layer                        │  │
│  │                                                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ Activity Bar │  │  Status Bar  │  │ Command      │  │  │
│  │  │ (Remote Icon)│  │  (SSH Status)│  │ Palette      │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │  │
│  │         │                 │                 │           │  │
│  │         └─────────────────┴─────────────────┘           │  │
│  │                           │                             │  │
│  └───────────────────────────┼─────────────────────────────┘  │
│                              │                                │
│  ┌───────────────────────────┼─────────────────────────────┐  │
│  │         Extension Layer   │                             │  │
│  │                           ▼                             │  │
│  │  ┌────────────────────────────────────────────────┐    │  │
│  │  │         extension.ts (Main Entry)              │    │  │
│  │  │  - Command registration                        │    │  │
│  │  │  - View registration                           │    │  │
│  │  │  - Connection orchestration                    │    │  │
│  │  └────┬───────────────────────────────────────┬───┘    │  │
│  │       │                                       │        │  │
│  │       ▼                                       ▼        │  │
│  │  ┌─────────────────┐                  ┌──────────────┐│  │
│  │  │ SSHTargets      │                  │ Status Bar   ││  │
│  │  │ Provider        │                  │ Manager      ││  │
│  │  │ (Tree View)     │                  │              ││  │
│  │  └────┬────────────┘                  └──────────────┘│  │
│  │       │                                                │  │
│  └───────┼────────────────────────────────────────────────┘  │
│          │                                                   │
│  ┌───────┼───────────────────────────────────────────────┐  │
│  │       │      Core Modules Layer                       │  │
│  │       ▼                                               │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │         SSHConfigManager                     │    │  │
│  │  │  - Parse ~/.ssh/config                       │    │  │
│  │  │  - Add/Remove hosts                          │    │  │
│  │  │  - Host validation                           │    │  │
│  │  └────┬─────────────────────────────────────────┘    │  │
│  │       │                                               │  │
│  │       ▼                                               │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │         SSHConnection                        │    │  │
│  │  │  - Connection management                     │    │  │
│  │  │  - Authentication (password/key)             │    │  │
│  │  │  - Command execution                         │    │  │
│  │  │  - Keepalive mechanism                       │    │  │
│  │  └────┬─────────────────────────────────────────┘    │  │
│  │       │                                               │  │
│  │       ├──────────────────┬────────────────────────┐   │  │
│  │       ▼                  ▼                        ▼   │  │
│  │  ┌──────────┐   ┌──────────────┐   ┌──────────────┐ │  │
│  │  │ SFTP     │   │ Terminal     │   │ Command      │ │  │
│  │  │ Client   │   │ Shell        │   │ Executor     │ │  │
│  │  └────┬─────┘   └──────┬───────┘   └──────────────┘ │  │
│  │       │                │                             │  │
│  │       ▼                ▼                             │  │
│  │  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ SSHFileSystem│  │ SSHTerminal  │                 │  │
│  │  │ Provider     │  │ (Pseudo TTY) │                 │  │
│  │  │              │  │              │                 │  │
│  │  │ - readFile   │  │ - open()     │                 │  │
│  │  │ - writeFile  │  │ - handleInput│                 │  │
│  │  │ - readDir    │  │ - setDims    │                 │  │
│  │  │ - stat       │  │              │                 │  │
│  │  └──────────────┘  └──────────────┘                 │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ SSH Protocol (Port 22)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Remote SSH Server                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   sshd       │  │  SFTP        │  │   Shell      │     │
│  │   (Auth)     │  │  Subsystem   │  │   (bash/zsh) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Remote File System                      │  │
│  │  /home/user/project/                                 │  │
│  │  ├── src/                                            │  │
│  │  ├── tests/                                          │  │
│  │  └── package.json                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Connection Flow

```
User Action → Command → SSHConfigManager → SSHConnection → Remote Server
    │            │              │                  │              │
    │            │              │                  │              │
    ▼            ▼              ▼                  ▼              ▼
  Click      connectTo    getHost()          connect()      Authenticate
  Host       Host()       config                             & Establish
                                                             Connection
```

### 2. File Operation Flow

```
User Opens File → VS Code → SSHFileSystemProvider → SFTP → Remote File
       │             │              │                  │          │
       │             │              │                  │          │
       ▼             ▼              ▼                  ▼          ▼
   Explorer      readFile()    initialize()        get()      Read from
   Click         request       SFTP client         file       disk

                                                   Return content
                                                   ◄──────────┘
```

### 3. Terminal Flow

```
User Opens Terminal → Command → SSHTerminal → Shell Stream → Remote Shell
        │                │           │              │              │
        │                │           │              │              │
        ▼                ▼           ▼              ▼              ▼
    Context Menu    openTerminal  open()      client.shell()   Execute
    Click           ()            PTY                          commands

                                  Input/Output bidirectional
                                  ◄──────────────────────────►
```

## Data Flow Diagram

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. Select Host
       ▼
┌─────────────────┐
│ SSH Targets     │
│ Tree View       │
└──────┬──────────┘
       │
       │ 2. Trigger Connect
       ▼
┌─────────────────┐
│ Extension       │
│ (extension.ts)  │
└──────┬──────────┘
       │
       │ 3. Get Host Config
       ▼
┌─────────────────┐
│ SSHConfig       │
│ Manager         │
└──────┬──────────┘
       │
       │ 4. Host Details
       ▼
┌─────────────────┐
│ Prompt for      │
│ Credentials     │
└──────┬──────────┘
       │
       │ 5. Password/Key
       ▼
┌─────────────────┐
│ SSHConnection   │
│ .connect()      │
└──────┬──────────┘
       │
       │ 6. SSH Protocol
       ▼
┌─────────────────┐
│ Remote Server   │
│ (sshd)          │
└──────┬──────────┘
       │
       │ 7. Authenticated
       ▼
┌─────────────────┐
│ Initialize      │
│ SFTP & Terminal │
└──────┬──────────┘
       │
       │ 8. Ready
       ▼
┌─────────────────┐
│ User can work   │
│ remotely        │
└─────────────────┘
```

## Module Dependencies

```
extension.ts
    ├── sshConfigManager
    │   └── (reads ~/.ssh/config)
    │
    ├── sshConnection
    │   ├── ssh2 (npm package)
    │   └── (manages SSH connection)
    │
    ├── sshFileSystemProvider
    │   ├── sshConnection
    │   ├── ssh2-sftp-client (npm package)
    │   └── (implements FileSystemProvider)
    │
    ├── sshTerminal
    │   ├── sshConnection
    │   └── (implements Pseudoterminal)
    │
    └── sshTargetsProvider
        ├── sshConfigManager
        └── (implements TreeDataProvider)
```

## State Management

```
┌─────────────────────────────────────────┐
│         Extension State                 │
├─────────────────────────────────────────┤
│                                         │
│  currentConnection: SSHConnection?      │
│  currentFileSystem: SSHFileSystem?      │
│  statusBarItem: StatusBarItem           │
│                                         │
│  States:                                │
│  ┌────────────────────────────────┐    │
│  │ DISCONNECTED                   │    │
│  │   ↓ (connect)                  │    │
│  │ CONNECTING                     │    │
│  │   ↓ (authenticated)            │    │
│  │ CONNECTED                      │    │
│  │   ↓ (disconnect/error)         │    │
│  │ DISCONNECTED                   │    │
│  └────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                  Authentication Decision                │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
                    Has IdentityFile?
                    ┌───────┴───────┐
                    │               │
                   YES             NO
                    │               │
                    ▼               ▼
            Load Private Key    Prompt for
                    │            Password
                    │               │
                    ▼               │
            Is Key Encrypted?       │
            ┌───────┴───────┐       │
            │               │       │
           YES             NO       │
            │               │       │
            ▼               │       │
      Prompt for            │       │
      Passphrase            │       │
            │               │       │
            └───────┬───────┘       │
                    │               │
                    └───────┬───────┘
                            │
                            ▼
                    Attempt Connection
                            │
                    ┌───────┴───────┐
                    │               │
                 Success         Failure
                    │               │
                    ▼               ▼
              Connected      Show Error
                                    │
                                    ▼
                              Retry/Cancel
```

## Error Handling Strategy

```
┌─────────────────────────────────────────┐
│         Error Categories                │
├─────────────────────────────────────────┤
│                                         │
│  1. Connection Errors                   │
│     - Timeout                           │
│     - Network unreachable               │
│     - Connection refused                │
│     → Retry with exponential backoff    │
│                                         │
│  2. Authentication Errors               │
│     - Invalid credentials               │
│     - Key not found                     │
│     - Permission denied                 │
│     → Prompt user for correct creds     │
│                                         │
│  3. File System Errors                  │
│     - Permission denied                 │
│     - File not found                    │
│     - Disk full                         │
│     → Show error, suggest solutions     │
│                                         │
│  4. Terminal Errors                     │
│     - Shell not available               │
│     - PTY allocation failed             │
│     → Fallback to command execution     │
│                                         │
└─────────────────────────────────────────┘
```

## Performance Considerations

### Connection Pooling
```
Single SSH Connection
    ├── SFTP Channel (file operations)
    ├── Shell Channel (terminal)
    └── Exec Channels (commands)
```

### Caching Strategy
```
- SSH Config: Cached until refresh
- Host Keys: Cached by ssh2 library
- File Stats: Cached with TTL
- Directory Listings: Cached with invalidation
```

### Optimization Points
```
1. Lazy initialization of SFTP
2. Keepalive to prevent reconnections
3. Batch file operations when possible
4. Stream large files instead of buffering
5. Compress data for slow connections
```

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
├─────────────────────────────────────────┤
│                                         │
│  1. Transport Layer                     │
│     - SSH protocol encryption           │
│     - Host key verification             │
│                                         │
│  2. Authentication Layer                │
│     - Password (not stored)             │
│     - Private key (read-only)           │
│     - Passphrase (not stored)           │
│                                         │
│  3. Authorization Layer                 │
│     - Server-side permissions           │
│     - User-based access control         │
│                                         │
│  4. Application Layer                   │
│     - Input validation                  │
│     - Path sanitization                 │
│     - Command injection prevention      │
│                                         │
└─────────────────────────────────────────┘
```

## Extension Lifecycle

```
┌─────────────────────────────────────────┐
│         Extension Lifecycle             │
├─────────────────────────────────────────┤
│                                         │
│  1. Activation                          │
│     - Register commands                 │
│     - Create tree view                  │
│     - Initialize status bar             │
│                                         │
│  2. Runtime                             │
│     - Handle user actions               │
│     - Manage connections                │
│     - Process file operations           │
│                                         │
│  3. Deactivation                        │
│     - Disconnect active connections     │
│     - Dispose file systems              │
│     - Clean up resources                │
│                                         │
└─────────────────────────────────────────┘
```

This architecture provides a robust, secure, and performant SSH remote development experience within Miaoda IDE.
