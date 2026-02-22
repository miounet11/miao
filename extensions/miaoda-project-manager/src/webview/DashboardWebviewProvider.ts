import * as vscode from 'vscode';
import { ProjectManager } from '../managers/ProjectManager';

export class DashboardWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'miaoda.projectDashboard';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly projectManager: ProjectManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'refresh':
                    await this.refresh();
                    break;
                case 'viewHistory':
                    vscode.commands.executeCommand('miaoda.project.history');
                    break;
                case 'optimize':
                    vscode.commands.executeCommand('miaoda.project.optimize');
                    break;
            }
        });

        // Initial data load
        this.refresh();

        // Auto-refresh every 30 seconds
        setInterval(() => this.refresh(), 30000);
    }

    public async refresh() {
        if (this._view) {
            const stats = await this.projectManager.getProjectStats();
            const storageStats = await this.projectManager.getStorageStats();
            const recentChanges = await this.projectManager.getRecentChanges(5);
            const session = await this.projectManager.getSessionManager().getCurrentSession();

            this._view.webview.postMessage({
                type: 'update',
                data: {
                    stats,
                    storageStats,
                    recentChanges,
                    session
                }
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Miaoda Dashboard</title>
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
            padding: 16px;
        }

        .header {
            margin-bottom: 20px;
        }

        .header h1 {
            font-size: 18px;
            font-weight: 600;
            background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
        }

        .card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
            transition: border-color 0.2s;
        }

        .card:hover {
            border-color: #667EEA;
        }

        .card-title {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 10px;
            opacity: 0.9;
        }

        .stat-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .stat-label {
            font-size: 11px;
            opacity: 0.7;
        }

        .stat-value {
            font-size: 16px;
            font-weight: 600;
            background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .change-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-size: 12px;
        }

        .change-item:last-child {
            border-bottom: none;
        }

        .change-file {
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 1;
        }

        .change-stats {
            font-size: 11px;
            opacity: 0.7;
            margin-left: 8px;
        }

        .change-stats .added {
            color: #4ade80;
        }

        .change-stats .removed {
            color: #f87171;
        }

        .progress-bar {
            width: 100%;
            height: 6px;
            background: var(--vscode-input-background);
            border-radius: 3px;
            overflow: hidden;
            margin-top: 8px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667EEA 0%, #764BA2 100%);
            transition: width 0.3s ease;
        }

        .btn {
            width: 100%;
            padding: 8px;
            background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: opacity 0.2s;
        }

        .btn:hover {
            opacity: 0.9;
        }

        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            margin-top: 8px;
        }

        .empty-state {
            text-align: center;
            padding: 20px;
            opacity: 0.6;
            font-size: 12px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 12px;
        }

        .info-label {
            opacity: 0.7;
        }

        .info-value {
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Project Dashboard</h1>
    </div>

    <div class="card">
        <div class="card-title">📈 Statistics</div>
        <div class="stat-grid" id="statsGrid">
            <div class="stat-item">
                <span class="stat-label">Files Modified</span>
                <span class="stat-value" id="totalFiles">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Changes</span>
                <span class="stat-value" id="totalChanges">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Active Time</span>
                <span class="stat-value" id="activeTime">0h 0m</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Storage Used</span>
                <span class="stat-value" id="storageUsed">0 MB</span>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-title">💾 Storage</div>
        <div class="info-row">
            <span class="info-label">Total Size</span>
            <span class="info-value" id="totalSize">0 MB</span>
        </div>
        <div class="info-row">
            <span class="info-label">History</span>
            <span class="info-value" id="historySize">0 MB</span>
        </div>
        <div class="info-row">
            <span class="info-label">Cache</span>
            <span class="info-value" id="cacheSize">0 MB</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" id="storageProgress" style="width: 0%"></div>
        </div>
    </div>

    <div class="card">
        <div class="card-title">📝 Recent Changes</div>
        <div id="recentChanges">
            <div class="empty-state">No recent changes</div>
        </div>
    </div>

    <button class="btn" onclick="viewHistory()">📜 View Full History</button>
    <button class="btn btn-secondary" onclick="optimize()">⚡ Optimize Storage</button>

    <script>
        const vscode = acquireVsCodeApi();

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'update') {
                updateDashboard(message.data);
            }
        });

        function updateDashboard(data) {
            // Update statistics
            document.getElementById('totalFiles').textContent = data.stats.totalFiles;
            document.getElementById('totalChanges').textContent = data.stats.totalChanges;
            document.getElementById('activeTime').textContent = formatDuration(data.stats.activeTime);
            document.getElementById('storageUsed').textContent = formatBytes(data.storageStats.totalSize);

            // Update storage info
            document.getElementById('totalSize').textContent = formatBytes(data.storageStats.totalSize);
            document.getElementById('historySize').textContent = formatBytes(data.storageStats.historySize);
            document.getElementById('cacheSize').textContent = formatBytes(data.storageStats.cacheSize);

            const storagePercent = Math.min((data.storageStats.totalSize / (2 * 1024 * 1024 * 1024)) * 100, 100);
            document.getElementById('storageProgress').style.width = storagePercent + '%';

            // Update recent changes
            const changesContainer = document.getElementById('recentChanges');
            if (data.recentChanges.length === 0) {
                changesContainer.innerHTML = '<div class="empty-state">No recent changes</div>';
            } else {
                changesContainer.innerHTML = data.recentChanges.map(function(change) {
                    return '<div class="change-item">' +
                        '<div class="change-file" title="' + change.file + '">' + getFileName(change.file) + '</div>' +
                        '<div class="change-stats">' +
                            '<span class="added">+' + change.diff.added + '</span>' +
                            '<span class="removed">-' + change.diff.removed + '</span>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
        }

        function formatDuration(ms) {
            const hours = Math.floor(ms / (1000 * 60 * 60));
            const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            return hours + 'h ' + minutes + 'm';
        }

        function getFileName(filePath) {
            return filePath.split('/').pop() || filePath;
        }

        function viewHistory() {
            vscode.postMessage({ type: 'viewHistory' });
        }

        function optimize() {
            vscode.postMessage({ type: 'optimize' });
        }

        // Request initial data
        vscode.postMessage({ type: 'refresh' });
    </script>
</body>
</html>`;
    }
}
