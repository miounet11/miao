import {
  IContextAnalyzer,
  ContextOptions,
  AnalyzedContext,
  ContextFile,
  ProjectInfo,
} from './IContextAnalyzer';
import * as path from 'path';

/**
 * Simple token counter (approximation)
 * In production, this would use tiktoken or similar
 */
function countTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescriptreact',
    '.js': 'javascript',
    '.jsx': 'javascriptreact',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.md': 'markdown',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
  };
  return languageMap[ext] || 'plaintext';
}

/**
 * Glob pattern matcher (simplified)
 */
class GlobMatcher {
  private patterns: RegExp[];

  constructor(patterns: string[]) {
    this.patterns = patterns.map((pattern) => this.globToRegex(pattern));
  }

  matches(filePath: string): boolean {
    return this.patterns.some((regex) => regex.test(filePath));
  }

  private globToRegex(pattern: string): RegExp {
    // Convert glob pattern to regex
    // Simplified implementation
    let regexPattern = pattern
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\*/g, '.*') // * matches any characters
      .replace(/\?/g, '.'); // ? matches single character

    return new RegExp(`^${regexPattern}$`);
  }
}

/**
 * Context Analyzer implementation
 */
export class ContextAnalyzer implements IContextAnalyzer {
  private exclusionRules: string[] = [];
  private globMatcher: GlobMatcher | null = null;

  constructor() {
    // Default exclusion rules
    this.setExclusionRules([
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      'out/**',
      '*.log',
      '.env',
      '.env.*',
      '*.key',
      '*.pem',
      '*.p12',
      'credentials.json',
    ]);
  }

  /**
   * Build context from current workspace state
   */
  async buildContext(options: ContextOptions): Promise<AnalyzedContext> {
    const files: ContextFile[] = [];
    let totalTokens = 0;
    const maxTokens = options.maxTokens || 100000;

    // Add active file if requested
    if (options.activeFile && options.activeFile !== true) {
      const filePath = options.activeFile as unknown as string;
      if (!this.isExcluded(filePath)) {
        const content = await this.readFile(filePath);
        const tokens = countTokens(content);

        if (totalTokens + tokens <= maxTokens) {
          files.push({
            path: filePath,
            content,
            language: detectLanguage(filePath),
            relevance: 1.0, // Active file has highest relevance
          });
          totalTokens += tokens;
        }
      }
    }

    // Add selected code if provided
    if (options.selectedCode) {
      const tokens = countTokens(options.selectedCode);
      if (totalTokens + tokens <= maxTokens) {
        files.push({
          path: '<selection>',
          content: options.selectedCode,
          language: 'plaintext',
          relevance: 1.0,
        });
        totalTokens += tokens;
      }
    }

    // Add referenced files
    if (options.referencedFiles) {
      for (const filePath of options.referencedFiles) {
        if (this.isExcluded(filePath)) {
          continue;
        }

        const content = await this.readFile(filePath);
        const tokens = countTokens(content);

        if (totalTokens + tokens <= maxTokens) {
          files.push({
            path: filePath,
            content,
            language: detectLanguage(filePath),
            relevance: 0.8, // Referenced files have lower relevance
          });
          totalTokens += tokens;
        } else {
          // Truncate if exceeds max tokens
          break;
        }
      }
    }

    // Build project info
    const projectInfo = await this.detectProjectInfo();

    return {
      files,
      projectInfo,
      totalTokens,
    };
  }

  /**
   * Check if a file path is excluded
   */
  isExcluded(filePath: string): boolean {
    if (!this.globMatcher) {
      return false;
    }
    return this.globMatcher.matches(filePath);
  }

  /**
   * Update exclusion rules
   */
  setExclusionRules(rules: string[]): void {
    this.exclusionRules = rules;
    this.globMatcher = new GlobMatcher(rules);
  }

  /**
   * Get current exclusion rules
   */
  getExclusionRules(): string[] {
    return [...this.exclusionRules];
  }

  /**
   * Read file content (mock implementation)
   * In production, this would use VSCode API
   */
  private async readFile(filePath: string): Promise<string> {
    // Mock implementation for testing
    return `// Content of ${filePath}\n// This is a mock file content`;
  }

  /**
   * Detect project information
   */
  private async detectProjectInfo(): Promise<ProjectInfo> {
    // Mock implementation
    // In production, this would analyze package.json, tsconfig.json, etc.
    return {
      root: '/mock/project/root',
      languages: ['typescript', 'javascript'],
      framework: 'unknown',
      packageManager: 'npm',
    };
  }
}

/**
 * Singleton instance of Context Analyzer
 */
let contextAnalyzerInstance: ContextAnalyzer | undefined;

export function getContextAnalyzer(): ContextAnalyzer {
  if (!contextAnalyzerInstance) {
    contextAnalyzerInstance = new ContextAnalyzer();
  }
  return contextAnalyzerInstance;
}

export function resetContextAnalyzer(): void {
  contextAnalyzerInstance = undefined;
}
