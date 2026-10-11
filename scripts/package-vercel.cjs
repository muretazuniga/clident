const { build } = require('@vercel/node');
const { FileFsRef } = require('@vercel/build-utils');
const { resolve, join } = require('node:path');
const { mkdirSync, writeFileSync, readFileSync } = require('node:fs');
const { pipeline } = require('node:stream/promises');
const { createWriteStream } = require('node:fs');

async function main() {
  const root = resolve('.');
  const source = ['api/index.mjs', 'server/dist/api.mjs', 'package.json', 'vercel.json', 'server/package.json'];
  const files = Object.fromEntries(source.map(path => [path, new FileFsRef({ fsPath: join(root, path) })]));
  const settings = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const result = await build({ files, entrypoint: 'api/index.mjs', workPath: root, repoRootPath: root,
    config: { zeroConfig: true, projectSettings: { nodeVersion: '24.x', installCommand: '', buildCommand: 'node --version' },
      excludeFiles: settings.functions['api/**/*.mjs'].excludeFiles },
    meta: { skipDownload: true }, considerBuildCommand: true });
  const lambda = result.output;
  console.log(`Salida del constructor: ${result.output?.type || 'mapa de funciones'}; runtime ${result.output?.runtime || 'no disponible'}; archivos ${Object.keys(result.output?.files || {}).length}.`);
  if (!lambda?.files || lambda.runtime !== 'nodejs24.x') throw new Error('El constructor no generó una función Node 24.');
  const destination = resolve('artifacts/vercel-function');
  for (const [name, file] of Object.entries(lambda.files)) {
    if (name.replaceAll('\\', '/').split('/').some(part => part === '..' || part === '.git' || part.startsWith('.env')) || name.includes('browser-fixture')) {
      console.error(`Archivo rechazado (solo nombre): ${name}`);
      throw new Error('Archivo privado o de prueba en el empaquetado.');
    }
    const target = resolve(destination, name);
    if (!target.startsWith(destination + require('node:path').sep)) throw new Error('Ruta de empaquetado inválida.');
    mkdirSync(require('node:path').dirname(target), { recursive: true });
    await pipeline(file.toStream(), createWriteStream(target));
  }
  writeFileSync(join(destination, '.vc-config.json'), JSON.stringify({ runtime: lambda.runtime, handler: lambda.handler, launcherType: 'Nodejs' }, null, 2));
  writeFileSync(resolve('artifacts/vercel-package.json'), JSON.stringify({ runtime: lambda.runtime, handler: lambda.handler, files: Object.keys(lambda.files).length, checked: 'sin archivos .env ni fixture de pruebas', scope: 'Constructor @vercel/node local; no sustituye vercel build ni despliegue público' }, null, 2));
  console.log(`Constructor @vercel/node: ${lambda.runtime}, ${Object.keys(lambda.files).length} archivos, sin .env ni fixtures. No se vinculó ni desplegó ningún proyecto.`);
}
main().catch(error => {
  console.error('El empaquetado local de la función falló. No se muestran variables ni secretos.');
  if (/^(El constructor|Archivo privado|Ruta de empaquetado)/.test(error.message)) console.error(error.message);
  else console.error(`Tipo de error: ${error.constructor?.name || 'Error'}; código ${/^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'sin código'}.`);
  process.exitCode = 1;
});
