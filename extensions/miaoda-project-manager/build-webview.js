// Simple build script for webview resources
// In production, this would bundle React components

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out', 'webview');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

console.log('Webview resources built successfully');
