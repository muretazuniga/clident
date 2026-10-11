const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const cli = resolve('node_modules/vercel/dist/index.js');
if (!existsSync(cli)) {
  console.log('Vercel CLI local no instalada.');
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, [cli, 'whoami'], {
    env: { ...process.env, CI: '1', VERCEL_TELEMETRY_DISABLED: '1' }, encoding: 'utf8', timeout: 30000
  });
  console.log(result.status === 0 ? 'Vercel: sesión autenticada disponible.' : 'Vercel: no se confirmó una sesión autenticada; requiere login o acceso de cuenta.');
  console.log(existsSync('.vercel/project.json') ? 'Proyecto vinculado localmente.' : 'Proyecto sin vinculación local.');
  console.log('No se ejecutaron vinculación, descarga de variables ni despliegues.');
}
