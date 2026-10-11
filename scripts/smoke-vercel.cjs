const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawn } = require('node:child_process');

async function main() {
  const root = resolve('artifacts/vercel-function');
  const config = JSON.parse(readFileSync(resolve(root, '.vc-config.json'), 'utf8'));
  const environment = { ...process.env, NODE_ENV: 'production' };
  for (const key of Object.keys(environment)) if (/^(DATABASE_URL|BETTER_AUTH_|BOOTSTRAP_|SMTP_|MAIL_FROM)/.test(key)) delete environment[key];
  const code = `const http = require('node:http'); const { registerHooks } = require('node:module'); const { fileURLToPath } = require('node:url'); const { resolve, sep } = require('node:path'); const root = ${JSON.stringify(root)}; registerHooks({ resolve(specifier, context, next) { const result = next(specifier, context); if (result.url.startsWith('file:') && !resolve(fileURLToPath(result.url)).startsWith(root + sep)) throw new Error('Dependencia fuera del paquete'); return result; } }); const exported = require(${JSON.stringify(resolve(root, config.handler))}); const handler = exported.default || exported; const server = http.createServer(handler); server.listen(0, '127.0.0.1', () => console.log('PORT:' + server.address().port));`;
  const child = spawn(process.execPath, ['-e', code], { cwd: root, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostic = '';
  child.stderr.on('data', data => { diagnostic += data.toString(); });
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Arranque excedido')), 20000);
      child.stdout.on('data', data => { const match = /^PORT:(\d+)/m.exec(data.toString()); if (match) { clearTimeout(timer); resolve(Number(match[1])); } });
      child.on('exit', () => { clearTimeout(timer); reject(new Error('No inició la función empaquetada')); });
    });
    const response = await fetch(`http://127.0.0.1:${port}/api/me`);
    if (response.status !== 503 || response.headers.get('cache-control') !== 'no-store') throw new Error('Respuesta insegura sin configuración');
    const body = await response.json();
    if (!body.error || /postgres|password|secret/i.test(body.error)) throw new Error('Error expone información interna');
    console.log('Función @vercel/node ejecutada en proceso Node 24 aislado: dependencias resueltas y error 503 seguro sin credenciales. No se accedió a Neon.');
  } catch (error) {
    console.error(diagnostic.slice(0, 1800));
    throw error;
  } finally {
    if (child.exitCode === null && child.signalCode === null) await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
  }
}
main().catch(error => { console.error(`Falló el arranque aislado del paquete de Vercel${/^[A-Z0-9_]+$/.test(error.code || '') ? ` (${error.code})` : ''}. No se muestran detalles privados.`); process.exitCode = 1; });
