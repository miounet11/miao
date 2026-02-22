import { BrowserBridge } from '../BrowserBridge';
import { BrowserRecorder } from '../BrowserRecorder';

describe('BrowserRecorder', () => {
  let bridge: BrowserBridge;
  let recorder: BrowserRecorder;

  beforeEach(() => {
    bridge = new BrowserBridge();
    recorder = new BrowserRecorder(bridge);
  });

  afterEach(async () => {
    if (bridge.getBrowser()) {
      await bridge.close();
    }
  });

  describe('startRecording', () => {
    it('should start recording', async () => {
      await bridge.launch({ headless: true });
      await recorder.startRecording();
      expect(recorder.getActions()).toEqual([]);
    }, 30000);

    it('should throw error if browser not launched', async () => {
      await expect(recorder.startRecording()).rejects.toThrow('No active page');
    });

    it('should throw error if already recording', async () => {
      await bridge.launch({ headless: true });
      await recorder.startRecording();
      await expect(recorder.startRecording()).rejects.toThrow(
        'Recording is already in progress'
      );
    }, 30000);
  });

  describe('stopRecording', () => {
    it('should stop recording', async () => {
      await bridge.launch({ headless: true });
      await recorder.startRecording();
      recorder.stopRecording();
      expect(true).toBe(true); // If no error, test passes
    }, 30000);
  });

  describe('getActions', () => {
    it('should return empty array initially', () => {
      expect(recorder.getActions()).toEqual([]);
    });

    it('should record navigation', async () => {
      await bridge.launch({ headless: true });
      await recorder.startRecording();
      await bridge.navigate('https://example.com');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for recording
      const actions = recorder.getActions();
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].type).toBe('navigate');
      expect(actions[0].url).toContain('example.com');
    }, 30000);
  });

  describe('clearActions', () => {
    it('should clear all actions', async () => {
      await bridge.launch({ headless: true });
      await recorder.startRecording();
      await bridge.navigate('https://example.com');
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(recorder.getActions().length).toBeGreaterThan(0);
      recorder.clearActions();
      expect(recorder.getActions()).toEqual([]);
    }, 30000);
  });

  describe('generatePlaywrightScript', () => {
    it('should generate Playwright test script', async () => {
      await bridge.launch({ headless: true });
      await recorder.startRecording();
      await bridge.navigate('https://example.com');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const script = recorder.generatePlaywrightScript();
      expect(script).toContain("import { test, expect } from '@playwright/test'");
      expect(script).toContain("test('recorded test'");
      expect(script).toContain('page.goto');
    }, 30000);
  });

  describe('generateTypeScriptCode', () => {
    it('should generate TypeScript code', async () => {
      await bridge.launch({ headless: true });
      await recorder.startRecording();
      await bridge.navigate('https://example.com');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const code = recorder.generateTypeScriptCode();
      expect(code).toContain('import { BrowserBridge }');
      expect(code).toContain('bridge.launch');
      expect(code).toContain('bridge.navigate');
    }, 30000);
  });

  describe('exportAsJSON', () => {
    it('should export actions as JSON', async () => {
      await bridge.launch({ headless: true });
      await recorder.startRecording();
      await bridge.navigate('https://example.com');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const json = recorder.exportAsJSON();
      expect(json).toBeTruthy();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
    }, 30000);
  });

  describe('importFromJSON', () => {
    it('should import actions from JSON', () => {
      const actions = [
        { type: 'navigate' as const, timestamp: Date.now(), url: 'https://example.com' },
        { type: 'click' as const, timestamp: Date.now(), selector: 'button' }
      ];
      const json = JSON.stringify(actions);
      recorder.importFromJSON(json);
      expect(recorder.getActions()).toEqual(actions);
    });
  });
});
