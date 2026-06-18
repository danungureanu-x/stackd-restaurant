// Thin wrapper around firecrawl-cli. Uses FIRECRAWL_API_KEY from .env.
//
// Usage:
//   node tools/scrape.js scrape <url> [output_path]
//   node tools/scrape.js crawl <url> [output_path]
//   node tools/scrape.js map <url> [output_path]
//   node tools/scrape.js search "<query>" [output_path]
//   node tools/scrape.js agent "<prompt>" [output_path]
//
// If output_path is omitted, output goes to stdout.
// All output is saved under .tmp/ by convention.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const command = process.argv[2];
const target = process.argv[3];
const outputPath = process.argv[4] || null;

const validCommands = ['scrape', 'crawl', 'map', 'search', 'agent', 'research', 'parse'];

if (!command || !validCommands.includes(command) || !target) {
  console.error(`Usage: node tools/scrape.js <${validCommands.join('|')}> <url|query|file> [output_path]`);
  process.exit(1);
}

const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  console.error('FIRECRAWL_API_KEY not set in .env');
  process.exit(1);
}

const env = { ...process.env, FIRECRAWL_API_KEY: apiKey };

try {
  const result = execSync(
    `npx firecrawl-cli ${command} "${target}" --api-key "${apiKey}"`,
    { env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, result, 'utf8');
    console.log(`Saved: ${outputPath}`);
  } else {
    process.stdout.write(result);
  }
} catch (err) {
  console.error('firecrawl-cli error:', err.message);
  process.exit(1);
}
