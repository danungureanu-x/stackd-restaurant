# Firecrawl Cheat Sheet

Reference for gathering web data in this project. Two execution surfaces are available:
**A) `node tools/scrape.js`** — the local CLI wrapper (always available)  
**B) Firecrawl MCP tools** — if `mcp-server-firecrawl` is added to `.claude/settings.json`

---

## A. Local CLI Wrapper (`tools/scrape.js`)

All commands save output to `.tmp/`. Key is read from `.env` → `FIRECRAWL_API_KEY`.

| Goal | Command |
|------|---------|
| Scrape one page → markdown | `node tools/scrape.js scrape <url> .tmp/page.md` |
| Crawl entire site | `node tools/scrape.js crawl <url> .tmp/site.md` |
| List all URLs on a site | `node tools/scrape.js map <url> .tmp/urls.txt` |
| Web search | `node tools/scrape.js search "<query>" .tmp/results.md` |
| AI agent extraction | `node tools/scrape.js agent "<prompt about url>" .tmp/data.md` |
| Deep research | `node tools/scrape.js research "<topic>" .tmp/research.md` |
| Parse local file (PDF/DOCX) | `node tools/scrape.js parse path/to/file.pdf .tmp/parsed.md` |

### Advanced CLI (options not in wrapper)
```bash
npx firecrawl-cli scrape <url> --format html,links,screenshot
npx firecrawl-cli interact <url>          # browser clicks/forms/login
npx firecrawl-cli monitor <url>           # watch a page for changes
npx firecrawl-cli --status                # check auth / quota
npx firecrawl-cli ask "<question>"        # ask about a failed job
npx firecrawl-cli docs-search "<query>"   # search Firecrawl's own docs
```

---

## B. Firecrawl MCP Tools

These are available when `@firecrawl/mcp-server` is configured as an MCP server.
They are called natively by Claude — no shell command needed.

### Setup (add to `.claude/settings.json` → `mcpServers`)
```json
"firecrawl": {
  "command": "npx",
  "args": ["-y", "firecrawl-mcp"],
  "env": { "FIRECRAWL_API_KEY": "<key>" }
}
```

### MCP Tool Reference

| Tool | What it does | Key params |
|------|-------------|------------|
| `firecrawl_scrape` | Clean markdown from a single URL | `url`, `formats` (`markdown`/`html`/`links`/`screenshot`), `onlyMainContent` |
| `firecrawl_map` | Discover all URLs on a site | `url`, `search` (filter URLs by keyword), `limit` |
| `firecrawl_crawl` | Bulk-extract multiple pages | `url`, `maxDepth`, `limit`, `includePaths`, `excludePaths` |
| `firecrawl_search` | Web search → ranked results with content | `query`, `limit`, `lang`, `country`, `scrapeOptions` |
| `firecrawl_extract` | Structured JSON extraction via schema | `urls`, `prompt`, `schema` |
| `firecrawl_deep_research` | Multi-step research with synthesis | `query`, `maxDepth`, `timeLimit`, `maxUrls` |
| `firecrawl_generate_llmstxt` | Generate LLMs.txt for a domain | `url`, `maxUrls` |
| `firecrawl_check_crawl_status` | Poll an async crawl job | `id` |
| `firecrawl_cancel_crawl` | Stop a running crawl | `id` |
| `firecrawl_get_extract_status` | Poll an async extract job | `id` |

---

## Decision Guide

```
Need data from the web?
│
├── Already have the URL?
│   ├── One page         → firecrawl_scrape / scrape
│   ├── Whole site       → firecrawl_crawl / crawl
│   └── Just URLs list   → firecrawl_map / map
│
├── Need to search first? → firecrawl_search / search
│
├── Need structured JSON (schema)?
│   └── firecrawl_extract / agent
│
├── Need a research brief (multi-source synthesis)?
│   └── firecrawl_deep_research / research
│
└── Page requires login / clicks / forms?
    └── npx firecrawl-cli interact <url>
```

---

## Output Formats (scrape)

| Format | Returns |
|--------|---------|
| `markdown` | Clean text (default) |
| `html` | Raw HTML |
| `links` | All hyperlinks on page |
| `screenshot` | PNG of rendered page |
| `rawHtml` | Unprocessed HTML before cleaning |

---

## Common Options

| Option | Default | Notes |
|--------|---------|-------|
| `onlyMainContent` | `true` | Strips nav, footer, ads |
| `waitFor` | `0` ms | Extra wait for JS-rendered pages |
| `timeout` | `30000` ms | Per-request timeout |
| `maxDepth` (crawl) | `2` | Link depth to follow |
| `limit` (crawl) | `10` | Max pages to crawl |

---

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `401` | Key invalid or expired | Rotate at firecrawl.dev, update `.env` |
| `402` | Out of credits | Upgrade plan or wait for reset |
| `429` | Rate limited | Wait and retry; use `crawl` instead of many `scrape` calls |
| Garbled markdown | JS-heavy page | Try `--format html` or `interact` |
| Empty result | Paywall / bot block | Use `interact` with login flow |
| Timeout | Slow page | Increase `waitFor` and `timeout` |

---

## Credentials

- CLI: stored in `.env` as `FIRECRAWL_API_KEY` — never pass on command line
- MCP: stored in `.claude/settings.local.json` (gitignored) under `env.FIRECRAWL_API_KEY`
- Dashboard / rotate keys: https://www.firecrawl.dev/app/api-keys
- Docs: https://docs.firecrawl.dev
