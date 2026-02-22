import * as vscode from 'vscode';
import { ProjectManager } from '../managers/ProjectManager';
import { FileChange } from '../types';

export class HistoryWebviewProvider {
    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly projectManager: ProjectManager
    ) {}

    public async show() {
        const panel = vscode.window.createWebviewPanel(
            'miaodaHistory',
            'Project History',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this._extensionUri]
            }
        );

        panel.webview.html = this._getHtmlForWebview(panel.webview);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'refresh':
                    await this.loadHistory(panel.webview, data.days || 7);
                    break;
                case 'search':
                    await this.searchHistory(panel.webview, data.query);
                    break;
                case 'viewFile':
                    await this.viewFile(data.filePath);
                    break;
            }
        });

        // Load initial data
        await this.loadHistory(panel.webview, 7);
    }

    private async loadHistory(webview: vscode.Webview, days: number) {
        const changes = await this.projectManager.getRecentChanges(1000);
        const now = Date.now();
        const cutoff = now - (days * 24 * 60 * 60 * 1000);

        const filteredChanges = changes.filter(c => c.timestamp >= cutoff);
        const groupedByDay = this.groupChangesByDay(filteredChanges);

        webview.postMessage({
            type: 'update',
            data: groupedByDay
        });
    }

    private async searchHistory(webview: vscode.Webview, query: string) {
        const changes = await this.projectManager.getRecentChanges(1000);
        const filtered = changes.filter(c =>
            c.file.toLowerCase().includes(query.toLowerCase())
        );

        const groupedByDay = this.groupChangesByDay(filtered);

        webview.postMessage({
            type: 'searchResults',
            data: groupedByDay
        });
    }

    private groupChangesByDay(changes: FileChange[]): any[] {
        const groups = new Map<string, FileChange[]>();

        for (const change of changes) {
            const date = new Date(change.timestamp);
            const dateKey = date.toISOString().split('T')[0];

            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(change);
        }

        const result = [];
        for (const [dateKey, dayChanges] of groups.entries()) {
            const date = new Date(dateKey);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let displayDate;
            if (dateKey === today.toISOString().split('T')[0]) {
                displayDate = 'Today';
            } else if (dateKey === yesterday.toISOString().split('T')[0]) {
                displayDate = 'Yesterday';
            } else {
                displayDate = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                });
            }

            result.push({
                date: dateKey,
                displayDate,
                changes: dayChanges.sort((a, b) => b.timestamp - a.timestamp)
            });
        }

        return result.sort((a, b) => b.date.localeCompare(a.date));
    }

    private async viewFile(filePath: string) {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project History</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 24px;
        }

        .header {
            margin-bottom: 24px;
        }

        .header h1 {
            font-size: 24px;
            font-weight: 600;
            background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 16px;
        }

        .toolbar {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
        }

        .search-box {
            flex: 1;
            padding: 8px 12px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            color: var(--vscode-input-foreground);
            font-size: 13px;
        }

        .search-box:focus {
            outline: none;
            border-color: #667EEA;
        }

        .select-box {
            padding: 8px 12px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            color: var(--vscode-input-foreground);
            font-size: 13px;
        }

        .day-group {
            margin-bottom: 32px;
        }

        .day-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        .day-date {
            font-size: 18px;
            font-weight: 600;
        }

        .day-count {
            font-size: 13px;
            opacity: 0.6;
        }

        .change-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .change-card:hover {
            border-color: #667EEA;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
        }

        .change-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .change-time {
            font-size: 11px;
            opacity: 0.6;
        }

        .change-file {
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 4px;
        }

        .change-stats {
            font-size: 12px;
        }

        .change-stats .added {
            color: #4ade80;
        }

        .change-stats .removed {
            color: #f87171;
        }

        .type-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            margin-right: 6px;
        }

        .type-create {
            background: rgba(74, 222, 128, 0.2);
            color: #4ade80;
        }

        .type-modify {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
        }

        .type-delete {
            background: rgba(248, 113, 113, 0.2);
            color: #f87171;
        }

        .empty-state {
            text-align: center;
            padding: 48px 24px;
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📜 Project History</h1>
    </div>

    <div class="toolbar">
        <input
            type="text"
            class="search-box"
            id="searchInput"
            placeholder="Search files..."
            onkeyup="handleSearch(event)"
        />
        <select class="select-box" id="dateRange" onchange="handleDateChange()">
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
        </select>
    </div>

    <div id="historyContent">
        <div class="empty-state">Loading history...</div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'update' || message.type === 'searchResults') {
                renderHistory(message.data);
            }
        });

        function renderHistory(dayGroups) {
            const container = document.getElementById('historyContent');

            if (dayGroups.length === 0) {
                container.innerHTML = '<div class="empty-state">No history found</div>';
                return;
            }

            container.innerHTML = dayGroups.map(function(group) {
                return '<div class="day-group">' +
                    '<div class="day-header">' +
                        '<div class="day-date">📅 ' + group.displayDate + '</div>' +
                        '<div class="day-count">' + group.changes.length + ' changes</div>' +
                    '</div>' +
                    group.changes.map(function(change) { return renderChange(change); }).join('') +
                '</div>';
            }).join('');
        }

        function renderChange(change) {
            const time = new Date(change.timestamp).toLocaleTimeString();
            const fileName = change.file.split('/').pop() || change.file;
            const typeClass = 'type-' + change.type;
            const typeLabel = change.type.charAt(0).toUpperCase() + change.type.slice(1);

            return '<div class="change-card" onclick="viewFile(\'' + change.file + '\')">'+
                '<div class="change-header">' +
                    '<div class="change-time">' + time + '</div>' +
                    '<div class="change-stats">' +
                        '<span class="added">+' + change.diff.added + '</span>' +
                        '<span class="removed">-' + change.diff.removed + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="change-file">' +
                    '<span class="type-badge ' + typeClass + '">' + typeLabel + '</span>' +
                    fileName +
                '</div>' +
            '</div>';
        }

        function handleSearch(event) {
            if (event.key === 'Enter') {
                const query = event.target.value;
                if (query.trim()) {
                    vscode.postMessage({ type: 'search', query });
                } else {
                    handleDateChange();
                }
            }
        }

        function handleDateChange() {
            const days = parseInt(document.getElementById('dateRange').value);
            vscode.postMessage({ type: 'refresh', days });
        }

        function viewFile(filePath) {
            vscode.postMessage({ type: 'viewFile', filePath });
        }

        // Request initial data
        vscode.postMessage({ type: 'refresh', days: 7 });
    </script>
</body>
</html>`;
    }
}
