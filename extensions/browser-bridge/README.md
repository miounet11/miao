# Browser Bridge Extension

Browser automation capabilities powered by Playwright for Miaoda IDE.

## Features

- **Browser Automation**: Launch and control browsers (Chromium, Firefox, WebKit)
- **Action Recording**: Record user interactions and generate test scripts
- **Screenshot Capture**: Take full-page screenshots
- **Script Evaluation**: Execute JavaScript in browser context
- **Multiple Export Formats**: Export recordings as Playwright tests, TypeScript code, or JSON

## Commands

### `miaoda.browser.launch`
Launch a browser instance with customizable options:
- Browser type (Chromium, Firefox, WebKit)
- Headless or headed mode
- Custom viewport size
- Configurable timeout

### `miaoda.browser.record`
Record browser actions and export them:
- **Start Recording**: Begin capturing user interactions
- **Stop Recording**: End the recording session
- **Export Recording**: Save as Playwright test, TypeScript code, or JSON

### `miaoda.browser.screenshot`
Capture full-page screenshots:
- Save to custom location
- Supports PNG, JPG, JPEG formats
- Optional preview after capture

### `miaoda.browser.close`
Close the active browser instance and clean up resources.

## Architecture

### IBrowserBridge Interface
Defines the contract for browser automation operations:
- `launch(options)`: Initialize browser with options
- `navigate(url)`: Navigate to URL
- `click(selector)`: Click element by CSS selector
- `type(selector, text)`: Type text into element
- `screenshot(path)`: Capture screenshot
- `evaluate(script)`: Execute JavaScript
- `close()`: Close browser

### BrowserBridge Implementation
Core implementation using Playwright:
- Browser instance management
- Page context handling
- Automatic retry with exponential backoff
- Error handling and validation
- Support for multiple browser engines

### BrowserRecorder
Records user actions for test generation:
- Captures clicks, typing, and navigation
- Generates CSS selectors automatically
- Exports to multiple formats:
  - Playwright test scripts
  - TypeScript automation code
  - JSON action logs

## Usage Examples

### Basic Browser Automation
```typescript
import { BrowserBridge } from './BrowserBridge';

const bridge = new BrowserBridge();

// Launch browser
await bridge.launch({
  headless: false,
  browserType: 'chromium',
  viewport: { width: 1280, height: 720 }
});

// Navigate and interact
await bridge.navigate('https://example.com');
await bridge.click('button#submit');
await bridge.type('input#search', 'test query');

// Take screenshot
await bridge.screenshot('/path/to/screenshot.png');

// Execute JavaScript
const title = await bridge.evaluate('document.title');

// Close browser
await bridge.close();
```

### Recording Actions
```typescript
import { BrowserBridge } from './BrowserBridge';
import { BrowserRecorder } from './BrowserRecorder';

const bridge = new BrowserBridge();
const recorder = new BrowserRecorder(bridge);

// Launch and start recording
await bridge.launch({ headless: false });
await recorder.startRecording();

// Perform actions (will be recorded)
await bridge.navigate('https://example.com');
await bridge.click('a.link');
await bridge.type('input', 'test');

// Stop and export
recorder.stopRecording();
const playwrightScript = recorder.generatePlaywrightScript();
const typescriptCode = recorder.generateTypeScriptCode();
const json = recorder.exportAsJSON();
```

## Testing

The extension includes comprehensive test coverage:

```bash
npm test
```

Test suites:
- `BrowserBridge.test.ts`: Tests for core browser automation
- `BrowserRecorder.test.ts`: Tests for action recording and export

## Dependencies

- **playwright**: Browser automation library
- **@types/vscode**: VS Code extension API types
- **jest**: Testing framework
- **typescript**: TypeScript compiler

## Development

### Build
```bash
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Run Tests
```bash
npm test
```

## Error Handling

The extension includes robust error handling:
- Automatic retry with exponential backoff (up to 3 attempts)
- Validation of browser state before operations
- User-friendly error messages
- Graceful cleanup on failures

## Browser Support

- **Chromium**: Full support (default)
- **Firefox**: Full support
- **WebKit**: Full support

## Configuration

Browser options can be customized:
```typescript
interface BrowserOptions {
  headless?: boolean;           // Default: false
  browserType?: 'chromium' | 'firefox' | 'webkit';  // Default: 'chromium'
  viewport?: {                  // Default: 1280x720
    width: number;
    height: number;
  };
  timeout?: number;             // Default: 30000ms
}
```

## License

Part of Miaoda IDE.
