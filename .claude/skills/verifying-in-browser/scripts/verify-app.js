#!/usr/bin/env node
/**
 * Headless verification of the BPMN editor (Angular + bpmn-js) in real Chromium.
 *
 * Run from the repo root:
 *   node .claude/skills/verifying-in-browser/scripts/verify-app.js [options] [actions...]
 *
 * Options (anywhere on the command line):
 *   --serve                 start `ng serve` on --port, wait until it answers, stop it at the end
 *   --port <n>              dev-server port (default 4299; plain `npm start` uses 4200)
 *   --viewport <WxH>        default 1400x900
 *   --mobile                shorthand for --viewport 390x844 (bottom-sheet layout)
 *   --dark                  emulate prefers-color-scheme: dark
 *
 * Actions (executed in the order given, so pre/post checks work):
 *   --select <elementId>    click a canvas element, e.g. ServiceTask_1 (data-element-id)
 *   --set <id>=<value>      set a property in the Angular panel by input id
 *                           (select: option value; checkbox: true/false; others: text)
 *   --expect <selector>     assert a CSS selector is visible now
 *   --absent <selector>     assert a CSS selector is NOT present now
 *   --xml [tag]             print exported BPMN XML (whole, or only the first <tag ...> element)
 *   --shot <path>           screenshot now, after scrolling the last touched element into view
 *
 * If no --shot is given, a final screenshot is written to /tmp/bpmn-verify.png.
 * Exit code: 0 ok, 1 expectation failed or console/page errors, 2 setup failure.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const DEFAULT_SHOT = '/tmp/bpmn-verify.png';

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
  const o = { port: '4299', viewport: '1400x900', actions: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === '--serve') o.serve = true;
    else if (a === '--port') o.port = next();
    else if (a === '--viewport') o.viewport = next();
    else if (a === '--mobile') o.viewport = '390x844';
    else if (a === '--dark') o.dark = true;
    else if (['--select', '--set', '--expect', '--absent', '--shot'].includes(a)) o.actions.push({ type: a.slice(2), arg: next() });
    else if (a === '--xml') o.actions.push({ type: 'xml', arg: argv[i + 1] && !argv[i + 1].startsWith('--') ? next() : null });
    else { console.error('unknown option ' + a); process.exit(2); }
  }
  if (!o.actions.some(x => x.type === 'shot')) o.actions.push({ type: 'shot', arg: DEFAULT_SHOT });
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

function xmlBlock(xml, tag) {
  const start = xml.indexOf('<' + tag);
  if (start === -1) return '(no match for <' + tag + ')';
  const gt = xml.indexOf('>', start);
  const close = xml.indexOf('</' + tag + '>', start);
  return xml[gt - 1] === '/' || close === -1 ? xml.slice(start, gt + 1) : xml.slice(start, close + tag.length + 3);
}

(async () => {
  const o = parseArgs(process.argv.slice(2));
  const { chromium } = resolvePlaywright();
  const url = `http://localhost:${o.port}/`;
  let server = null;

  if (o.serve) {
    const log = fs.openSync('/tmp/bpmn-serve.log', 'w');
    // The dev build of this app takes ~2-5 s; the generous timeout covers a cold cache.
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
  let lastTouched = null; // selector scrolled into view before a screenshot

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.djs-container', { timeout: 30000 });
    await page.waitForSelector('[data-element-id]', { timeout: 30000 });

    for (const { type, arg } of o.actions) {
      if (type === 'select') {
        await page.click(`[data-element-id="${arg}"]`);
        // The drawer starts closed under 768px (and can be toggled closed on desktop): open it.
        if (await page.getAttribute('.properties-drawer', 'aria-hidden') === 'true') {
          // On phones the status bar's validation popover can cover the FAB; dismiss it first.
          const close = await page.$('.validation-details-close');
          if (close && await close.isVisible()) { await close.click(); console.log('dismissed validation popover'); }
          const fab = await page.$('.properties-fab');
          await ((fab && await fab.isVisible()) ? fab.click() : page.click('.panel-toggle'));
          console.log('opened properties drawer');
        }
        await page.waitForSelector('.properties-panel-container', { timeout: 10000 });
        const hasPanel = await page.$('.enhanced-properties-panel');
        // Elements without a schema show the empty state; report rather than fail.
        console.log(`selected ${arg}: enhanced panel ${hasPanel ? 'shown' : 'NOT shown (no schema for this type)'}`);
        if (hasPanel) {
          console.log('  element title:', (await page.textContent('.element-title')).trim());
          console.log('  validation   :', (await page.textContent('.status-text')).trim());
          lastTouched = '.enhanced-properties-panel';
        }
      } else if (type === 'set') {
        const eq = arg.indexOf('=');
        const id = arg.slice(0, eq), value = arg.slice(eq + 1), sel = `#${id}`;
        await page.waitForSelector(sel, { timeout: 5000 });
        const tag = await page.$eval(sel, el => el.tagName + ':' + (el.type || ''));
        if (tag.startsWith('SELECT')) await page.selectOption(sel, value);
        else if (tag === 'INPUT:checkbox') await page.setChecked(sel, value === 'true');
        else await page.fill(sel, value);
        console.log(`set ${id} = ${value} (${tag})`);
        lastTouched = sel;
      } else if (type === 'expect') {
        const ok = await page.isVisible(arg).catch(() => false);
        console.log(`expect visible ${arg}: ${ok ? 'OK' : 'FAIL'}`);
        if (!ok) failures.push('expected visible: ' + arg); else lastTouched = arg;
      } else if (type === 'absent') {
        const n = (await page.$$(arg)).length;
        console.log(`expect absent ${arg}: ${n === 0 ? 'OK' : 'FAIL (' + n + ' found)'}`);
        if (n) failures.push('expected absent: ' + arg);
      } else if (type === 'xml') {
        // Angular dev mode exposes component instances via window.ng
        const xml = await page.evaluate(() =>
          ng.getComponent(document.querySelector('app-diagram')).diagramEditor.exportXML({ format: true }));
        console.log(arg ? `--- xml (${arg}) ---\n` + xmlBlock(xml, arg) : '--- xml ---\n' + xml);
      } else if (type === 'shot') {
        if (lastTouched) await page.$eval(lastTouched, el => el.scrollIntoView({ block: 'center' })).catch(() => {});
        await page.screenshot({ path: arg });
        console.log('screenshot:', arg, lastTouched ? `(scrolled to ${lastTouched})` : '');
      }
    }
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
