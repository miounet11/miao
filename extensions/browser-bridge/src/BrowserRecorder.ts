import { Page } from 'playwright';
import { IBrowserBridge } from './IBrowserBridge';

/**
 * Recorded action types
 */
export type ActionType = 'navigate' | 'click' | 'type' | 'screenshot' | 'evaluate';

/**
 * Recorded action
 */
export interface RecordedAction {
  type: ActionType;
  timestamp: number;
  selector?: string;
  value?: string;
  url?: string;
  script?: string;
}

/**
 * Browser Recorder for recording user actions
 */
export class BrowserRecorder {
  private actions: RecordedAction[] = [];
  private isRecording = false;
  private page: Page | null = null;

  constructor(private browserBridge: IBrowserBridge) {}

  /**
   * Start recording browser actions
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    this.page = this.browserBridge.getPage();
    if (!this.page) {
      throw new Error('No active page. Launch browser first.');
    }

    this.actions = [];
    this.isRecording = true;

    // Record navigation
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page!.mainFrame()) {
        this.recordAction({
          type: 'navigate',
          timestamp: Date.now(),
          url: frame.url()
        });
      }
    });

    // Record clicks
    await this.page.exposeFunction('__recordClick', (selector: string) => {
      this.recordAction({
        type: 'click',
        timestamp: Date.now(),
        selector
      });
    });

    // Record typing
    await this.page.exposeFunction('__recordType', (selector: string, value: string) => {
      this.recordAction({
        type: 'type',
        timestamp: Date.now(),
        selector,
        value
      });
    });

    // Inject recording script
    await this.page.addInitScript(`
      // Record clicks
      document.addEventListener('click', (e) => {
        const target = e.target;
        const selector = getSelector(target);
        if (selector && window.__recordClick) {
          window.__recordClick(selector);
        }
      }, true);

      // Record input changes
      document.addEventListener('input', (e) => {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          const selector = getSelector(target);
          if (selector && window.__recordType) {
            window.__recordType(selector, target.value);
          }
        }
      }, true);

      // Helper to generate CSS selector
      function getSelector(element) {
        if (element.id) {
          return '#' + element.id;
        }

        if (element.className) {
          const classes = element.className.split(' ').filter(c => c).join('.');
          if (classes) {
            return element.tagName.toLowerCase() + '.' + classes;
          }
        }

        // Use nth-child as fallback
        const parent = element.parentElement;
        if (parent) {
          const index = Array.from(parent.children).indexOf(element) + 1;
          return getSelector(parent) + ' > ' + element.tagName.toLowerCase() + ':nth-child(' + index + ')';
        }

        return element.tagName.toLowerCase();
      }
    `);
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    this.isRecording = false;
    this.page = null;
  }

  /**
   * Get recorded actions
   */
  getActions(): RecordedAction[] {
    return [...this.actions];
  }

  /**
   * Clear recorded actions
   */
  clearActions(): void {
    this.actions = [];
  }

  /**
   * Generate Playwright test script from recordings
   */
  generatePlaywrightScript(): string {
    const lines: string[] = [
      "import { test, expect } from '@playwright/test';",
      '',
      "test('recorded test', async ({ page }) => {"
    ];

    for (const action of this.actions) {
      switch (action.type) {
        case 'navigate':
          lines.push(`  await page.goto('${action.url}');`);
          break;
        case 'click':
          lines.push(`  await page.click('${action.selector}');`);
          break;
        case 'type':
          lines.push(`  await page.fill('${action.selector}', '${action.value}');`);
          break;
        case 'screenshot':
          lines.push(`  await page.screenshot({ path: 'screenshot.png' });`);
          break;
        case 'evaluate':
          lines.push(`  await page.evaluate(() => { ${action.script} });`);
          break;
      }
    }

    lines.push('});');
    return lines.join('\n');
  }

  /**
   * Generate TypeScript code from recordings
   */
  generateTypeScriptCode(): string {
    const lines: string[] = [
      "import { BrowserBridge } from './BrowserBridge';",
      '',
      'async function runRecordedActions() {',
      '  const bridge = new BrowserBridge();',
      '  await bridge.launch({ headless: false });',
      ''
    ];

    for (const action of this.actions) {
      switch (action.type) {
        case 'navigate':
          lines.push(`  await bridge.navigate('${action.url}');`);
          break;
        case 'click':
          lines.push(`  await bridge.click('${action.selector}');`);
          break;
        case 'type':
          lines.push(`  await bridge.type('${action.selector}', '${action.value}');`);
          break;
        case 'screenshot':
          lines.push(`  await bridge.screenshot('screenshot.png');`);
          break;
        case 'evaluate':
          lines.push(`  await bridge.evaluate('${action.script}');`);
          break;
      }
    }

    lines.push('', '  await bridge.close();', '}', '', 'runRecordedActions();');
    return lines.join('\n');
  }

  /**
   * Export as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(this.actions, null, 2);
  }

  /**
   * Import from JSON
   */
  importFromJSON(json: string): void {
    this.actions = JSON.parse(json);
  }

  /**
   * Record an action
   */
  private recordAction(action: RecordedAction): void {
    if (this.isRecording) {
      this.actions.push(action);
    }
  }
}
