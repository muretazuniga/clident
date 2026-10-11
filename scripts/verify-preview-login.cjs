const { readFileSync } = require('node:fs');
const { parse } = require('../server/node_modules/dotenv');
const puppeteer = require('puppeteer');
const assert = require('node:assert/strict');
const env = parse(readFileSync('.env'));
const origin = 'https://clident-preview-epgn1ftert.vercel.app';
let browser;
async function main() {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', () => errors.push('Error JavaScript'));
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle0' });
  for (const [name, value] of [['email', env.BOOTSTRAP_EMAIL], ['password', env.BOOTSTRAP_PASSWORD]]) {
    assert.ok(value, `Falta variable local de ${name}`);
    const selector = `ion-input[name="${name}"] >>> input`;
    await page.waitForSelector(selector);
    await page.type(selector, value);
  }
  await page.evaluate(() => [...document.querySelectorAll('ion-button')].find(b => b.textContent.trim() === 'Ingresar').click());
  await page.waitForFunction(() => location.pathname === '/home', { timeout: 30000 });
  const cookies = await page.cookies();
  assert.ok(cookies.some(c => c.name.includes('session_token') && c.httpOnly && c.secure && c.sameSite === 'Lax'));
  console.log('Login público verificado; cookie HttpOnly, Secure y SameSite=Lax.');
  const results = await page.evaluate(async () => {
    const me = await fetch('/api/me');
    const identity = await me.json();
    const responses = [];
    for (const path of ['dashboard', 'pacientes', 'profesionales', 'citas', 'atenciones', 'users']) {
      responses.push({ path, status: (await fetch(`/api/${path}`)).status });
    }
    return { role: identity.role || identity.user?.role, responses };
  });
  assert.equal(results.role, 'ADMINISTRADOR');
  for (const response of results.responses) {
    assert.equal(response.status, 200, `API ${response.path}: ${response.status}`);
    console.log(`API ${response.path}: acceso autorizado.`);
  }
  for (const route of ['home', 'pacientes', 'profesionales', 'citas', 'atenciones', 'mis-datos', 'administracion']) {
    await page.goto(`${origin}/${route}`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => !document.querySelector('.operation-progress'));
    assert.equal(new URL(page.url()).pathname, `/${route}`);
    assert.ok(await page.$('ion-content'));
    console.log(`Pantalla ${route}: carga verificada.`);
  }
  assert.deepEqual(errors, []);
  const logout = await page.evaluate(async () => (await fetch('/api/auth/sign-out', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status);
  assert.equal(logout, 200);
  assert.equal(await page.evaluate(async () => (await fetch('/api/me')).status), 401);
  console.log('Logout público y revocación verificados. Sin modificaciones clínicas.');
  console.log(`Correo del administrador: ${env.BOOTSTRAP_EMAIL}`);
}
main().catch(error => {
  console.error('Verificación Preview fallida. No se muestran credenciales ni tokens.');
  if (error instanceof assert.AssertionError) console.error(error.message.split('\n')[0]);
  else console.error(error.name);
  process.exitCode = 1;
}).finally(async () => { await browser?.close(); });
