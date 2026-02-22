/**
 * Basic usage examples for Browser Bridge
 */

import { BrowserBridge } from '../src/BrowserBridge';
import { BrowserRecorder } from '../src/BrowserRecorder';

/**
 * Example 1: Basic browser automation
 */
async function basicAutomation() {
  const bridge = new BrowserBridge();

  try {
    // Launch browser
    await bridge.launch({
      headless: false,
      browserType: 'chromium',
      viewport: { width: 1280, height: 720 },
      timeout: 30000
    });

    // Navigate to a website
    await bridge.navigate('https://example.com');

    // Take a screenshot
    await bridge.screenshot('./example-screenshot.png');

    // Evaluate JavaScript
    const title = await bridge.evaluate('document.title');
    console.log('Page title:', title);

    // Close browser
    await bridge.close();
  } catch (error) {
    console.error('Error:', error);
    await bridge.close();
  }
}

/**
 * Example 2: Form interaction
 */
async function formInteraction() {
  const bridge = new BrowserBridge();

  try {
    await bridge.launch({ headless: false });

    // Navigate to a form page
    await bridge.navigate('https://example.com/form');

    // Fill out form fields
    await bridge.type('#name', 'John Doe');
    await bridge.type('#email', 'john@example.com');
    await bridge.type('#message', 'Hello, this is a test message!');

    // Click submit button
    await bridge.click('button[type="submit"]');

    // Wait a bit for submission
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot of result
    await bridge.screenshot('./form-result.png');

    await bridge.close();
  } catch (error) {
    console.error('Error:', error);
    await bridge.close();
  }
}

/**
 * Example 3: Recording and exporting actions
 */
async function recordActions() {
  const bridge = new BrowserBridge();
  const recorder = new BrowserRecorder(bridge);

  try {
    // Launch browser
    await bridge.launch({ headless: false });

    // Start recording
    await recorder.startRecording();
    console.log('Recording started...');

    // Perform actions (these will be recorded)
    await bridge.navigate('https://example.com');
    await bridge.click('a');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Stop recording
    recorder.stopRecording();
    console.log('Recording stopped.');

    // Get recorded actions
    const actions = recorder.getActions();
    console.log(`Recorded ${actions.length} actions`);

    // Export as Playwright test
    const playwrightScript = recorder.generatePlaywrightScript();
    console.log('\nPlaywright Test Script:');
    console.log(playwrightScript);

    // Export as TypeScript code
    const typescriptCode = recorder.generateTypeScriptCode();
    console.log('\nTypeScript Code:');
    console.log(typescriptCode);

    // Export as JSON
    const json = recorder.exportAsJSON();
    console.log('\nJSON Export:');
    console.log(json);

    await bridge.close();
  } catch (error) {
    console.error('Error:', error);
    await bridge.close();
  }
}

/**
 * Example 4: Multi-browser testing
 */
async function multiBrowserTest() {
  const browsers = ['chromium', 'firefox', 'webkit'] as const;

  for (const browserType of browsers) {
    const bridge = new BrowserBridge();

    try {
      console.log(`\nTesting with ${browserType}...`);

      await bridge.launch({
        headless: true,
        browserType,
        timeout: 30000
      });

      await bridge.navigate('https://example.com');

      const title = await bridge.evaluate('document.title');
      console.log(`${browserType} - Page title:`, title);

      await bridge.screenshot(`./screenshot-${browserType}.png`);

      await bridge.close();
      console.log(`${browserType} test completed successfully`);
    } catch (error) {
      console.error(`${browserType} test failed:`, error);
      await bridge.close();
    }
  }
}

/**
 * Example 5: Advanced JavaScript evaluation
 */
async function advancedEvaluation() {
  const bridge = new BrowserBridge();

  try {
    await bridge.launch({ headless: false });
    await bridge.navigate('https://example.com');

    // Get page metadata
    const metadata = await bridge.evaluate(`
      ({
        title: document.title,
        url: window.location.href,
        links: Array.from(document.querySelectorAll('a')).length,
        images: Array.from(document.querySelectorAll('img')).length,
        scripts: Array.from(document.querySelectorAll('script')).length
      })
    `);

    console.log('Page Metadata:', metadata);

    // Extract all links
    const links = await bridge.evaluate(`
      Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.textContent, href: a.href }))
    `);

    console.log('Links:', links);

    await bridge.close();
  } catch (error) {
    console.error('Error:', error);
    await bridge.close();
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('Browser Bridge Examples\n');

    // Uncomment the example you want to run:
    // await basicAutomation();
    // await formInteraction();
    // await recordActions();
    // await multiBrowserTest();
    // await advancedEvaluation();

    console.log('\nExamples completed!');
  })();
}
