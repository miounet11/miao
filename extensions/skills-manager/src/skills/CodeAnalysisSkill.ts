import * as vscode from 'vscode';
import type { Skill, SkillExecutionContext, SkillResult } from '../ISkillsManager';

/**
 * Code Analysis Skill
 * Provides code parsing and analysis capabilities
 */
export class CodeAnalysisSkill implements Skill {
  id = 'builtin.code-analysis';
  name = 'Code Analysis';
  description = 'Parse and analyze code structure, symbols, and diagnostics';
  category = 'code' as const;
  version = '1.0.0';
  author = 'Miaoda';
  tags = ['code', 'analysis', 'ast', 'symbols'];
  timeout = 15000;

  parameters = [
    {
      name: 'operation',
      type: 'string' as const,
      description: 'Operation: symbols, diagnostics, references, definitions, hover',
      required: true,
    },
    {
      name: 'uri',
      type: 'string' as const,
      description: 'File URI to analyze',
      required: true,
    },
    {
      name: 'position',
      type: 'object' as const,
      description: 'Position for position-based operations (line, character)',
      required: false,
    },
  ];

  async execute(params: any, context: SkillExecutionContext): Promise<SkillResult> {
    const { operation, uri: uriString, position } = params;

    try {
      const uri = vscode.Uri.parse(uriString);

      switch (operation) {
        case 'symbols':
          return await this.getDocumentSymbols(uri);

        case 'diagnostics':
          return await this.getDiagnostics(uri);

        case 'references':
          if (!position) {
            return this.errorResult('MISSING_POSITION', 'Position required for references operation');
          }
          return await this.getReferences(uri, position);

        case 'definitions':
          if (!position) {
            return this.errorResult('MISSING_POSITION', 'Position required for definitions operation');
          }
          return await this.getDefinitions(uri, position);

        case 'hover':
          if (!position) {
            return this.errorResult('MISSING_POSITION', 'Position required for hover operation');
          }
          return await this.getHover(uri, position);

        default:
          return this.errorResult(
            'INVALID_OPERATION',
            `Invalid operation: ${operation}. Supported: symbols, diagnostics, references, definitions, hover`
          );
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CODE_ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  private async getDocumentSymbols(uri: vscode.Uri): Promise<SkillResult> {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      uri
    );

    return {
      success: true,
      data: {
        uri: uri.toString(),
        symbols: symbols?.map(s => this.serializeSymbol(s)) || [],
        count: symbols?.length || 0,
      },
    };
  }

  private async getDiagnostics(uri: vscode.Uri): Promise<SkillResult> {
    const diagnostics = vscode.languages.getDiagnostics(uri);

    return {
      success: true,
      data: {
        uri: uri.toString(),
        diagnostics: diagnostics.map(d => ({
          message: d.message,
          severity: vscode.DiagnosticSeverity[d.severity],
          range: {
            start: { line: d.range.start.line, character: d.range.start.character },
            end: { line: d.range.end.line, character: d.range.end.character },
          },
          source: d.source,
          code: d.code,
        })),
        count: diagnostics.length,
        errors: diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length,
        warnings: diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length,
      },
    };
  }

  private async getReferences(uri: vscode.Uri, position: { line: number; character: number }): Promise<SkillResult> {
    const pos = new vscode.Position(position.line, position.character);
    const locations = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      uri,
      pos
    );

    return {
      success: true,
      data: {
        uri: uri.toString(),
        position,
        references: locations?.map(loc => ({
          uri: loc.uri.toString(),
          range: {
            start: { line: loc.range.start.line, character: loc.range.start.character },
            end: { line: loc.range.end.line, character: loc.range.end.character },
          },
        })) || [],
        count: locations?.length || 0,
      },
    };
  }

  private async getDefinitions(uri: vscode.Uri, position: { line: number; character: number }): Promise<SkillResult> {
    const pos = new vscode.Position(position.line, position.character);
    const locations = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider',
      uri,
      pos
    );

    return {
      success: true,
      data: {
        uri: uri.toString(),
        position,
        definitions: locations?.map(loc => ({
          uri: loc.uri.toString(),
          range: {
            start: { line: loc.range.start.line, character: loc.range.start.character },
            end: { line: loc.range.end.line, character: loc.range.end.character },
          },
        })) || [],
        count: locations?.length || 0,
      },
    };
  }

  private async getHover(uri: vscode.Uri, position: { line: number; character: number }): Promise<SkillResult> {
    const pos = new vscode.Position(position.line, position.character);
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider',
      uri,
      pos
    );

    return {
      success: true,
      data: {
        uri: uri.toString(),
        position,
        hovers: hovers?.map(h => ({
          contents: h.contents.map(c => (typeof c === 'string' ? c : c.value)),
          range: h.range ? {
            start: { line: h.range.start.line, character: h.range.start.character },
            end: { line: h.range.end.line, character: h.range.end.character },
          } : undefined,
        })) || [],
      },
    };
  }

  private serializeSymbol(symbol: vscode.DocumentSymbol): any {
    return {
      name: symbol.name,
      kind: vscode.SymbolKind[symbol.kind],
      detail: symbol.detail,
      range: {
        start: { line: symbol.range.start.line, character: symbol.range.start.character },
        end: { line: symbol.range.end.line, character: symbol.range.end.character },
      },
      selectionRange: {
        start: { line: symbol.selectionRange.start.line, character: symbol.selectionRange.start.character },
        end: { line: symbol.selectionRange.end.line, character: symbol.selectionRange.end.character },
      },
      children: symbol.children?.map(c => this.serializeSymbol(c)) || [],
    };
  }

  private errorResult(code: string, message: string): SkillResult {
    return {
      success: false,
      error: { code, message },
    };
  }
}
