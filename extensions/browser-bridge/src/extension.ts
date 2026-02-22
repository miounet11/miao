import * as vscode from 'vscode';
import { BrowserBridge } from './BrowserBridge';
import { BrowserRecorder } from './BrowserRecorder';
import { BrowserOptions } from './IBrowserBridge';

let browserBridge: BrowserBridge | null = null;
let browserRecorder: BrowserRecorder | null = null;

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Browser Bridge extension is now active');

  // Register launch command
  const launchBrowserCommand = vscode.commands.registerCommand(
    'miaoda.browser.launch',
    async () => {
      try {
        // Get options from user
        const headless = await vscode.window.showQuickPick(['Yes', 'No'], {
          placeHolder: 'Run browser in headless mode?'
        });

        if (headless === undefined) {
          return;
        }

        const browserType = await vscode.window.showQuickPick(
          ['chromium', 'firefox', 'webkit'],
          {
            placeHolder: 'Select browser type'
          }
        );

        if (!browserType) {
          return;
        }

        const options: BrowserOptions = {
          headless: headless === 'Yes',
          browserType: browserType as 'chromium' | 'firefox' | 'webkit',
          viewport: { width: 1280, height: 720 },
          timeout: 30000
        };

        // Create bridge if not exists
        if (!browserBridge) {
          browserBridge = new BrowserBridge();
        }

        // Launch browser
        await browserBridge.launch(options);
        vscode.window.showInformationMessage(
          `Browser launched successfully (${browserType}, headless: ${headless})`
        );

        // Prompt for URL
        const url = await vscode.window.showInputBox({
          prompt: 'Enter URL to navigate to (optional)',
          placeHolder: 'https://example.com'
        });

        if (url) {
          await browserBridge.navigate(url);
          vscode.window.showInformationMessage(`Navigated to ${url}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to launch browser: ${(error as Error).message}`
        );
      }
    }
  );

  // Register record command
  const recordBrowserCommand = vscode.commands.registerCommand(
    'miaoda.browser.record',
    async () => {
      try {
        if (!browserBridge || !browserBridge.getBrowser()) {
          vscode.window.showWarningMessage('Please launch browser first');
          return;
        }

        if (!browserRecorder) {
          browserRecorder = new BrowserRecorder(browserBridge);
        }

        const action = await vscode.window.showQuickPick(['Start Recording', 'Stop Recording', 'Export Recording'], {
          placeHolder: 'Select recording action'
        });

        if (!action) {
          return;
        }

        if (action === 'Start Recording') {
          await browserRecorder.startRecording();
          vscode.window.showInformationMessage('Recording started');
        } else if (action === 'Stop Recording') {
          browserRecorder.stopRecording();
          const actions = browserRecorder.getActions();
          vscode.window.showInformationMessage(
            `Recording stopped. ${actions.length} actions recorded.`
          );
        } else if (action === 'Export Recording') {
          const format = await vscode.window.showQuickPick(
            ['Playwright Test', 'TypeScript Code', 'JSON'],
            {
              placeHolder: 'Select export format'
            }
          );

          if (!format) {
            return;
          }

          let content = '';
          let extension = '';

          if (format === 'Playwright Test') {
            content = browserRecorder.generatePlaywrightScript();
            extension = '.spec.ts';
          } else if (format === 'TypeScript Code') {
            content = browserRecorder.generateTypeScriptCode();
            extension = '.ts';
          } else {
            content = browserRecorder.exportAsJSON();
            extension = '.json';
          }

          // Create new document with content
          const doc = await vscode.workspace.openTextDocument({
            content,
            language: extension === '.json' ? 'json' : 'typescript'
          });
          await vscode.window.showTextDocument(doc);
          vscode.window.showInformationMessage('Recording exported');
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Recording error: ${(error as Error).message}`
        );
      }
    }
  );

  // Register screenshot command
  const screenshotCommand = vscode.commands.registerCommand(
    'miaoda.browser.screenshot',
    async () => {
      try {
        if (!browserBridge || !browserBridge.getBrowser()) {
          vscode.window.showWarningMessage('Please launch browser first');
          return;
        }

        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file('screenshot.png'),
          filters: {
            'Images': ['png', 'jpg', 'jpeg']
          }
        });

        if (!uri) {
          return;
        }

        await browserBridge.screenshot(uri.fsPath);
        vscode.window.showInformationMessage(`Screenshot saved to ${uri.fsPath}`);

        // Ask if user wants to open the screenshot
        const open = await vscode.window.showQuickPick(['Yes', 'No'], {
          placeHolder: 'Open screenshot?'
        });

        if (open === 'Yes') {
          await vscode.commands.executeCommand('vscode.open', uri);
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Screenshot error: ${(error as Error).message}`
        );
      }
    }
  );

  // Register close command
  const closeBrowserCommand = vscode.commands.registerCommand(
    'miaoda.browser.close',
    async () => {
      try {
        if (!browserBridge) {
          vscode.window.showInformationMessage('No browser to close');
          return;
        }

        await browserBridge.close();
        browserBridge = null;
        browserRecorder = null;
        vscode.window.showInformationMessage('Browser closed');
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to close browser: ${(error as Error).message}`
        );
      }
    }
  );

  context.subscriptions.push(
    launchBrowserCommand,
    recordBrowserCommand,
    screenshotCommand,
    closeBrowserCommand
  );
}

/**
 * Extension deactivation
 */
export async function deactivate(): Promise<void> {
  console.log('Browser Bridge extension is now deactivated');
  if (browserBridge) {
    await browserBridge.close();
    browserBridge = null;
  }
  browserRecorder = null;
}
