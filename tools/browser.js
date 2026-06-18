const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  });
}
loadEnv();

const sleep = ms => new Promise(r => setTimeout(r, ms));

const TMP = path.join(__dirname, '../.tmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

const COOKIES = {
  google:   path.join(TMP, 'session-google.json'),
  ideogram: path.join(TMP, 'session-ideogram.json'),
  kling:    path.join(TMP, 'session-kling.json'),
};

// ─── Browser Agent ────────────────────────────────────────────────────────────

class BrowserAgent {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async launch() {
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });
    this.page = (await this.browser.pages())[0];
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    console.log('[browser] Chrome is open.');
  }

  async goto(url) {
    console.log(`[browser] → ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  }

  async click(selector, label) {
    console.log(`[browser] click: ${label || selector}`);
    await this.page.waitForSelector(selector, { visible: true, timeout: 30000 });
    await this.page.click(selector);
  }

  async type(selector, text, label) {
    console.log(`[browser] type: ${label || selector}`);
    await this.page.waitForSelector(selector, { visible: true, timeout: 30000 });
    await this.page.click(selector);
    await this.page.type(selector, text, { delay: 40 });
  }

  async waitFor(selector, timeout = 90000) {
    console.log(`[browser] waiting for: ${selector}`);
    await this.page.waitForSelector(selector, { visible: true, timeout });
  }

  async screenshot(filename, show = true) {
    const out = path.join(TMP, filename);
    await this.page.screenshot({ path: out });
    console.log(`[browser] screenshot → .tmp/${filename}`);
    // show=true means: print a marker so Claude reads and shows this to the user
    if (show) console.log(`[SHOW_USER] ${out}`);
    return out;
  }

  async saveCookies(site) {
    const file = COOKIES[site];
    const cookies = await this.page.cookies();
    fs.writeFileSync(file, JSON.stringify(cookies, null, 2));
    console.log(`[session] ${site} cookies saved.`);
  }

  async loadCookies(site) {
    const file = COOKIES[site];
    if (!fs.existsSync(file)) return false;
    const cookies = JSON.parse(fs.readFileSync(file, 'utf8'));
    await this.page.setCookie(...cookies);
    console.log(`[session] ${site} cookies loaded.`);
    return true;
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

const tasks = {

  // Run once to save your Google session
  login: async (agent) => {
    console.log('\n[task] login — Google');
    console.log('────────────────────────────────────────────');
    console.log('Log in to Google in the Chrome window.');
    console.log('Come back here once you are fully signed in.');
    console.log('────────────────────────────────────────────\n');
    await agent.goto('https://accounts.google.com/signin');
    console.log('[task] Waiting for you to log in (up to 3 min)...');
    await agent.page.waitForFunction(
      () => window.location.hostname === 'myaccount.google.com' ||
            document.querySelector('[aria-label*="Google Account"]') !== null,
      { timeout: 180000 }
    );
    await agent.saveCookies('google');
    console.log('\n[task] Google session saved!\n');
    console.log('Next: node tools/browser.js login-ideogram\n');
  },

  // Automated Ideogram login via Google OAuth
  'login-ideogram': async (agent) => {
    console.log('\n[task] login — Ideogram (automated)\n');

    // Go directly to Ideogram login page
    await agent.goto('https://ideogram.ai/login');
    await sleep(3000);
    await agent.screenshot('ideogram-login-page.png');

    // Set up popup listener BEFORE clicking Google button
    const popupPromise = new Promise(resolve => {
      agent.browser.once('targetcreated', async target => {
        await sleep(1000);
        const popup = await target.page();
        resolve(popup);
      });
    });

    // Click "Continue with Google" by finding the first button containing "Google"
    console.log('[browser] Clicking Continue with Google...');
    await agent.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const btn = buttons.find(b => (b.textContent || '').toLowerCase().includes('google'));
      if (btn) btn.click();
    });

    // Wait for popup OR same-tab redirect (whichever comes first)
    console.log('[browser] Waiting for Google OAuth popup...');
    const gPage = await Promise.race([
      popupPromise,
      new Promise(resolve => setTimeout(async () => {
        const url = agent.page.url();
        resolve(url.includes('google') ? agent.page : null);
      }, 5000))
    ]);

    if (!gPage) {
      console.log('[browser] No popup — checking if page redirected to Google...');
      await sleep(2000);
    }

    const authPage = gPage || agent.page;
    console.log('[browser] Auth page:', authPage.url());
    await sleep(2000);

    // Type email in Google OAuth form
    try {
      console.log('[browser] Entering Google email...');
      // Google OAuth uses name="identifier" not type="email"
      await authPage.waitForSelector('input[name="identifier"], input[type="email"]', { visible: true, timeout: 20000 });
      await authPage.click('input[name="identifier"], input[type="email"]');
      await authPage.type('input[name="identifier"], input[type="email"]', process.env.GOOGLE_EMAIL, { delay: 50 });
      await sleep(500);
      await authPage.keyboard.press('Enter');
      await sleep(3000);

      // Type password
      console.log('[browser] Entering Google password...');
      await authPage.waitForSelector('input[name="Passwd"], input[type="password"]', { visible: true, timeout: 15000 });
      await authPage.click('input[name="Passwd"], input[type="password"]');
      await authPage.type('input[name="Passwd"], input[type="password"]', process.env.GOOGLE_PASSWORD, { delay: 50 });
      await sleep(500);
      await authPage.keyboard.press('Enter');
      await sleep(5000);
    } catch (e) {
      console.log('[browser] Auth form issue:', e.message);
      await agent.screenshot('auth-error.png');
    }

    // Wait for Ideogram home to load
    console.log('[browser] Waiting for Ideogram home...');
    await agent.page.waitForFunction(
      () => window.location.hostname.includes('ideogram') && !window.location.pathname.includes('login'),
      { timeout: 30000 }
    );
    await sleep(3000);
    await agent.saveCookies('ideogram');
    console.log('\n[task] Ideogram session saved!\n');
    console.log('Next: node tools/browser.js blender\n');
  },

  // Generate an image on Ideogram
  // Usage: node tools/browser.js generate-image "prompt" frame1.png
  'generate-image': async (agent, prompt, outputFile = 'image.png') => {
    if (!prompt) {
      console.error('[error] Usage: node tools/browser.js generate-image "your prompt" output.png');
      return;
    }
    console.log(`\n[task] generate-image → .tmp/${outputFile}\n`);

    await agent.goto('https://ideogram.ai/t/explore');
    await sleep(3000);

    // Check if we got redirected to login (not logged in)
    const needsLogin = await agent.page.evaluate(() => {
      const url = window.location.href;
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return url.includes('/login') || buttons.some(b => /continue with google/i.test(b.textContent));
    });

    if (needsLogin) {
      console.log('[browser] Login required — navigating to /login page...');
      await agent.goto('https://ideogram.ai/login');
      await sleep(2000);

      // Click "Continue with Google" on the /login page (this does a same-tab redirect to Google OAuth)
      await agent.page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, a'))
          .find(b => /continue with google/i.test(b.textContent));
        if (btn) btn.click();
      });

      // Wait for Google OAuth to load
      await agent.page.waitForFunction(
        () => window.location.hostname.includes('google.com'),
        { timeout: 15000 }
      );
      await sleep(2000);

      try {
        console.log('[browser] Entering Google credentials...');
        await agent.page.waitForSelector('input[name="identifier"]', { visible: true, timeout: 15000 });
        await agent.page.type('input[name="identifier"]', process.env.GOOGLE_EMAIL, { delay: 50 });
        await agent.page.keyboard.press('Enter');
        await sleep(3000);
        await agent.page.waitForSelector('input[name="Passwd"]', { visible: true, timeout: 15000 });
        await agent.page.type('input[name="Passwd"]', process.env.GOOGLE_PASSWORD, { delay: 50 });
        await agent.page.keyboard.press('Enter');
        await sleep(5000);
      } catch (e) {
        console.log('[browser] OAuth issue:', e.message);
        await agent.screenshot('oauth-error.png');
        return;
      }

      // Wait for redirect back to Ideogram
      console.log('[browser] Waiting for redirect back to Ideogram...');
      await agent.page.waitForFunction(
        () => window.location.hostname.includes('ideogram'),
        { timeout: 30000 }
      );
      await sleep(3000);

      // Now go to the explore/create page
      await agent.goto('https://ideogram.ai/t/explore');
      await sleep(3000);
    }

    // Dismiss any cookie/consent popups
    await agent.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const accept = btns.find(b => /accept|decline|dismiss/i.test(b.innerText));
      if (accept) accept.click();
    });
    await sleep(500);

    // Type prompt into the generate bar
    console.log('[browser] Typing prompt...');
    await agent.screenshot('ideogram-before-type.png');

    // Click the prompt bar area (the "Generate new or upload & edit" bar)
    const promptClicked = await agent.page.evaluate(() => {
      const el =
        document.querySelector('[contenteditable="true"]') ||
        document.querySelector('textarea') ||
        Array.from(document.querySelectorAll('input[type="text"]'))
          .find(i => !['Email', 'Password', 'Search'].includes(i.placeholder));
      if (!el) return null;
      el.click();
      el.focus();
      return el.tagName;
    });

    if (!promptClicked) {
      console.error('[error] Could not find prompt input.');
      await agent.screenshot('no-prompt.png');
      return;
    }

    console.log(`[browser] Found prompt element: ${promptClicked}`);
    await sleep(500);

    // Type using keyboard (works for both contenteditable and input)
    await agent.page.keyboard.type(prompt, { delay: 30 });
    await sleep(1000);
    await agent.screenshot('ideogram-typed.png');

    // Submit with Enter
    console.log('[browser] Submitting with Enter...');
    await agent.page.keyboard.press('Enter');

    // Wait for "View in Creations" link — appears when generation completes
    console.log('[browser] Generating — waiting for completion (up to 3 min)...');
    await agent.page.waitForFunction(
      () => {
        const links = Array.from(document.querySelectorAll('a, button, span, div'));
        return links.some(el => /view in creations/i.test(el.innerText || el.textContent));
      },
      { timeout: 180000 }
    );
    console.log('[browser] Generation complete — navigating to result...');

    // Click "View in Creations" to go to the generated image
    await agent.page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('a, button, span, div'))
        .find(el => /view in creations/i.test(el.innerText || el.textContent));
      if (el) el.click();
    });
    await sleep(3000);

    // Screenshot the creations page showing our generated image
    await agent.screenshot(outputFile);
    console.log(`\n[task] Done → .tmp/${outputFile}\n`);
  },

  // Full blender workflow: 2 frames → ready for video
  blender: async (agent) => {
    console.log('\n[task] blender — generating 2 frames\n');

    await tasks['generate-image'](
      agent,
      'professional product photo of a sleek modern blender, completely empty, white studio background, soft studio lighting, photorealistic, high detail',
      'frame1.png'
    );
    await sleep(3000);

    await tasks['generate-image'](
      agent,
      'professional product photo of the exact same sleek modern blender, filled with fresh tropical fruits and orange juice splashing inside, white studio background, soft studio lighting, photorealistic, high detail',
      'frame2.png'
    );

    console.log('\n[task] Both frames ready:');
    console.log('  .tmp/frame1.png — empty blender');
    console.log('  .tmp/frame2.png — blender with fruits & juice');
    console.log('\nNext: node tools/browser.js make-video\n');
  },

  // Search YouTube for a query
  // Usage: node tools/browser.js youtube-search "selly"
  'youtube-search': async (agent, query = 'selly') => {
    console.log(`\n[task] youtube-search → "${query}"\n`);
    await agent.goto(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    await sleep(3000);
    // Dismiss cookie consent if present
    await agent.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, tp-yt-paper-button'))
        .find(b => /accept|agree/i.test(b.innerText || b.textContent));
      if (btn) btn.click();
    });
    await sleep(1500);
    // Wait for video results to render
    try {
      await agent.page.waitForSelector('ytd-video-renderer, ytd-item-section-renderer', { visible: true, timeout: 15000 });
    } catch (_) {}
    await sleep(1000);
    await agent.screenshot('youtube-search.png');
    console.log(`\n[task] Done — results for "${query}" are open.\n`);
  },

  // Search cat photos on Google Images and set one as desktop wallpaper
  'cat-wallpaper': async (agent) => {
    console.log('\n[task] cat-wallpaper\n');

    // Search Google Images
    await agent.goto('https://www.google.com/search?q=beautiful+cat+photos&tbm=isch&tbs=isz:l');
    await sleep(3000);

    // Dismiss cookie consent if present
    await agent.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => /accept|agree/i.test(b.innerText));
      if (btn) btn.click();
    });
    await sleep(1000);

    // Click the first high-quality image
    console.log('[browser] Clicking first image...');
    await agent.page.waitForSelector('img[data-src], img[src*="encrypted"], g-img img', { timeout: 15000 });
    await agent.page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('div[data-q] img, g-img img, img[data-iurl]'));
      if (imgs[0]) imgs[0].click();
    });
    await sleep(3000);

    // Get the full-size image URL from the side panel
    console.log('[browser] Getting full-size image URL...');
    const imgUrl = await agent.page.evaluate(() => {
      // Google Images shows the full image in a side panel
      const img = document.querySelector('img[src^="https://"][style*="display: block"], .islib img[src^="http"], [jsname="kn3ccd"] img');
      return img ? img.src : null;
    });

    if (!imgUrl || imgUrl.includes('data:')) {
      // Fallback: grab any large image from panel
      const fallback = await agent.page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img[src^="https://"]'))
          .filter(i => i.naturalWidth > 400);
        return imgs.length ? imgs[0].src : null;
      });
      if (!fallback) {
        console.error('[error] Could not get image URL.');
        return;
      }
    }

    console.log('[browser] Downloading image...');
    const wallpaperPath = path.join(TMP, 'cat-wallpaper.jpg').replace(/\\/g, '\\\\');

    // Download the image using Node fetch
    const https = require('https');
    const http = require('http');
    const targetUrl = imgUrl || await agent.page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img[src^="https://"]'))
        .filter(i => i.naturalWidth > 400);
      return imgs.length ? imgs[0].src : null;
    });

    await new Promise((resolve, reject) => {
      const outPath = path.join(TMP, 'cat-wallpaper.jpg');
      const file = fs.createWriteStream(outPath);
      const lib = targetUrl.startsWith('https') ? https : http;
      lib.get(targetUrl, res => {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    });

    console.log('[browser] Image downloaded → .tmp/cat-wallpaper.jpg');
    console.log('[browser] Setting as desktop wallpaper...');

    const { execSync } = require('child_process');
    const destPath = `C:\\Users\\${require('os').userInfo().username}\\Pictures\\cat-wallpaper.jpg`;

    // Copy to Pictures (stable path, no spaces issue)
    fs.copyFileSync(path.join(TMP, 'cat-wallpaper.jpg'), destPath);

    // 1. Write registry values
    execSync(`reg add "HKCU\\Control Panel\\Desktop" /v Wallpaper /t REG_SZ /d "${destPath}" /f`);
    execSync(`reg add "HKCU\\Control Panel\\Desktop" /v WallpaperStyle /t REG_SZ /d "10" /f`);
    execSync(`reg add "HKCU\\Control Panel\\Desktop" /v TileWallpaper /t REG_SZ /d "0" /f`);

    // 2. Restart Explorer to pick up registry change
    execSync(`powershell -command "Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; Start-Sleep 2; Start-Process explorer"`);

    // 3. Wait then call SystemParametersInfo to apply immediately
    await sleep(3000);
    execSync(`powershell -command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class D { [DllImport(\\"user32.dll\\", CharSet=CharSet.Unicode)] public static extern bool SystemParametersInfo(uint a, uint b, string c, uint d); }' -ErrorAction SilentlyContinue; [D]::SystemParametersInfo(0x0014,0,'${destPath}',0x03)"`);

    console.log('\n[task] Done — cat wallpaper is set!\n');
  },

};

// ─── Entry point ──────────────────────────────────────────────────────────────

(async () => {
  const task = process.argv[2] || 'login';
  const args = process.argv.slice(3);

  if (!tasks[task]) {
    console.error(`\n[error] Unknown task: "${task}"`);
    console.log('Available tasks:', Object.keys(tasks).join(', '));
    process.exit(1);
  }

  const agent = new BrowserAgent();
  try {
    await agent.launch();
    await tasks[task](agent, ...args);
    await sleep(2000);
  } catch (err) {
    console.error('\n[error]', err.message);
    try { await agent.screenshot('error-state.png'); } catch {}
  } finally {
    await agent.close();
  }
})();
