import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './db/schema';
import type { Database } from './db';
import { createAuth } from './auth';
import { createApi } from './api';
import { createUser } from './users';
import { createNodeHandler } from './node-handler';
async function main() {
  if (process.env.NODE_ENV !== 'test' || !process.env.CLIDENT_TEST_PASSWORD) throw new Error('Fixture disponible solo en pruebas.');
  process.env.DATABASE_URL = 'postgresql://test:test@localhost/test'; process.env.BETTER_AUTH_URL = 'http://localhost:4173'; process.env.BETTER_AUTH_SECRET = randomBytes(32).toString('hex');
  const pg = new PGlite(); const folder = resolve(import.meta.dirname, '../migrations');
  for (const file of readdirSync(folder).filter(f => f.endsWith('.sql')).sort()) await pg.exec(readFileSync(resolve(folder, file), 'utf8').replaceAll('--> statement-breakpoint', ''));
  const db = drizzle(pg, { schema }) as unknown as Database;
  const admin = await createUser(db, { name: 'Administración de prueba', email: 'admin@example.test', password: process.env.CLIDENT_TEST_PASSWORD, role: 'ADMINISTRADOR' }, null, true);
  const professional = await createUser(db, { name: 'Profesional de prueba', email: 'prof@example.test', password: process.env.CLIDENT_TEST_PASSWORD, role: 'PROFESIONAL' }, admin.id);
  const [p] = await db.insert(schema.profesionales).values({ nombre: 'Profesional', apellido: 'Prueba', especialidad: 'Odontología General', userId: professional.id }).returning();
  const [patient] = await db.insert(schema.pacientes).values({ name: 'Paciente ficticio', rut: '12345678-5', fechaNacimiento: '1990-01-01', email: 'paciente@example.test', phone: '+56911111111' }).returning();
  const [appointment] = await db.insert(schema.citas).values({ pacienteId: patient.id, profesionalId: p.id, fecha: '2026-10-20', hora: '09:00', motivo: 'Control ficticio' }).returning();
  await db.insert(schema.atenciones).values({ citaId: appointment.id, diagnostico: 'Diagnóstico ficticio', tratamiento: 'Tratamiento de prueba' });
  const api = createApi(db, createAuth(db, { sendPasswordReset: async () => {} }));
  const nodeHandler = createNodeHandler(() => api);
  const root = resolve(import.meta.dirname, '../www');
  const securityHeaders = JSON.parse(readFileSync(resolve(import.meta.dirname, '../vercel.json'), 'utf8')).headers[0].headers as { key: string; value: string }[];
  const server = createServer(async (req, res) => {
    try {
      for (const header of securityHeaders) res.setHeader(header.key, header.value);
      if (req.url === '/api' || req.url?.startsWith('/api/')) {
        await nodeHandler(req, res); return;
      }
      const candidate = resolve(root, `.${new URL(req.url || '/', 'http://localhost:4173').pathname}`);
      const file = candidate.startsWith(root + '/') || candidate.startsWith(root + '\\') ? (existsSync(candidate) && extname(candidate) ? candidate : resolve(root, 'index.html')) : resolve(root, 'index.html');
      const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
      res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store'); res.end(readFileSync(file));
    } catch { res.statusCode = 500; res.end('Fixture error'); }
  });
  server.listen(4173, '127.0.0.1', () => console.log('Fixture lista'));
}
main().catch(() => { console.error('No se pudo iniciar la fixture.'); process.exit(1); });
