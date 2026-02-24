import * as vscode from 'vscode';

/**
 * Editor capability for code editing operations
 */
export class EditorCapability {
	private readonly name = 'editor';
	private readonly description = 'Edit code in active editor';

	/**
	 * Get active editor content
	 */
	getActiveEditorContent(): string | null {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return null;
		}
		return editor.document.getText();
	}

	/**
	 * Replace text in active editor
	 */
	async replaceText(startLine: number, startChar: number, endLine: number, endChar: number, newText: string): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			throw new Error('No active editor');
		}

		const range = new vscode.Range(
			new vscode.Position(startLine, startChar),
			new vscode.Position(endLine, endChar)
		);

		await editor.edit((editBuilder) => {
			editBuilder.replace(range, newText);
		});
	}

	/**
	 * Insert text at cursor position
	 */
	async insertText(text: string): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			throw new Error('No active editor');
		}

		await editor.edit((editBuilder) => {
			editBuilder.insert(editor.selection.active, text);
		});
	}

	/**
	 * Get selected text
	 */
	getSelectedText(): string | null {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.selection.isEmpty) {
			return null;
		}
		return editor.document.getText(editor.selection);
	}

	/**
	 * Format document
	 */
	async formatDocument(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			throw new Error('No active editor');
		}

		await vscode.commands.executeCommand('editor.action.formatDocument');
	}

	/**
	 * Go to line
	 */
	async goToLine(line: number): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			throw new Error('No active editor');
		}

		const position = new vscode.Position(line, 0);
		editor.selection = new vscode.Selection(position, position);
		editor.revealRange(new vscode.Range(position, position));
	}

	/**
	 * Get capability metadata
	 */
	getMetadata() {
		return {
			name: this.name,
			description: this.description,
			available: true,
			methods: ['getActiveEditorContent', 'replaceText', 'insertText', 'getSelectedText', 'formatDocument', 'goToLine'],
		};
	}
}
