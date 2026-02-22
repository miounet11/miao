import { Browser, Page } from 'playwright';

/**
 * Browser launch options
 */
export interface BrowserOptions {
  headless?: boolean;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  viewport?: {
    width: number;
    height: number;
  };
  timeout?: number;
}

/**
 * Browser Bridge interface for browser automation
 */
export interface IBrowserBridge {
  /**
   * Launch a browser instance
   */
  launch(options?: BrowserOptions): Promise<Browser>;

  /**
   * Navigate to a URL
   */
  navigate(url: string): Promise<void>;

  /**
   * Click an element by selector
   */
  click(selector: string): Promise<void>;

  /**
   * Type text into an element
   */
  type(selector: string, text: string): Promise<void>;

  /**
   * Take a screenshot
   */
  screenshot(path: string): Promise<void>;

  /**
   * Evaluate JavaScript in the browser context
   */
  evaluate(script: string): Promise<any>;

  /**
   * Close the browser
   */
  close(): Promise<void>;

  /**
   * Get the current page instance
   */
  getPage(): Page | null;

  /**
   * Get the current browser instance
   */
  getBrowser(): Browser | null;
}
