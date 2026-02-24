import * as vscode from 'vscode';
import { CodeReviewer, CodeIssue, IssueType, IssueSeverity } from './code-reviewer';

/**
 * Code review diagnostics provider
 */
export class CodeReviewProvider {
	private diagnosticCollection: vscode.DiagnosticCollection;
	private reviewer: CodeReviewer;
	private issuesMap: Map<string, CodeIssue[]> = new Map();

	constructor() {
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection('miaoda-review');
		this.reviewer = new CodeReviewer();
	}

	/**
	 * Review active document
	 */
	async reviewDocument(document: vscode.TextDocument): Promise<void> {
		const code = document.getText();
		const language = document.languageId;
		const filePath = document.uri.fsPath;

		try {
			const result = await this.reviewer.review({ code, language, filePath });

			// Store issues for this document
			this.issuesMap.set(document.uri.toString(), result.issues);

			// Convert issues to diagnostics
			const diagnostics = result.issues.map(issue => this.issueToDiagnostic(issue));

			// Update diagnostics
			this.diagnosticCollection.set(document.uri, diagnostics);

			// Show summary
			if (result.issues.length === 0) {
				vscode.window.showInformationMessage(`✅ Code review passed (Score: ${result.overallScore}/100)`);
			} else {
				vscode.window.showWarningMessage(
					`⚠️ Found ${result.issues.length} issue(s) (Score: ${result.overallScore}/100)`
				);
			}
		} catch (error) {
			vscode.window.showErrorMessage(
				`Code review failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Convert CodeIssue to VSCode Diagnostic
	 */
	private issueToDiagnostic(issue: CodeIssue): vscode.Diagnostic {
		const range = new vscode.Range(
			new vscode.Position(issue.line, issue.column),
			new vscode.Position(issue.endLine, issue.endColumn)
		);

		const diagnostic = new vscode.Diagnostic(
			range,
			issue.message,
			this.severityToVSCode(issue.severity)
		);

		diagnostic.source = 'Miaoda AI Review';
		diagnostic.code = issue.type;

		if (issue.suggestion) {
			diagnostic.relatedInformation = [
				new vscode.DiagnosticRelatedInformation(
					new vscode.Location(vscode.Uri.file(''), range),
					`Suggestion: ${issue.suggestion}`
				),
			];
		}

		return diagnostic;
	}

	/**
	 * Convert IssueSeverity to VSCode DiagnosticSeverity
	 */
	private severityToVSCode(severity: IssueSeverity): vscode.DiagnosticSeverity {
		switch (severity) {
			case 'critical':
			case 'high':
				return vscode.DiagnosticSeverity.Error;
			case 'medium':
				return vscode.DiagnosticSeverity.Warning;
			case 'low':
				return vscode.DiagnosticSeverity.Information;
		}
	}

	/**
	 * Get issues for document
	 */
	getIssues(document: vscode.TextDocument): CodeIssue[] {
		return this.issuesMap.get(document.uri.toString()) || [];
	}

	/**
	 * Clear diagnostics for document
	 */
	clearDiagnostics(document: vscode.TextDocument): void {
		this.diagnosticCollection.delete(document.uri);
		this.issuesMap.delete(document.uri.toString());
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.diagnosticCollection.dispose();
	}
}

/**
 * Code action provider for quick fixes
 */
export class CodeReviewActionProvider implements vscode.CodeActionProvider {
	private reviewProvider: CodeReviewProvider;
	private reviewer: CodeReviewer;

	constructor(reviewProvider: CodeReviewProvider) {
		this.reviewProvider = reviewProvider;
		this.reviewer = new CodeReviewer();
	}

	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): vscode.CodeAction[] {
		const actions: vscode.CodeAction[] = [];

		// Get issues for this document
		const issues = this.reviewProvider.getIssues(document);

		// Find issues in the current range
		for (const issue of issues) {
			const issueRange = new vscode.Range(
				new vscode.Position(issue.line, issue.column),
				new vscode.Position(issue.endLine, issue.endColumn)
			);

			if (issueRange.intersection(range)) {
				// Create quick fix action
				const action = new vscode.CodeAction(
					`🔧 Fix: ${issue.message}`,
					vscode.CodeActionKind.QuickFix
				);

				action.command = {
					command: 'miaoda.applyCodeFix',
					title: 'Apply Fix',
					arguments: [document, issue],
				};

				action.isPreferred = issue.severity === 'critical' || issue.severity === 'high';

				actions.push(action);
			}
		}

		return actions;
	}
}
