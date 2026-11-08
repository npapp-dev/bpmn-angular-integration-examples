#!/usr/bin/env node
/**
 * Headless verification of the BPMN editor (Angular + bpmn-js) in real Chromium.
 *
 * Run from the repo root:
 *   node .claude/skills/verifying-in-browser/scripts/verify-app.js [options]
 *
 * Options:
 *   --serve                 start `ng serve` on --port, wait until it answers, stop it at the end
 *   --port <n>              dev-server port (default 4299; 4200 is the plain `npm start` port)
 *   --select <elementId>    click a canvas element, e.g. ServiceTask_1 (data-element-id)
 *   --set <id>=<value>      set a property in the Angular panel by input id; repeatable
 *                           (select: option value; checkbox: true/false; others: text)
 *   --expect <selector>     assert a CSS selector is visible after the actions; repeatable
 *   --absent <selector>     assert a CSS selector is NOT present; repeatable
 *   --xml [regex]           print exported BPMN XML (whole, or only the first block matching regex)
 *   --shot <path>           screenshot path (default /tmp/bpmn-verify.png); open it with the Read tool
 *   --viewport <WxH>        default 1400x900
 *   --mobile                shorthand for --viewport 390x844 (bottom-sheet layout)
 *   --dark                  emulate prefers-color-scheme: dark
 *
 * Exit code: 0 ok, 1 expectation failed or console/page errors, 2 setup failure.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

function resolvePlaywright() {
  // 1. project node_modules (playwright-core is installed but not declared in package.json)
  try { return require(require.resolve('playwright-core', { paths: [process.cwd()] })); } catch {}
  // 2. npx cache populated by `npx -y playwright-core@1.55.0`
  const npx = path.join(os.homedir(), '.npm', '_npx');
  if (fs.existsSync(npx)) {
    for (const d of fs.readdirSync(npx)) {
      const p = path.join(npx, d, 'node_modules', 'playwright-core');
      if (fs.existsSync(p)) { try { return require(p); } catch {} }
    }
  }
  console.error('playwright-core not found. Run once: npx -y playwright-core@1.55.0 --version');
  console.error('(1.55.0 matches the cached chromium-1187 in ~/Library/Caches/ms-playwright)');
  process.exit(2);
}

function parseArgs(argv) {
  const o = { port: '4299', sets: [], expects: [], absents: [], shot: '/tmp/bpmn-verify.png', viewport: '1400x900' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === '--serve') o.serve = true;
    else if (a === '--port') o.port = next();
    else if (a === '--select') o.select = next();
    else if (a === '--set') o.sets.push(next());
    else if (a === '--expect') o.expects.push(next());
    else if (a === '--absent') o.absents.push(next());
    else if (a === '--xml') { o.xml = true; if (argv[i + 1] && !argv[i + 1].startsWith('--')) o.xmlGrep = next(); }
    else if (a === '--shot') o.shot = next();
    else if (a === '--viewport') o.viewport = next();
    else if (a === '--mobile') o.viewport = '390x844';
    else if (a === '--dark') o.dark = true;
    else { console.error('unknown option ' + a); process.exit(2); }
  }
  return o;
}

function waitForHttp(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function tick() {
      http.get(url, res => { res.resume(); resolve(res.statusCode); })
        .on('error', () => {
          if (Date.now() - start > timeoutMs) reject(new Error('dev server did not answer within ' + timeoutMs + 'ms'));
          else setTimeout(tick, 1000);
        });
    })();
  });
}

(async () => {
  const o = parseArgs(process.argv.slice(2));
  const { chromium } = resolvePlaywright();
  const url = `http://localhost:${o.port}/`;
  let server = null;

  if (o.serve) {
    const log = fs.openSync('/tmp/bpmn-serve.log', 'w');
    // Angular's dev build of this app takes ~2-5s; the generous timeout covers a cold cache.
    server = spawn('./node_modules/.bin/ng', ['serve', '--port', o.port], { stdio: ['ignore', log, log], detached: true });
    try { await waitForHttp(url, 120000); }
    catch (e) { console.error(e.message + ' (see /tmp/bpmn-serve.log)'); process.kill(-server.pid); process.exit(2); }
  }

  const [w, h] = o.viewport.split('x').map(Number);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: o.dark ? 'dark' : 'light' });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const failures = [];

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.djs-container', { timeout: 30000 });
    await page.waitForSelector('[data-element-id]', { timeout: 30000 });

    if (o.select) {
      await page.click(`[data-element-id="${o.select}"]`);
      await page.waitForSelector('.properties-panel-container', { timeout: 10000 });
      // Elements without a schema show the empty state; report rather than fail.
      const hasPanel = await page.$('.enhanced-properties-panel');
      console.log(`selected ${o.select}: enhanced panel ${hasPanel ? 'shown' : 'NOT shown (no schema for this type)'}`);
      if (hasPanel) {
        console.log('  element title:', (await page.textContent('.element-title')).trim());
        console.log('  validation   :', (await page.textContent('.status-text')).trim());
      }
    }

    for (const s of o.sets) {
      const eq = s.indexOf('=');
      const id = s.slice(0, eq), value = s.slice(eq + 1);
      const sel = `#${id}`;
      await page.waitForSelector(sel, { timeout: 5000 });
      const tag = await page.$eval(sel, el => el.tagName + ':' + (el.type || ''));
      if (tag.startsWith('SELECT')) await page.selectOption(sel, value);
      else if (tag === 'INPUT:checkbox') await page.setChecked(sel, value === 'true');
      else await page.fill(sel, value);
      console.log(`set ${id} = ${value} (${tag})`);
    }

    for (const sel of o.expects) {
      const ok = await page.isVisible(sel).catch(() => false);
      console.log(`expect visible ${sel}: ${ok ? 'OK' : 'FAIL'}`);
      if (!ok) failures.push('expected visible: ' + sel);
    }
    for (const sel of o.absents) {
      const n = (await page.$$(sel)).length;
      console.log(`expect absent ${sel}: ${n === 0 ? 'OK' : 'FAIL (' + n + ' found)'}`);
      if (n) failures.push('expected absent: ' + sel);
    }

    if (o.xml) {
      // Angular dev mode exposes component instances via window.ng
      const xml = await page.evaluate(() =>
        ng.getComponent(document.querySelector('app-diagram')).diagramEditor.exportXML({ format: true }));
      if (o.xmlGrep) {
        // Print the first element whose tag starts with xmlGrep (e.g. bpmn2:serviceTask),
        // including its children, or the self-closing tag.
        const start = xml.indexOf('<' + o.xmlGrep);
        let block = '(no match)';
        if (start !== -1) {
          const gt = xml.indexOf('>', start);
          const selfClosing = xml[gt - 1] === '/';
          const close = xml.indexOf('</' + o.xmlGrep + '>', start);
          block = selfClosing || close === -1 ? xml.slice(start, gt + 1) : xml.slice(start, close + o.xmlGrep.length + 3);
        }
        console.log('--- xml (' + o.xmlGrep + ') ---\n' + block);
      } else {
        console.log('--- xml ---\n' + xml);
      }
    }

    await page.screenshot({ path: o.shot, fullPage: false });
    console.log('screenshot:', o.shot);
  } catch (e) {
    failures.push('script error: ' + e.message);
  } finally {
    await browser.close();
    if (server) { try { process.kill(-server.pid); } catch {} }
  }

  console.log('--- browser errors ---\n' + (errors.length ? errors.join('\n') : '(none)'));
  if (failures.length) console.log('--- failures ---\n' + failures.join('\n'));
  process.exit(failures.length || errors.length ? 1 : 0);
})();
