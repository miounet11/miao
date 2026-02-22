/**
 * Project Context Manager
 * Analyzes projects, builds dependency graphs, and provides intelligent context recommendations
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { UnifiedStorage } from './UnifiedStorage';
import { ProjectContext, CodeIndexRecord, KnowledgeGraphRecord } from './DatabaseSchema';
import { randomUUID } from 'crypto';

export interface ProjectAnalysisOptions {
  includeNodeModules?: boolean;
  maxFiles?: number;
  filePatterns?: string[];
  excludePatterns?: string[];
}

export interface ContextRecommendation {
  context: ProjectContext;
  relevance: number;
  reason: string;
}

export class ProjectContextManager {
  private analysisInProgress = new Map<string, Promise<void>>();

  constructor(private storage: UnifiedStorage) {}

  /**
   * Analyze a project and index its contents
   */
  async analyzeProject(
    projectPath: string,
    options: ProjectAnalysisOptions = {}
  ): Promise<void> {
    // Prevent duplicate analysis
    if (this.analysisInProgress.has(projectPath)) {
      return this.analysisInProgress.get(projectPath);
    }

    const analysisPromise = this._analyzeProject(projectPath, options);
    this.analysisInProgress.set(projectPath, analysisPromise);

    try {
      await analysisPromise;
    } finally {
      this.analysisInProgress.delete(projectPath);
    }
  }

  private async _analyzeProject(
    projectPath: string,
    options: ProjectAnalysisOptions
  ): Promise<void> {
    const {
      includeNodeModules = false,
      maxFiles = 1000,
      filePatterns = ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
      excludePatterns = ['**/node_modules/**', '**/dist/**', '**/out/**', '**/.git/**']
    } = options;

    try {
      // 1. Scan files
      const files = await this.scanFiles(projectPath, {
        filePatterns,
        excludePatterns: includeNodeModules
          ? excludePatterns.filter(p => !p.includes('node_modules'))
          : excludePatterns,
        maxFiles
      });

      // 2. Analyze each file
      for (const file of files) {
        await this.analyzeFile(file, projectPath);
      }

      // 3. Build dependency graph
      await this.buildDependencyGraph(projectPath);

      // 4. Save project metadata
      await this.saveProjectMetadata(projectPath, files.length);
    } catch (error) {
      console.error(`Failed to analyze project ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Scan files in a project
   */
  private async scanFiles(
    projectPath: string,
    options: {
      filePatterns: string[];
      excludePatterns: string[];
      maxFiles: number;
    }
  ): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of options.filePatterns) {
      try {
        const uris = await vscode.workspace.findFiles(
          new vscode.RelativePattern(projectPath, pattern),
          `{${options.excludePatterns.join(',')}}`,
          options.maxFiles - files.length
        );

        files.push(...uris.map(uri => uri.fsPath));

        if (files.length >= options.maxFiles) {
          break;
        }
      } catch (error) {
        console.error(`Failed to scan files with pattern ${pattern}:`, error);
      }
    }

    return files;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string, projectPath: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const relativePath = path.relative(projectPath, filePath);

      // Save file context
      const fileContext: ProjectContext = {
        id: randomUUID(),
        project_path: projectPath,
        context_type: 'file',
        content: relativePath,
        metadata: {
          fullPath: filePath,
          size: content.length,
          extension: path.extname(filePath)
        },
        created_at: Date.now(),
        updated_at: Date.now()
      };

      await this.storage.saveProjectContext(fileContext, false);

      // Parse and index symbols
      await this.parseAndIndexSymbols(filePath, projectPath, content);
    } catch (error) {
      console.error(`Failed to analyze file ${filePath}:`, error);
    }
  }

  /**
   * Parse and index symbols from a file
   * This is a simplified implementation - in production, use a proper AST parser
   */
  private async parseAndIndexSymbols(
    filePath: string,
    projectPath: string,
    content: string
  ): Promise<void> {
    const symbols = this.extractSymbols(content, filePath);

    for (const symbol of symbols) {
      const codeIndex: CodeIndexRecord = {
        id: randomUUID(),
        file_path: filePath,
        project_path: projectPath,
        symbol_name: symbol.name,
        symbol_type: symbol.type,
        line_start: symbol.lineStart,
        line_end: symbol.lineEnd,
        signature: symbol.signature,
        doc_comment: symbol.docComment,
        updated_at: Date.now()
      };

      await this.storage.saveCodeIndex(codeIndex, true);
    }
  }

  /**
   * Extract symbols from code (simplified regex-based extraction)
   * In production, use a proper parser like TypeScript Compiler API
   */
  private extractSymbols(
    content: string,
    filePath: string
  ): Array<{
    name: string;
    type: 'function' | 'class' | 'variable' | 'interface' | 'type';
    lineStart: number;
    lineEnd: number;
    signature?: string;
    docComment?: string;
  }> {
    const symbols: any[] = [];
    const lines = content.split('\n');

    // Extract functions
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'function',
        lineStart: lineNumber,
        lineEnd: lineNumber,
        signature: match[0]
      });
    }

    // Extract classes
    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'class',
        lineStart: lineNumber,
        lineEnd: lineNumber,
        signature: match[0]
      });
    }

    // Extract interfaces
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'interface',
        lineStart: lineNumber,
        lineEnd: lineNumber,
        signature: match[0]
      });
    }

    // Extract type aliases
    const typeRegex = /(?:export\s+)?type\s+(\w+)/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'type',
        lineStart: lineNumber,
        lineEnd: lineNumber,
        signature: match[0]
      });
    }

    return symbols;
  }

  /**
   * Build dependency graph for a project
   */
  private async buildDependencyGraph(projectPath: string): Promise<void> {
    const contexts = await this.storage.listProjectContexts(projectPath, 'file');

    for (const context of contexts) {
      if (!context.metadata?.fullPath) {
        continue;
      }

      try {
        const content = await fs.promises.readFile(context.metadata.fullPath, 'utf-8');
        const imports = this.extractImports(content);

        for (const importPath of imports) {
          const resolvedPath = this.resolveImportPath(
            importPath,
            context.metadata.fullPath,
            projectPath
          );

          if (resolvedPath) {
            const edge: KnowledgeGraphRecord = {
              id: randomUUID(),
              project_path: projectPath,
              entity_type: 'file',
              entity_id: context.metadata.fullPath,
              relation_type: 'imports',
              target_id: resolvedPath,
              weight: 1.0,
              created_at: Date.now()
            };

            await this.storage.saveKnowledgeGraphEdge(edge);
          }
        }
      } catch (error) {
        console.error(`Failed to build dependency graph for ${context.metadata.fullPath}:`, error);
      }
    }
  }

  /**
   * Extract import statements from code
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];

    // ES6 imports
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // CommonJS requires
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Resolve import path to absolute path
   */
  private resolveImportPath(
    importPath: string,
    fromFile: string,
    projectPath: string
  ): string | null {
    // Skip node_modules imports
    if (!importPath.startsWith('.')) {
      return null;
    }

    try {
      const fromDir = path.dirname(fromFile);
      let resolved = path.resolve(fromDir, importPath);

      // Try common extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
      for (const ext of extensions) {
        const testPath = resolved + ext;
        if (fs.existsSync(testPath)) {
          return testPath;
        }
      }

      // Try index files
      for (const ext of extensions) {
        const testPath = path.join(resolved, `index${ext}`);
        if (fs.existsSync(testPath)) {
          return testPath;
        }
      }
    } catch (error) {
      // Ignore resolution errors
    }

    return null;
  }

  /**
   * Save project metadata
   */
  private async saveProjectMetadata(projectPath: string, fileCount: number): Promise<void> {
    const metadata: ProjectContext = {
      id: randomUUID(),
      project_path: projectPath,
      context_type: 'config',
      content: 'project_metadata',
      metadata: {
        fileCount,
        lastAnalyzed: Date.now(),
        version: '1.0'
      },
      created_at: Date.now(),
      updated_at: Date.now()
    };

    await this.storage.saveProjectContext(metadata, false);
  }

  /**
   * Get relevant context for a query
   */
  async getRelevantContext(
    query: string,
    currentFile?: string,
    projectPath?: string
  ): Promise<ContextRecommendation[]> {
    const recommendations: ContextRecommendation[] = [];

    // 1. Get semantic context
    if (this.storage.isSemanticSearchAvailable()) {
      const semanticResults = await this.storage.searchProjectContext(query, projectPath, true);
      recommendations.push(
        ...semanticResults.map(result => ({
          context: result.item,
          relevance: result.score,
          reason: 'Semantic similarity'
        }))
      );
    }

    // 2. Get related files if current file is provided
    if (currentFile && projectPath) {
      const relatedFiles = await this.getRelatedFiles(currentFile, projectPath);
      for (const file of relatedFiles) {
        const contexts = await this.storage.listProjectContexts(projectPath, 'file');
        const fileContext = contexts.find(c => c.metadata?.fullPath === file);
        if (fileContext) {
          recommendations.push({
            context: fileContext,
            relevance: 0.8,
            reason: 'Related through imports'
          });
        }
      }
    }

    // 3. Sort by relevance
    recommendations.sort((a, b) => b.relevance - a.relevance);

    // 4. Remove duplicates and limit
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      if (seen.has(rec.context.id)) {
        return false;
      }
      seen.add(rec.context.id);
      return true;
    }).slice(0, 10);
  }

  /**
   * Get files related to the current file through imports
   */
  private async getRelatedFiles(filePath: string, projectPath: string): Promise<string[]> {
    const relatedFiles: string[] = [];

    // Get direct imports
    const edges = await this.storage.getKnowledgeGraphEdges(filePath, projectPath);
    relatedFiles.push(...edges.map(e => e.target_id));

    // Get files that import this file
    // Note: This requires a reverse lookup which we haven't implemented yet
    // TODO: Add reverse lookup capability

    return Array.from(new Set(relatedFiles));
  }

  /**
   * Get project statistics
   */
  async getProjectStats(projectPath: string): Promise<{
    fileCount: number;
    symbolCount: number;
    lastAnalyzed?: number;
  }> {
    const contexts = await this.storage.listProjectContexts(projectPath);
    const fileContexts = contexts.filter(c => c.context_type === 'file');
    const metadataContext = contexts.find(
      c => c.context_type === 'config' && c.content === 'project_metadata'
    );

    // Count symbols (this is approximate - would need to query code_index table)
    const symbolCount = 0; // TODO: Implement proper symbol counting

    return {
      fileCount: fileContexts.length,
      symbolCount,
      lastAnalyzed: metadataContext?.metadata?.lastAnalyzed
    };
  }

  /**
   * Clear project context
   */
  async clearProjectContext(projectPath: string): Promise<void> {
    // This would require adding a delete method to UnifiedStorage
    // For now, we'll just log
    console.log(`Clearing context for project: ${projectPath}`);
    // TODO: Implement proper cleanup
  }
}
