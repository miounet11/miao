import { Browser, Page, chromium, firefox, webkit } from 'playwright';
import { IBrowserBridge, BrowserOptions } from './IBrowserBridge';

/**
 * Browser Bridge implementation using Playwright
 */
export class BrowserBridge implements IBrowserBridge {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private defaultTimeout = 30000;
  private maxRetries = 3;

  /**
   * Launch a browser instance
   */
  async launch(options: BrowserOptions = {}): Promise<Browser> {
    const {
      headless = false,
      browserType = 'chromium',
      viewport = { width: 1280, height: 720 },
      timeout = this.defaultTimeout
    } = options;

    this.defaultTimeout = timeout;

    // Close existing browser if any
    if (this.browser) {
      await this.close();
    }

    // Select browser type
    const browserEngine = this.getBrowserEngine(browserType);

    // Launch browser
    this.browser = await browserEngine.launch({
      headless,
      timeout
    });

    // Create a new page
    this.page = await this.browser.newPage({
      viewport
    });

    // Set default timeout
    this.page.setDefaultTimeout(timeout);

    return this.browser;
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<void> {
    this.ensurePageExists();
    await this.retryOperation(async () => {
      await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
    }, `navigate to ${url}`);
  }

  /**
   * Click an element by selector
   */
  async click(selector: string): Promise<void> {
    this.ensurePageExists();
    await this.retryOperation(async () => {
      await this.page!.waitForSelector(selector, { state: 'visible' });
      await this.page!.click(selector);
    }, `click ${selector}`);
  }

  /**
   * Type text into an element
   */
  async type(selector: string, text: string): Promise<void> {
    this.ensurePageExists();
    await this.retryOperation(async () => {
      await this.page!.waitForSelector(selector, { state: 'visible' });
      await this.page!.fill(selector, text);
    }, `type into ${selector}`);
  }

  /**
   * Take a screenshot
   */
  async screenshot(path: string): Promise<void> {
    this.ensurePageExists();
    await this.retryOperation(async () => {
      await this.page!.screenshot({ path, fullPage: true });
    }, `take screenshot at ${path}`);
  }

  /**
   * Evaluate JavaScript in the browser context
   */
  async evaluate(script: string): Promise<any> {
    this.ensurePageExists();
    return await this.retryOperation(async () => {
      return await this.page!.evaluate(script);
    }, `evaluate script`);
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Get the current page instance
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get the current browser instance
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Get browser engine based on type
   */
  private getBrowserEngine(browserType: 'chromium' | 'firefox' | 'webkit') {
    switch (browserType) {
      case 'firefox':
        return firefox;
      case 'webkit':
        return webkit;
      case 'chromium':
      default:
        return chromium;
    }
  }

  /**
   * Ensure page exists before operations
   */
  private ensurePageExists(): void {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(
            `Attempt ${attempt} failed for ${operationName}: ${lastError.message}. Retrying in ${delay}ms...`
          );
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `Failed to ${operationName} after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
