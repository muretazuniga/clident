const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const project = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
const cli = resolve('node_modules/vercel/dist/index.js');
const endpoint = `/v9/projects/${project.projectId}?teamId=${project.orgId}`;
const result = spawnSync(process.execPath, [cli, 'api', endpoint], { encoding: 'utf8', timeout: 30000 });
if (result.status !== 0) { console.error('No se pudo consultar el proyecto.'); process.exit(1); }
const settings = JSON.parse(result.stdout);
console.log(`Git conectado: ${Boolean(settings.link)}`);
console.log(`Protección Vercel SSO: ${Boolean(settings.ssoProtection)}`);
if (process.argv.includes('--public') && settings.ssoProtection) {
  const update = spawnSync(process.execPath, [cli, 'api', endpoint, '--method', 'PATCH', '--input', '-', '--silent'], {
    input: JSON.stringify({ ssoProtection: null }), encoding: 'utf8', timeout: 30000
  });
  if (update.status !== 0) { console.error('No se pudo habilitar el acceso público al Preview.'); process.exit(1); }
  console.log('Acceso público habilitado; Better Auth protege los módulos privados.');
}
