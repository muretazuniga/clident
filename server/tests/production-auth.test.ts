import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '../db/schema';
import type { Database } from '../db';
import { createUser } from '../users';
import { createAuth } from '../auth';
import { createApi } from '../api';

test('HTTPS de producción emite cookies Secure/HttpOnly y sesiones con expiración y revocación', async () => {
  const previous = { ...process.env };
  const pg = new PGlite();
  try {
    process.env.NODE_ENV = 'production'; process.env.BETTER_AUTH_URL = 'https://clident.example.test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test'; process.env.BETTER_AUTH_SECRET = randomBytes(32).toString('base64');
    for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM']) delete process.env[key];
    const directory = resolve(import.meta.dirname, '../../migrations');
    for (const file of readdirSync(directory).filter(file => file.endsWith('.sql')).sort()) await pg.exec(readFileSync(resolve(directory, file), 'utf8').replaceAll('--> statement-breakpoint', ''));
    const db = drizzle(pg, { schema }) as unknown as Database;
    const password = randomBytes(24).toString('hex');
    await createUser(db, { name: 'Prueba HTTPS', email: 'https@example.test', password, role: 'ADMINISTRADOR' }, null, true);
    const handler = createApi(db, createAuth(db));
    const request = (path: string, method = 'GET', data?: unknown, cookie = '') => handler(new Request(`https://clident.example.test/api/${path}`, { method, headers: { origin: 'https://clident.example.test', cookie, ...(data ? { 'content-type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) }));
    const login = await request('auth/sign-in/email', 'POST', { email: 'https@example.test', password });
    assert.equal(login.status, 200);
    const cookies = login.headers.getSetCookie();
    assert.ok(cookies.some(cookie => cookie.includes('__Secure-') && cookie.includes('HttpOnly') && /; Secure/i.test(cookie) && /SameSite=Lax/i.test(cookie)));
    const cookie = cookies.map(value => value.split(';')[0]).join('; ');
    const [session] = await db.select().from(schema.session);
    assert.ok(session.expiresAt.getTime() > Date.now() + 7 * 60 * 60 * 1000);
    assert.ok(session.expiresAt.getTime() <= Date.now() + 8 * 60 * 60 * 1000);
    assert.equal((await request('me', 'GET', undefined, cookie)).status, 200);
    assert.equal((await request('auth/sign-out', 'POST', {}, cookie)).status, 200);
    assert.equal((await request('me', 'GET', undefined, cookie)).status, 401);
    assert.equal((await db.select().from(schema.session)).length, 0);
    assert.equal((await request('auth/request-password-reset', 'POST', { email: 'https@example.test' })).status, 503);
  } finally {
    await pg.close();
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
