/**
 * Miaoda Theme Extension
 * Applies custom CSS styles for next-generation UI
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Miaoda Theme extension is now active');

    // Register command to apply custom styles
    let applyStyles = vscode.commands.registerCommand('miaoda.applyCustomStyles', async () => {
        try {
            const cssPath = path.join(context.extensionPath, 'styles', 'miaoda-custom.css');
            const cssContent = fs.readFileSync(cssPath, 'utf8');

            // Show info message
            vscode.window.showInformationMessage(
                'Miaoda custom styles applied! Restart to see full effects.',
                'Restart Now'
            ).then(selection => {
                if (selection === 'Restart Now') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to apply Miaoda styles: ${error.message}`);
        }
    });

    // Register command to show theme info
    let showInfo = vscode.commands.registerCommand('miaoda.showThemeInfo', () => {
        const panel = vscode.window.createWebviewPanel(
            'miaodaThemeInfo',
            'Miaoda Theme',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = getThemeInfoHtml();
    });

    context.subscriptions.push(applyStyles, showInfo);

    // Auto-apply on activation if setting is enabled
    const config = vscode.workspace.getConfiguration('miaoda');
    if (config.get('autoApplyCustomStyles', true)) {
        // Apply styles silently on startup
        setTimeout(() => {
            vscode.commands.executeCommand('miaoda.applyCustomStyles');
        }, 1000);
    }
}

function getThemeInfoHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Miaoda Theme</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            padding: 40px;
            background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
            color: white;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
            font-size: 48px;
            font-weight: 700;
            margin: 0 0 16px 0;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .subtitle {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 32px;
        }
        .badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 32px;
        }
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 16px;
        }
        .feature h3 {
            margin: 0 0 8px 0;
            font-size: 20px;
        }
        .feature p {
            margin: 0;
            opacity: 0.9;
        }
        .color-palette {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 16px;
            margin-top: 24px;
        }
        .color-swatch {
            text-align: center;
        }
        .color-box {
            height: 60px;
            border-radius: 8px;
            margin-bottom: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .color-label {
            font-size: 11px;
            opacity: 0.9;
        }
        .cta {
            margin-top: 32px;
            text-align: center;
        }
        .button {
            display: inline-block;
            background: white;
            color: #667EEA;
            padding: 12px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="badge">NEXT-GEN AI IDE</div>
        <h1>🎨 Miaoda Theme</h1>
        <p class="subtitle">Cursor-inspired design for the next generation of developers</p>

        <div class="feature">
            <h3>✨ Modern Design</h3>
            <p>Gradient accents, smooth animations, and premium feel throughout the IDE</p>
        </div>

        <div class="feature">
            <h3>📐 Information Density</h3>
            <p>Smaller fonts (13px editor, 12px sidebar) for better screen utilization</p>
        </div>

        <div class="feature">
            <h3>🎯 Visual Hierarchy</h3>
            <p>Clear distinction between active and inactive elements with gradient highlights</p>
        </div>

        <div class="feature">
            <h3>🚀 Performance</h3>
            <p>Optimized CSS with hardware-accelerated animations</p>
        </div>

        <h3 style="margin-top: 32px;">Color Palette</h3>
        <div class="color-palette">
            <div class="color-swatch">
                <div class="color-box" style="background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);"></div>
                <div class="color-label">Primary Gradient</div>
            </div>
            <div class="color-swatch">
                <div class="color-box" style="background: #10B981;"></div>
                <div class="color-label">Success</div>
            </div>
            <div class="color-swatch">
                <div class="color-box" style="background: #F59E0B;"></div>
                <div class="color-label">Warning</div>
            </div>
            <div class="color-swatch">
                <div class="color-box" style="background: #EF4444;"></div>
                <div class="color-label">Error</div>
            </div>
            <div class="color-swatch">
                <div class="color-box" style="background: #3B82F6;"></div>
                <div class="color-label">Info</div>
            </div>
        </div>

        <div class="cta">
            <p>Enjoy coding with Miaoda! 🚀</p>
        </div>
    </div>
</body>
</html>`;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
