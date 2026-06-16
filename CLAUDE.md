# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Studio Constructions — one-page business website for a house-building agency.
Plain HTML/CSS/JS (no framework, no build step).

## File Structure
index.html          # Single entry point; all sections live here
css/styles.css      # All styles
js/main.js          # Interactivity (mobile nav toggle, smooth scroll, etc.)
assets/images/      # Photos, logo
assets/fonts/       # Self-hosted fonts if any

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

## Skills
- `n8n` — configure and debug n8n workflows
- `frontend-designer` — UI/design iteration

## n8n Role
Handles contact form submissions only. Site runs independently of n8n.
Workflow: form POST → n8n webhook → email to owner (+ optional Google Sheets log).
