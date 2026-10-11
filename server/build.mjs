import { build } from 'esbuild';
await build({ entryPoints: ['vercel-entry.ts'], outfile: 'dist/api.mjs', bundle: true, packages: 'external', platform: 'node', format: 'esm', target: 'node24', logLevel: 'warning' });
console.log('Backend compilado en server/dist/api.mjs');
