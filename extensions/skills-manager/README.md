# Skills Manager Extension

The Skills Manager extension provides a comprehensive framework for managing and executing agent skills in Miaoda IDE. It enables registration, lifecycle management, and execution of various automation skills.

## Features

- **Skill Registry**: Register and manage custom skills
- **Built-in Skills**: Pre-configured skills for common operations
- **Skill Execution**: Execute skills with parameter validation and timeout handling
- **Event System**: Subscribe to skill lifecycle events
- **Filtering**: Query skills by category, tags, or search terms

## Built-in Skills

### 1. File Operation Skill (`builtin.file-operation`)

Perform file system operations:
- **read**: Read file contents
- **write**: Write content to files
- **delete**: Delete files
- **exists**: Check if file exists
- **list**: List directory contents

**Example:**
```typescript
await skillsManager.executeSkill('builtin.file-operation', {
  operation: 'read',
  path: '/path/to/file.txt',
  encoding: 'utf8'
});
```

### 2. Code Analysis Skill (`builtin.code-analysis`)

Analyze code structure and symbols:
- **symbols**: Get document symbols
- **diagnostics**: Get code diagnostics (errors, warnings)
- **references**: Find symbol references
- **definitions**: Find symbol definitions
- **hover**: Get hover information

**Example:**
```typescript
await skillsManager.executeSkill('builtin.code-analysis', {
  operation: 'symbols',
  uri: 'file:///path/to/file.ts'
});
```

### 3. Git Operation Skill (`builtin.git-operation`)

Perform Git operations:
- **status**: Get repository status
- **commit**: Commit changes
- **push**: Push to remote
- **pull**: Pull from remote
- **branch**: List or create branches
- **log**: View commit history
- **diff**: View changes

**Example:**
```typescript
await skillsManager.executeSkill('builtin.git-operation', {
  operation: 'commit',
  message: 'feat: add new feature',
  files: ['src/file.ts']
});
```

### 4. Terminal Skill (`builtin.terminal`)

Execute terminal commands:
- Run shell commands
- Set working directory
- Configure environment variables
- Handle command output and errors

**Example:**
```typescript
await skillsManager.executeSkill('builtin.terminal', {
  command: 'npm test',
  cwd: '/path/to/project',
  timeout: 60000
});
```

## API

### ISkillsManager Interface

```typescript
interface ISkillsManager {
  registerSkill(skill: Skill): void;
  unregisterSkill(skillId: string): void;
  getSkill(skillId: string): Skill | undefined;
  listSkills(filter?: SkillFilter): Skill[];
  executeSkill(skillId: string, params: any, context?: SkillExecutionContext): Promise<SkillResult>;
  onSkillEvent(handler: (event: SkillEvent) => void): vscode.Disposable;
}
```

### Skill Definition

```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'file' | 'code' | 'git' | 'terminal' | 'custom';
  version: string;
  author?: string;
  tags?: string[];
  parameters?: SkillParameter[];
  timeout?: number;
  execute: (params: any, context: SkillExecutionContext) => Promise<SkillResult>;
}
```

## Commands

- **Miaoda: List Skills** - View all registered skills
- **Miaoda: Execute Skill** - Execute a skill interactively
- **Miaoda: Register Skill** - Register a custom skill programmatically

## Usage

### Registering a Custom Skill

```typescript
import * as vscode from 'vscode';
import type { Skill, SkillResult } from 'skills-manager';

const mySkill: Skill = {
  id: 'my-extension.custom-skill',
  name: 'Custom Skill',
  description: 'My custom automation skill',
  category: 'custom',
  version: '1.0.0',
  parameters: [
    {
      name: 'input',
      type: 'string',
      description: 'Input parameter',
      required: true
    }
  ],
  execute: async (params, context): Promise<SkillResult> => {
    // Your skill logic here
    return {
      success: true,
      data: { result: 'processed' }
    };
  }
};

// Register the skill
await vscode.commands.executeCommand('miaoda.skills.register', mySkill);
```

### Executing a Skill

```typescript
import * as vscode from 'vscode';

const result = await vscode.commands.executeCommand(
  'miaoda.skills.execute',
  'builtin.file-operation',
  {
    operation: 'read',
    path: '/path/to/file.txt'
  }
);

if (result.success) {
  console.log('File content:', result.data.content);
} else {
  console.error('Error:', result.error.message);
}
```

### Filtering Skills

```typescript
// Get all file-related skills
const fileSkills = skillsManager.listSkills({ category: 'file' });

// Search for skills
const searchResults = skillsManager.listSkills({ searchTerm: 'git' });

// Filter by tags
const taggedSkills = skillsManager.listSkills({ tags: ['automation'] });
```

### Subscribing to Events

```typescript
const subscription = skillsManager.onSkillEvent(event => {
  switch (event.type) {
    case 'skill:registered':
      console.log('Skill registered:', event.skillId);
      break;
    case 'skill:execution:started':
      console.log('Skill execution started:', event.skillId);
      break;
    case 'skill:execution:completed':
      console.log('Skill completed:', event.skillId);
      break;
    case 'skill:execution:failed':
      console.error('Skill failed:', event.skillId, event.data.error);
      break;
  }
});

// Don't forget to dispose
context.subscriptions.push(subscription);
```

## Architecture

```
skills-manager/
├── src/
│   ├── ISkillsManager.ts       # Interface definitions
│   ├── SkillsManager.ts        # Core implementation
│   ├── extension.ts            # Extension entry point
│   ├── skills/                 # Built-in skills
│   │   ├── FileOperationSkill.ts
│   │   ├── CodeAnalysisSkill.ts
│   │   ├── GitOperationSkill.ts
│   │   ├── TerminalSkill.ts
│   │   └── index.ts
│   └── __tests__/              # Test suites
│       ├── SkillsManager.test.ts
│       ├── FileOperationSkill.test.ts
│       ├── GitOperationSkill.test.ts
│       └── TerminalSkill.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Testing

Run tests with:

```bash
npm test
```

The test suite includes:
- Unit tests for SkillsManager
- Integration tests for all built-in skills
- Parameter validation tests
- Timeout handling tests
- Event emission tests

## Development

### Building

```bash
npm run compile
```

### Watching for Changes

```bash
npm run watch
```

## License

MIT
