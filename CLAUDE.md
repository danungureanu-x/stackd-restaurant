# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Studio Constructions — one-page business website for a house-building agency.
Plain HTML/CSS/JS (no framework, no build step).

## File Structure
```
index.html              # Single entry point; all sections live here
css/styles.css          # All styles
js/main.js              # Interactivity (nav toggle, smooth scroll)
js/shader-bg.js         # WebGL shader background
assets/images/          # Photos, logo
assets/fonts/           # Self-hosted fonts (if any)

tools/                  # WAT execution layer — deterministic scripts
  screenshot.js         #   node tools/screenshot.js [url] [out] → .tmp/screenshot.png
  scrape.js             #   node tools/scrape.js <cmd> <url> [out] → Firecrawl wrapper
  browser.js            #   Puppeteer browser automation helper

workflows/              # WAT instruction layer — SOPs for each tool
  scrape_website.md     #   When/how to use Firecrawl (scrape, crawl, search, agent…)

.claude/skills/         # Project-specific Claude Code skills (canonical)
  frontend-designer.md  #   Auto-invoked for any UI/design work
  firecrawl.md          #   Routes web scraping/search/crawl tasks
  n8n.md                #   Auto-invoked for n8n workflow config & debug

.env                    # API keys (gitignored — never commit)
SKILLS/                 # Auto-generated system skills (gitignored)
.tmp/                   # Temp outputs — screenshots, scrapes (gitignored)
```

## Development
Open index.html directly in a browser (no server needed for basic work).
For local server (avoids CORS issues with assets): `npx serve .` or `python -m http.server`.

## WAT Framework
Inherits WAT conventions from `c:\Users\ghost\Desktop\CLAUDE.md`.
If tools or automation are added, follow the tools/ + workflows/ + .env pattern defined there.

## Architecture
Single scrollable page with sections in this order:
1. Header / Nav (sticky)
2. Hero
3. About
4. Services
5. Projects / Portfolio
6. Testimonials
7. Contact / Footer

No JavaScript framework. Keep JS minimal — only for nav toggle and smooth-scroll behavior.

## Tools & Integrations
- **GitHub MCP** — push/pull code, manage the repo at github.com/danungureanu-x/studio-constructions
- **n8n MCP** — read and edit workflows on the n8n instance at https://danialex.app.n8n.cloud
- **Contact form → n8n webhook** — form POSTs JSON to [WEBHOOK_URL]; n8n sends email notification to owner
- **Puppeteer screenshot** — `node tools/screenshot.js` → `.tmp/screenshot.png` (full-page, 1440px). ALWAYS run after any UI/CSS/HTML change and read the image to visually verify. Never remove this tool.
- **Firecrawl** — `node tools/scrape.js <command> <url|query> [output_path]`. Commands: scrape, crawl, map, search, agent, parse. Key in `.env` as `FIRECRAWL_API_KEY`. See `workflows/scrape_website.md`.

## Skills
- `n8n` — configure and debug n8n workflows
- `frontend-designer` — UI/design iteration
- `firecrawl` — route web scraping/search/crawl/research tasks; see `.claude/skills/firecrawl.md`

## n8n Role
Handles contact form submissions only. Site runs independently of n8n.
Workflow: form POST → n8n webhook → email to owner (+ optional Google Sheets log).
