import type { PoolConfig } from 'pg';

export function databaseUrl(value: string | undefined, direct = false): string {
  let url: URL;
  try { url = new URL(value || ''); } catch { throw new Error('Configura una conexión PostgreSQL válida en .env.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || url.pathname.length < 2
    || ['HOST', 'DIRECT_HOST'].includes(url.hostname.toUpperCase()) || url.username === 'USER' || url.password === 'PASSWORD') {
    throw new Error('Configura una conexión PostgreSQL válida en .env.');
  }
  if (['host', 'port', 'user', 'password', 'dbname', 'database'].some(key => url.searchParams.has(key))) {
    throw new Error('La conexión debe definir endpoint y credenciales en la URL, sin parámetros que los sustituyan.');
  }
  const neon = url.hostname.endsWith('.neon.tech');
  if (direct && neon && url.hostname.includes('-pooler.')) throw new Error('DATABASE_URL_UNPOOLED debe utilizar la conexión directa de Neon.');
  if (neon || process.env.NODE_ENV === 'production') {
    if (url.searchParams.has('sslmode') && !['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode')!)) {
      throw new Error('La conexión remota requiere TLS con validación de certificado.');
    }
    url.searchParams.set('sslmode', 'verify-full');
    url.searchParams.delete('uselibpqcompat');
  }
  return url.toString();
}

export function connectionConfig(migration = false): PoolConfig {
  const runtime = databaseUrl(process.env.DATABASE_URL);
  const connectionString = migration ? databaseUrl(process.env.DATABASE_URL_UNPOOLED || runtime, true) : runtime;
  if (migration && process.env.DATABASE_URL_UNPOOLED) {
    const a = new URL(runtime), b = new URL(connectionString);
    if (a.hostname.replace('-pooler.', '.') !== b.hostname || a.pathname !== b.pathname || a.username !== b.username) {
      throw new Error('Las conexiones directa y agrupada deben corresponder al mismo endpoint, base y usuario.');
    }
  }
  return { connectionString, max: migration ? 1 : 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000,
    enableChannelBinding: true };
}
