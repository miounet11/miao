import * as vscode from 'vscode';

export class LanguageSelector {
    constructor(private context: vscode.ExtensionContext) {}

    async showLanguageSelection() {
        const panel = vscode.window.createWebviewPanel(
            'miaodaLanguageSelector',
            'Welcome to Miaoda IDE',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getLanguageSelectorHtml();

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'selectLanguage') {
                    await this.setLanguage(message.language);
                    await this.markLanguageAsSelected();
                    panel.dispose();

                    // Show restart prompt
                    const restart = await vscode.window.showInformationMessage(
                        'Language changed. Restart Miaoda IDE to apply the new language?',
                        'Restart Now',
                        'Later'
                    );

                    if (restart === 'Restart Now') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private getLanguageSelectorHtml(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Select Language</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
            color: white;
            overflow-x: hidden;
        }

        .container {
            text-align: center;
            max-width: 800px;
            width: 90%;
            padding: 60px 40px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .logo {
            font-size: 64px;
            margin-bottom: 16px;
            animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-10px);
            }
        }

        h1 {
            font-size: 48px;
            font-weight: 700;
            margin: 0 0 16px 0;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            letter-spacing: -0.5px;
        }

        .subtitle {
            font-size: 18px;
            opacity: 0.95;
            margin-bottom: 50px;
            line-height: 1.6;
        }

        .language-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
            margin-top: 40px;
            margin-bottom: 40px;
        }

        .language-card {
            background: rgba(255, 255, 255, 0.15);
            padding: 40px 30px;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 3px solid transparent;
            position: relative;
            overflow: hidden;
        }

        .language-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .language-card:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-8px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
        }

        .language-card:hover::before {
            opacity: 1;
        }

        .language-card.selected {
            background: rgba(255, 255, 255, 0.35);
            border-color: white;
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .language-card.selected::after {
            content: '✓';
            position: absolute;
            top: 12px;
            right: 12px;
            width: 28px;
            height: 28px;
            background: white;
            color: #667EEA;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
        }

        .flag {
            font-size: 56px;
            margin-bottom: 16px;
            display: block;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        .language-name {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 6px;
            position: relative;
            z-index: 1;
        }

        .language-native {
            font-size: 15px;
            opacity: 0.85;
            position: relative;
            z-index: 1;
        }

        .continue-btn {
            margin-top: 40px;
            padding: 18px 56px;
            font-size: 16px;
            font-weight: 600;
            background: white;
            color: #667EEA;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-transform: uppercase;
            letter-spacing: 1.5px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .continue-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
            background: #f8f9fa;
        }

        .continue-btn:active:not(:disabled) {
            transform: translateY(0);
        }

        .continue-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .footer {
            margin-top: 30px;
            font-size: 14px;
            opacity: 0.7;
        }

        @media (max-width: 768px) {
            .container {
                padding: 40px 24px;
            }

            h1 {
                font-size: 36px;
            }

            .language-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }

            .language-card {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎨</div>
        <h1>Miaoda IDE</h1>
        <p class="subtitle">
            Choose your language / 选择语言 / 言語を選択
        </p>

        <div class="language-grid">
            <div class="language-card" data-lang="en" onclick="selectLanguage('en')">
                <span class="flag">🇺🇸</span>
                <div class="language-name">English</div>
                <div class="language-native">English</div>
            </div>

            <div class="language-card" data-lang="zh-cn" onclick="selectLanguage('zh-cn')">
                <span class="flag">🇨🇳</span>
                <div class="language-name">Chinese</div>
                <div class="language-native">中文（简体）</div>
            </div>

            <div class="language-card" data-lang="ja" onclick="selectLanguage('ja')">
                <span class="flag">🇯🇵</span>
                <div class="language-name">Japanese</div>
                <div class="language-native">日本語</div>
            </div>
        </div>

        <button class="continue-btn" id="continueBtn" disabled onclick="confirmLanguage()">
            Continue
        </button>

        <div class="footer">
            You can change this later in Settings
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let selectedLanguage = null;

        function selectLanguage(lang) {
            selectedLanguage = lang;

            // Update UI
            document.querySelectorAll('.language-card').forEach(card => {
                card.classList.remove('selected');
            });
            document.querySelector(\`[data-lang="\${lang}"\`).classList.add('selected');

            // Enable button
            document.getElementById('continueBtn').disabled = false;
        }

        function confirmLanguage() {
            if (selectedLanguage) {
                vscode.postMessage({
                    command: 'selectLanguage',
                    language: selectedLanguage
                });
            }
        }

        // Auto-select English by default after 2 seconds if no selection
        setTimeout(() => {
            if (!selectedLanguage) {
                selectLanguage('en');
            }
        }, 2000);
    </script>
</body>
</html>
        `;
    }

    private async setLanguage(language: string): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        await config.update(
            'locale',
            language,
            vscode.ConfigurationTarget.Global
        );
    }

    private async markLanguageAsSelected(): Promise<void> {
        const config = vscode.workspace.getConfiguration('miaoda.welcome');
        await config.update(
            'languageSelected',
            true,
            vscode.ConfigurationTarget.Global
        );
    }
}
