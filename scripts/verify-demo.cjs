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
  page.on('pageerror', () => errors.push(1));
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle0' });
  for (const [name, value] of [['email', env.BOOTSTRAP_EMAIL], ['password', env.BOOTSTRAP_PASSWORD]]) {
    const selector = `ion-input[name="${name}"] >>> input`;
    await page.waitForSelector(selector); await page.type(selector, value);
  }
  await page.evaluate(() => [...document.querySelectorAll('ion-button')].find(b => b.textContent.trim() === 'Ingresar').click());
  await page.waitForFunction(() => location.pathname === '/home');
  await page.waitForFunction(() => document.querySelectorAll('.metric-strip dd').length === 3);
  assert.deepEqual(await page.$$eval('.metric-strip dd', rows => rows.map(r => Number(r.textContent.trim()))), [19,26,12]);
  assert.ok(await page.$('.agenda-preview .record-list ion-item'));
  console.log('Dashboard visible: 19 pacientes, 26 citas, 12 atenciones y próximas citas.');
  for (const [route,count] of [['profesionales',7], ['pacientes',19], ['citas',26], ['atenciones',12]]) {
    await page.goto(`${origin}/${route}`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$$eval('.record-list > ion-item', rows => rows.length), count, `Listado ${route}`);
    assert.ok(await page.$eval('.record-list', list => list.textContent.includes('[DEMO CLIDENT]')));
    console.log(`${route}: ${count} registros visibles en Chrome.`);
  }
  await page.goto(`${origin}/pacientes`, { waitUntil: 'networkidle0' });
  const clicked = await page.evaluate(() => {
    const row = [...document.querySelectorAll('.record-list > ion-item')].find(r => r.textContent.includes('Camila Aravena Rojas [DEMO CLIDENT]'));
    const button = [...row.querySelectorAll('ion-button')].find(b => b.textContent.trim() === 'Ver historial');
    button.click(); return true;
  });
  assert.ok(clicked);
  await page.waitForSelector('.history-list ion-item');
  assert.ok(await page.$eval('.history-list', list => list.textContent.includes('Gingivitis leve')));
  console.log('Historial visible: atención de evaluación inicial y profilaxis vinculada al paciente.');
  assert.deepEqual(errors, []);
  await page.evaluate(() => fetch('/api/auth/sign-out', { method:'POST', headers:{'content-type':'application/json'},body:'{}' }));
  console.log('Sin errores JavaScript. No se modificaron datos clínicos durante la verificación.');
}
main().catch(() => { console.error('La verificación visual no pudo completarse; no se muestran datos de acceso.'); process.exitCode=1; }).finally(async()=>{await browser?.close();});
