# Workflow: Pre-order Email Notification (Astro + Resend + Vercel)

## Objective
When a customer submits a pre-order form, send a formatted HTML email to the restaurant owner.

## Stack
- Astro 6, `output: 'static'`, `@astrojs/vercel` adapter
- Resend SDK (`npm install resend`)
- Vercel deployment

## Steps

### 1. Install dependencies
```bash
npm install @astrojs/vercel resend
```

### 2. astro.config.mjs
```js
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'static',
  adapter: vercel(),
});
```
> ⚠️ Astro 6 dropped `output: 'hybrid'` — use `output: 'static'` + `prerender = false` on the endpoint.

### 3. API endpoint — src/pages/api/preorder.ts
```ts
export const prerender = false;
// ... receive POST, call Resend, return 200
```

### 4. Hardcode the fetch URL in the frontend
```ts
const WEBHOOK_URL = '/api/preorder'; // NOT from env var
```
> ⚠️ `.env` is gitignored — Vercel never sees `PUBLIC_` vars at build time. Always hardcode internal API paths.

### 5. Add RESEND_API_KEY to Vercel
Vercel → Project → Settings → Environment Variables → add `RESEND_API_KEY` → redeploy.

### 6. Resend sender address
Use `onboarding@resend.dev` as the `from` address on free tier (no domain verification needed).

## Gotchas
- No space before the API key value (e.g. `RESEND_API_KEY=re_xxx` not `RESEND_API_KEY= re_xxx`)
- After adding env var in Vercel, a new deploy is required for it to take effect
- Resend API keys are shown only once — if lost, create a new one at resend.com/api-keys
