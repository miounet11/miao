import { BrowserBridge } from '../BrowserBridge';
import { BrowserOptions } from '../IBrowserBridge';

describe('BrowserBridge', () => {
  let bridge: BrowserBridge;

  beforeEach(() => {
    bridge = new BrowserBridge();
  });

  afterEach(async () => {
    if (bridge.getBrowser()) {
      await bridge.close();
    }
  });

  describe('launch', () => {
    it('should launch a browser with default options', async () => {
      const browser = await bridge.launch();
      expect(browser).toBeDefined();
      expect(bridge.getBrowser()).toBe(browser);
      expect(bridge.getPage()).toBeDefined();
    }, 30000);

    it('should launch a browser with custom options', async () => {
      const options: BrowserOptions = {
        headless: true,
        browserType: 'chromium',
        viewport: { width: 1920, height: 1080 },
        timeout: 60000
      };
      const browser = await bridge.launch(options);
      expect(browser).toBeDefined();
    }, 30000);

    it('should close existing browser before launching new one', async () => {
      await bridge.launch();
      const firstBrowser = bridge.getBrowser();
      await bridge.launch();
      const secondBrowser = bridge.getBrowser();
      expect(secondBrowser).not.toBe(firstBrowser);
    }, 30000);
  });

  describe('navigate', () => {
    it('should navigate to a URL', async () => {
      await bridge.launch({ headless: true });
      await bridge.navigate('https://example.com');
      const page = bridge.getPage();
      expect(page).toBeDefined();
      const url = page!.url();
      expect(url).toContain('example.com');
    }, 30000);

    it('should throw error if browser not launched', async () => {
      await expect(bridge.navigate('https://example.com')).rejects.toThrow(
        'Browser not launched'
      );
    });
  });

  describe('click', () => {
    it('should click an element', async () => {
      await bridge.launch({ headless: true });
      await bridge.navigate('https://example.com');
      // Example.com has a link, we can test clicking it
      await bridge.click('a');
      expect(true).toBe(true); // If no error, test passes
    }, 30000);

    it('should throw error if browser not launched', async () => {
      await expect(bridge.click('button')).rejects.toThrow('Browser not launched');
    });
  });

  describe('type', () => {
    it('should type text into an element', async () => {
      await bridge.launch({ headless: true });
      await bridge.navigate('data:text/html,<input id="test" />');
      await bridge.type('#test', 'Hello World');
      const value = await bridge.evaluate('document.querySelector("#test").value');
      expect(value).toBe('Hello World');
    }, 30000);

    it('should throw error if browser not launched', async () => {
      await expect(bridge.type('input', 'text')).rejects.toThrow('Browser not launched');
    });
  });

  describe('screenshot', () => {
    it('should take a screenshot', async () => {
      await bridge.launch({ headless: true });
      await bridge.navigate('https://example.com');
      const path = '/tmp/test-screenshot.png';
      await bridge.screenshot(path);
      expect(true).toBe(true); // If no error, test passes
    }, 30000);

    it('should throw error if browser not launched', async () => {
      await expect(bridge.screenshot('/tmp/test.png')).rejects.toThrow(
        'Browser not launched'
      );
    });
  });

  describe('evaluate', () => {
    it('should evaluate JavaScript', async () => {
      await bridge.launch({ headless: true });
      await bridge.navigate('https://example.com');
      const result = await bridge.evaluate('1 + 1');
      expect(result).toBe(2);
    }, 30000);

    it('should return page title', async () => {
      await bridge.launch({ headless: true });
      await bridge.navigate('https://example.com');
      const title = await bridge.evaluate('document.title');
      expect(title).toContain('Example');
    }, 30000);

    it('should throw error if browser not launched', async () => {
      await expect(bridge.evaluate('1 + 1')).rejects.toThrow('Browser not launched');
    });
  });

  describe('close', () => {
    it('should close browser and page', async () => {
      await bridge.launch({ headless: true });
      expect(bridge.getBrowser()).toBeDefined();
      expect(bridge.getPage()).toBeDefined();
      await bridge.close();
      expect(bridge.getBrowser()).toBeNull();
      expect(bridge.getPage()).toBeNull();
    }, 30000);

    it('should not throw error if browser not launched', async () => {
      await expect(bridge.close()).resolves.not.toThrow();
    });
  });
});
