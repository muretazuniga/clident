const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { parse } = require('../server/node_modules/dotenv');
const environment = existsSync('.env') ? parse(readFileSync('.env')) : {};
const values = Object.entries(environment).filter(([key, value]) => /^(DATABASE_URL|DATABASE_URL_UNPOOLED|BETTER_AUTH_SECRET|SMTP_PASSWORD|BOOTSTRAP_PASSWORD)$/.test(key) && value.length >= 8).map(([, value]) => value);
for (const key of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED']) {
  try { const password = decodeURIComponent(new URL(environment[key]).password); if (password.length >= 8) values.push(password); } catch {}
}
let count = 0;
function scan(directory) {
  for (const file of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, file.name);
    if (file.name === '.env' || file.name.startsWith('.env.')) throw new Error('Archivo privado incluido');
    if (file.isDirectory()) scan(path);
    else {
      count++;
      const content = readFileSync(path).toString('utf8');
      if (values.some(value => content.includes(value))) throw new Error('Secreto detectado en artefacto');
    }
  }
}
try {
  scan('www'); scan('artifacts/vercel-function');
  console.log(`Verificados ${count} archivos de frontend y Function: sin .env ni coincidencias de secretos configurados. No se mostraron valores privados.`);
} catch { console.error('Falló la revisión de secretos en artefactos. No publiques los archivos hasta resolverlo.'); process.exitCode = 1; }
