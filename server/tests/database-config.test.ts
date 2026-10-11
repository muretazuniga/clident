import { test } from 'node:test';
import assert from 'node:assert/strict';
import { databaseUrl, connectionConfig } from '../db/config';
import { migrateDatabase } from '../migrate';
import { getEnv } from '../env';

test('las migraciones no acceden a PostgreSQL sin --apply explícito', async () => {
  await assert.rejects(migrateDatabase(), /--apply/);
});
test('el origen público no admite credenciales, query ni rutas de autenticación ambiguas', () => {
  const previous = { ...process.env };
  try {
    process.env.NODE_ENV = 'test'; process.env.DATABASE_URL = 'postgresql://test:test@localhost/test'; process.env.BETTER_AUTH_SECRET = 'x'.repeat(32);
    for (const url of ['https://user:password@example.test', 'https://example.test/path', 'https://example.test/?token=test', 'file:///tmp']) {
      process.env.BETTER_AUTH_URL = url; assert.throws(getEnv);
    }
    process.env.BETTER_AUTH_URL = 'https://example.test'; assert.equal(getEnv().BETTER_AUTH_URL, 'https://example.test');
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});

test('rechaza conexiones ausentes, protocolos y ejemplos sin revelar credenciales', () => {
  for (const value of [undefined, 'https://private:secret@host/db', 'postgresql://USER:PASSWORD@HOST/DB']) {
    assert.throws(() => databaseUrl(value), error => error instanceof Error && !error.message.includes('secret'));
  }
});
test('Neon valida TLS y distingue la conexión directa', () => {
  const url = 'postgresql://test:test@ep-example-pooler.eu-central-1.aws.neon.tech/test?sslmode=require&channel_binding=require';
  assert.equal(new URL(databaseUrl(url)).searchParams.get('sslmode'), 'verify-full');
  assert.throws(() => databaseUrl(url, true));
  assert.throws(() => databaseUrl(url.replace('sslmode=require', 'sslmode=disable')));
  assert.throws(() => databaseUrl(`${url}&host=other.neon.tech`));
});
test('impide migrar otra base o endpoint y limita el pool', () => {
  const previous = { runtime: process.env.DATABASE_URL, direct: process.env.DATABASE_URL_UNPOOLED };
  try {
    process.env.DATABASE_URL = 'postgresql://test:test@ep-example-pooler.eu-central-1.aws.neon.tech/test';
    process.env.DATABASE_URL_UNPOOLED = 'postgresql://test:test@ep-example.eu-central-1.aws.neon.tech/test';
    assert.equal(connectionConfig().max, 3); assert.equal(connectionConfig(true).max, 1);
    process.env.DATABASE_URL_UNPOOLED += 'other'; assert.throws(() => connectionConfig(true));
  } finally {
    for (const [key, value] of [['DATABASE_URL', previous.runtime], ['DATABASE_URL_UNPOOLED', previous.direct]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  }
});
