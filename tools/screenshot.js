const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Usage:
//   node tools/screenshot.js                          → local index.html, .tmp/screenshot.png
//   node tools/screenshot.js https://example.com     → external URL, .tmp/screenshot.png
//   node tools/screenshot.js <url> <output> <w> <h>  → full control

const input = process.argv[2];
const outputPath = process.argv[3] || path.join(__dirname, '../.tmp/screenshot.png');
const width = parseInt(process.argv[4]) || 1440;
const height = parseInt(process.argv[5]) || 900;

const isUrl = input && (input.startsWith('http://') || input.startsWith('https://'));
const indexPath = path.resolve(__dirname, '../index.html');
const targetUrl = isUrl ? input : `file:///${indexPath.replace(/\\/g, '/')}`;

const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--enable-webgl',
      '--ignore-gpu-blacklist',
      '--use-gl=swiftshader',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  // Force reveal animations visible for full-page screenshot
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  });
  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();
  console.log(`Screenshot saved: ${outputPath} (source: ${targetUrl})`);
})();
