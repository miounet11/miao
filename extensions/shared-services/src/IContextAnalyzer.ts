/**
 * Context Analyzer for building AI context from workspace
 */
export interface IContextAnalyzer {
  /**
   * Build context from current workspace state
   */
  buildContext(options: ContextOptions): Promise<AnalyzedContext>;

  /**
   * Check if a file path is excluded
   */
  isExcluded(filePath: string): boolean;

  /**
   * Update exclusion rules
   */
  setExclusionRules(rules: string[]): void;
}

export interface ContextOptions {
  activeFile?: boolean;
  selectedCode?: string;
  referencedFiles?: string[];
  includeImports?: boolean;
  maxTokens?: number;
}

export interface AnalyzedContext {
  files: ContextFile[];
  projectInfo: ProjectInfo;
  totalTokens: number;
}

export interface ContextFile {
  path: string;
  content: string;
  language: string;
  relevance: number; // 0-1
}

export interface ProjectInfo {
  root: string;
  languages: string[];
  framework?: string;
  packageManager?: string;
}
