# Workflow: Scrape Website

## Objective
Extract content from the web using the Firecrawl CLI. Supports single-page scraping, full-site crawling, URL mapping, web search, AI agents, and file parsing.

## When to use
- Read a webpage before referencing or designing from it
- Pull structured data from an external site
- Search the web and get clean results
- Run an AI agent to extract specific information from a site

## Tool
`tools/scrape.js` — thin wrapper around `firecrawl-cli`. Key is read from `.env`.

## Commands

### Scrape a single page → markdown
```
node tools/scrape.js scrape https://example.com .tmp/page.md
```

### Crawl an entire site
```
node tools/scrape.js crawl https://example.com .tmp/site.md
```

### Map all URLs on a site
```
node tools/scrape.js map https://example.com .tmp/urls.txt
```

### Web search
```
node tools/scrape.js search "best construction landing pages" .tmp/results.md
```

### AI agent (extract specific data)
```
node tools/scrape.js agent "extract all pricing plans from https://example.com" .tmp/data.md
```

### Parse a local file (PDF, DOCX, HTML, etc.)
```
node tools/scrape.js parse path/to/file.pdf .tmp/parsed.md
```

## Direct CLI usage (advanced)
For options not covered by the wrapper, call `firecrawl-cli` directly:
```
npx firecrawl-cli scrape https://example.com --format html,links
npx firecrawl-cli interact https://example.com
npx firecrawl-cli monitor https://example.com
npx firecrawl-cli research "topic"
npx firecrawl-cli --status
```

## Credentials
- API key stored in `.env` as `FIRECRAWL_API_KEY`
- CLI is also globally authenticated via `npx firecrawl-cli config`
- Never pass the key on the command line directly (it appears in shell history)

## Output
All output goes to `.tmp/` — files there are disposable and regenerated as needed.

## Error handling
- `401` — key invalid or expired. Rotate at firecrawl.dev, update `.env`.
- `429` — rate limited. Wait and retry. Use `crawl` instead of many `scrape` calls.
- Parse errors — try `--format html` as fallback if markdown is garbled.
