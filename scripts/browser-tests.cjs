const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { mkdirSync, writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const password = randomBytes(24).toString('hex');
const child = spawn(process.execPath, ['server/node_modules/tsx/dist/cli.mjs', 'server/browser-fixture.ts'], { env: { ...process.env, NODE_ENV: 'test', CLIDENT_TEST_PASSWORD: password }, stdio: ['ignore', 'pipe', 'pipe'] });
let browser, debugPage;
async function field(page, selector, value) { await page.waitForSelector(`${selector} >>> input`); await page.type(`${selector} >>> input`, value); }
async function clickButton(page, text) { const found = await page.evaluate(text => { const b = [...document.querySelectorAll('ion-button')].find(b => b.textContent.trim() === text && b.getBoundingClientRect().width); b?.click(); return !!b; }, text); assert.ok(found, `Botón disponible: ${text}`); }
async function waitLoaded(page) { await page.waitForFunction(() => !document.querySelector('.operation-progress')); }
async function main() {
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('La fixture no inició')), 30000); child.stdout.on('data', chunk => { if (chunk.toString().includes('Fixture lista')) { clearTimeout(timer); resolve(); } }); child.on('exit', () => reject(new Error('La fixture terminó antes de iniciar'))); });
  browser = await puppeteer.launch({ headless: true }); const page = await browser.newPage(); debugPage = page; const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.evaluateOnNewDocument(() => { window.clidentPolicyViolations = []; document.addEventListener('securitypolicyviolation', event => window.clidentPolicyViolations.push(event.violatedDirective)); });
  console.log('Comprobando login en navegador.');
  await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle0' });
  await field(page, 'ion-input[name="email"]', 'admin@example.test'); await field(page, 'ion-input[name="password"]', password); await clickButton(page, 'Ingresar');
  await page.waitForFunction(() => location.pathname === '/home'); await waitLoaded(page);
  assert.ok((await page.cookies()).some(c => c.httpOnly && c.name.includes('session_token')));
  const matrix = []; mkdirSync('artifacts/browser', { recursive: true });
  console.log('Comprobando los cinco anchos responsive.');
  for (const width of [375, 768, 1024, 1440, 1920]) {
    await page.setViewport({ width, height: 900 });
    for (const route of ['login', 'home', 'pacientes', 'profesionales', 'citas', 'atenciones', 'mis-datos', 'administracion', 'not-found']) {
      await page.goto(`http://localhost:4173/${route}`, { waitUntil: 'networkidle0' }); await waitLoaded(page);
      const overflow = await page.evaluate(() => {
        const content = [...document.querySelectorAll('ion-content')].find(e => !e.closest('ion-menu'));
        if (!content) return 0;
        const scroll = content.shadowRoot?.querySelector('.inner-scroll'); return scroll ? scroll.scrollWidth - scroll.clientWidth : 0;
      });
      assert.ok(overflow <= 1, `Sin overflow en ${route} a ${width}px: ${overflow}`);
      assert.deepEqual(await page.evaluate(() => window.clidentPolicyViolations), [], `Política CSP compatible en ${route}`);
      matrix.push({ route, width, overflow });
      if (width === 375 || width === 1440) await page.screenshot({ path: `artifacts/browser/${route}-${width}.png` });
    }
  }
  await page.goto('http://localhost:4173/pacientes', { waitUntil: 'networkidle0' }); await waitLoaded(page);
  await field(page, 'ion-input[label="Nombre completo"]', 'Paciente nuevo ficticio'); await field(page, 'ion-input[label="RUT"]', '11111111-1');
  await page.evaluate(() => { const e = document.querySelector('ion-input[type="date"]'); e.value = '1990-01-01'; e.dispatchEvent(new CustomEvent('ionInput', { detail: { value: '1990-01-01' }, bubbles: true })); });
  await field(page, 'ion-input[type="email"]', 'nuevo@example.test'); await field(page, 'ion-input[type="tel"]', '+56922222222'); await clickButton(page, 'Agregar paciente');
  await page.waitForFunction(() => document.querySelector('.record-list')?.textContent.includes('Paciente nuevo ficticio')); await waitLoaded(page);
  await page.reload({ waitUntil: 'networkidle0' }); await waitLoaded(page); assert.ok(await page.evaluate(() => document.querySelector('.record-list').textContent.includes('Paciente nuevo ficticio')));
  const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })); assert.ok(!storage.local.some(k => /token|patient|paciente|atenc/i.test(k))); assert.ok(!storage.session.some(k => /token|patient|paciente|atenc/i.test(k)));
  await page.goto('http://localhost:4173/home', { waitUntil: 'networkidle0' }); await waitLoaded(page); await clickButton(page, 'Cerrar sesión'); await page.waitForFunction(() => location.pathname === '/login');
  await page.goto('http://localhost:4173/administracion', { waitUntil: 'networkidle0' }); assert.equal(new URL(page.url()).pathname, '/login');
  await field(page, 'ion-input[name="email"]', 'prof@example.test'); await field(page, 'ion-input[name="password"]', password); await clickButton(page, 'Ingresar'); await page.waitForFunction(() => location.pathname === '/home'); await waitLoaded(page);
  await page.goto('http://localhost:4173/administracion', { waitUntil: 'networkidle0' }); assert.equal(new URL(page.url()).pathname, '/home');
  await page.goto('http://localhost:4173/profesionales', { waitUntil: 'networkidle0' }); await waitLoaded(page); assert.equal(await page.$('.form-panel'), null);
  assert.deepEqual(errors, []); writeFileSync('artifacts/browser/results.json', JSON.stringify({ responsive: matrix, checks: ['login real', 'cookie HttpOnly', 'CRUD paciente y persistencia', 'logout', 'guard administrador', 'sin caché clínica', 'sin errores de navegador'] }, null, 2));
  console.log(`${matrix.length} comprobaciones responsive y flujo de autenticación/CRUD completados.`);
}
main().catch(async e => { console.error(e.message); if (debugPage) { mkdirSync('artifacts/browser', { recursive: true }); await debugPage.screenshot({ path: 'artifacts/browser/failure.png' }); console.error('Ruta de fallo:', new URL(debugPage.url()).pathname); console.error(await debugPage.evaluate(() => ({ inputs: [...document.querySelectorAll('ion-input')].map(e => ({ name: e.name, label: e.label, shadow: !!e.shadowRoot })), text: document.body.innerText.slice(0, 800) }))); } process.exitCode = 1; }).finally(async () => { await browser?.close(); child.kill(); });
