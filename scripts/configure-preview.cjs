const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { parse } = require('../server/node_modules/dotenv');
const env = parse(readFileSync('.env'));
const project = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
const origin = `https://clident-preview-${project.projectId.slice(-10).toLowerCase()}.vercel.app`;
const values = { DATABASE_URL: env.DATABASE_URL, BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET, BETTER_AUTH_URL: origin, NODE_ENV: 'production' };
for (const [name, value] of Object.entries(values)) {
  if (!value) throw new Error(`Falta ${name}`);
  const result = spawnSync(process.execPath, [resolve('node_modules/vercel/dist/index.js'), 'env', 'add', name, 'preview', '--yes'], {
    input: value, encoding: 'utf8', env: { ...process.env, VERCEL_TELEMETRY_DISABLED: '1' }, timeout: 60000
  });
  if (result.status !== 0) { console.error(`No se pudo configurar ${name}; revisa el estado de Vercel sin imprimir valores.`); process.exit(1); }
  console.log(`${name}: configurada para Preview.`);
}
console.log(`Origen previsto para Preview: ${origin}`);
