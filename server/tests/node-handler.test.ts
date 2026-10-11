import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import { createNodeHandler } from '../node-handler';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function run(parsed: unknown, operation: (url: string) => Promise<void>, fail = false) {
  const adapter = createNodeHandler(() => async request => {
    if (fail) throw new Error('Información privada que no debe salir');
    const response = Response.json({ path: new URL(request.url).pathname, body: request.method === 'GET' ? null : await request.json() });
    response.headers.append('set-cookie', 'session=synthetic; HttpOnly; Secure; SameSite=Lax');
    response.headers.append('set-cookie', 'secondary=synthetic; HttpOnly; Secure; SameSite=Lax');
    return response;
  }, () => 'https://clident.example.test');
  const server = createServer((req, res) => {
    if (parsed !== undefined) (req as IncomingMessage & { body?: unknown }).body = parsed;
    void adapter(req, res);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await operation(`http://127.0.0.1:${(server.address() as { port: number }).port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
test('adapter conserva cuerpo JSON, rutas y múltiples cookies de Vercel', async () => {
  for (const value of [{ value: 'test' }, '{"value":"test"}', Buffer.from('{"value":"test"}'), undefined]) {
    await run(value, async url => {
      const response = await fetch(`${url}/api/auth/sign-in/email`, { method: 'POST', body: '{"value":"test"}', headers: { 'content-type': 'application/json' } });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { path: '/api/auth/sign-in/email', body: { value: 'test' } });
      assert.equal(response.headers.getSetCookie().length, 2);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    });
  }
});
test('adapter limita cuerpos de autenticación y formularios a 1 MB', async () => {
  await run('a'.repeat(1024 * 1024 + 1), async url => {
    assert.equal((await fetch(`${url}/api/auth/sign-in/email`, { method: 'POST', body: '{}' })).status, 413);
  });
  await run(undefined, async url => {
    assert.equal((await fetch(`${url}/api/pacientes`, { method: 'POST', body: 'a'.repeat(1024 * 1024 + 1) })).status, 413);
  });
});
test('adapter no filtra errores internos al cliente', async () => {
  await run(undefined, async url => {
    const response = await fetch(`${url}/api/me`);
    assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('Información privada'));
  }, true);
});
test('fallback SPA excluye /api, endpoints y archivos estáticos', () => {
  const config = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../vercel.json'), 'utf8'));
  const route = new RegExp(`^${config.rewrites[0].source}$`);
  for (const path of ['/api', '/api/me', '/api/auth/sign-in/email', '/assets/logo.svg', '/main.js']) assert.equal(route.test(path), false, path);
  for (const path of ['/', '/login', '/pacientes', '/administracion']) assert.equal(route.test(path), true, path);
});
