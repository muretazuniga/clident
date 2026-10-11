import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { Database } from '../db';
import { createAuth } from '../auth';
import { createApi } from '../api';
import { createUser } from '../users';
import { validRut, validDate } from '../validation';
const origin = 'http://localhost:4200';
let pg: PGlite, db: Database, handler: ReturnType<typeof createApi>, cookie = '', profCookie = '', otherCookie = '';
let adminId = '', profUserId = '', profId = 0, otherProfId = 0, patientId = 0, appointmentId = 0, encounterId = 0;
let resetToken = '';
const password = 'Prueba-local-segura-2026';
async function request(path: string, method = 'GET', data?: unknown, session = cookie, headers: Record<string, string> = {}) {
  return handler(new Request(`${origin}/api/${path}`, { method, headers: { origin, ...(session ? { cookie: session } : {}), ...(data !== undefined ? { 'content-type': 'application/json' } : {}), ...headers }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) }));
}
async function login(email: string) {
  const res = await request('auth/sign-in/email', 'POST', { email, password }, ''); assert.equal(res.status, 200, await res.clone().text());
  assert.ok(res.headers.get('set-cookie')?.includes('HttpOnly'));
  assert.ok(res.headers.get('set-cookie')?.includes('SameSite=Lax'));
  return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
}
before(async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost/test'; process.env.BETTER_AUTH_URL = origin; process.env.BETTER_AUTH_SECRET = randomBytes(32).toString('hex'); process.env.NODE_ENV = 'test';
  pg = new PGlite();
  const folder = resolve(import.meta.dirname, '../../migrations');
  for (const file of readdirSync(folder).filter(f => f.endsWith('.sql')).sort()) await pg.exec(readFileSync(resolve(folder, file), 'utf8').replaceAll('--> statement-breakpoint', ''));
  db = drizzle(pg, { schema }) as unknown as Database;
  const auth = createAuth(db, { sendPasswordReset: async data => { resetToken = data.token; } }); handler = createApi(db, auth);
  adminId = (await createUser(db, { name: 'Administrador de prueba', email: 'admin@example.test', password, role: 'ADMINISTRADOR' }, null, true)).id;
  profUserId = (await createUser(db, { name: 'Profesional de prueba', email: 'prof@example.test', password, role: 'PROFESIONAL' }, adminId)).id;
  const other = await createUser(db, { name: 'Otra cuenta de prueba', email: 'other@example.test', password, role: 'PROFESIONAL' }, adminId);
  cookie = await login('admin@example.test'); profCookie = await login('prof@example.test'); otherCookie = await login('other@example.test');
  const p = await request('profesionales', 'POST', { nombre: 'Profesional', apellido: 'Prueba', especialidad: 'Odontología General', userId: profUserId }); assert.equal(p.status, 201); profId = (await p.json()).id;
  const o = await request('profesionales', 'POST', { nombre: 'Otra', apellido: 'Prueba', especialidad: 'Ortodoncia', userId: other.id }); assert.equal(o.status, 201); otherProfId = (await o.json()).id;
});
after(async () => { await pg?.close(); });
test('valida RUT y fechas reales', () => { assert.ok(validRut('12.345.678-5')); assert.equal(validRut('12345678-0'), false); assert.equal(validDate.safeParse('2026-02-30').success, false); });
test('rechaza solicitudes sin sesión y evita CSRF', async () => {
  assert.equal((await request('pacientes', 'GET', undefined, '')).status, 401);
  assert.equal((await request('pacientes', 'POST', {}, cookie, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await request('auth/sign-out', 'POST', {}, cookie, { origin: 'https://evil.example' })).status, 403);
});
test('bloquea registro público y cambios de privilegios por autenticación', async () => {
  assert.equal((await request('auth/sign-up/email', 'POST', { email: 'attacker@example.test', password, name: 'Prueba', role: 'ADMINISTRADOR' }, '')).status, 404);
  assert.equal((await request('auth/update-user', 'POST', { role: 'ADMINISTRADOR' }, profCookie)).status, 404);
  assert.equal((await request('users', 'GET', undefined, profCookie)).status, 403);
});
test('inicialización solo una vez y contraseñas cifradas con hash', async () => {
  await assert.rejects(() => createUser(db, { name: 'Otra', email: 'second@example.test', password, role: 'ADMINISTRADOR' }, null, true));
  const [credential] = await db.select().from(schema.account).where(eq(schema.account.userId, adminId)); assert.notEqual(credential.password, password); assert.ok(credential.password?.length);
});
test('crea pacientes, valida entradas estrictas y previene duplicados', async () => {
  const input = { name: 'Paciente ficticio', rut: '12.345.678-5', fechaNacimiento: '1990-01-01', email: 'patient@example.test', phone: '+56911111111' };
  assert.equal((await request('pacientes', 'POST', { ...input, role: 'ADMINISTRADOR' })).status, 400);
  const res = await request('pacientes', 'POST', input); assert.equal(res.status, 201); patientId = (await res.json()).id;
  assert.equal((await request('pacientes', 'POST', input)).status, 409);
  assert.equal((await request('pacientes', 'POST', input, profCookie)).status, 403);
  assert.deepEqual(await (await request('pacientes', 'GET', undefined, profCookie)).json(), []);
});
test('agenda con relaciones válidas, horario único y ámbito profesional', async () => {
  const input = { pacienteId: patientId, profesionalId: profId, fecha: '2026-10-20', hora: '09:00', motivo: 'Control ficticio' };
  const res = await request('citas', 'POST', input); assert.equal(res.status, 201); appointmentId = (await res.json()).id;
  assert.equal((await request('citas', 'POST', input)).status, 409);
  assert.equal((await request('citas', 'POST', { ...input, pacienteId: 999999, hora: '09:30' })).status, 409);
  assert.equal((await request('citas', 'POST', { ...input, profesionalId: otherProfId }, profCookie)).status, 403);
  assert.equal((await request(`pacientes/${patientId}`, 'GET', undefined, otherCookie)).status, 404);
  assert.equal((await request(`citas/${appointmentId}`, 'GET', undefined, otherCookie)).status, 404);
  assert.equal((await request('pacientes', 'GET', undefined, profCookie)).status, 200);
});
test('actualización de paciente asignado y conflicto entre ediciones', async () => {
  const current = await (await request(`pacientes/${patientId}`)).json();
  const data = { name: 'Paciente actualizado', rut: current.rut, fechaNacimiento: current.fechaNacimiento, email: current.email, phone: current.phone };
  assert.equal((await request(`pacientes/${patientId}`, 'PATCH', data, profCookie)).status, 409);
  assert.equal((await request(`pacientes/${patientId}`, 'PATCH', data, profCookie, { 'if-unmodified-since': current.updatedAt })).status, 200);
  assert.equal((await request(`pacientes/${patientId}`, 'PATCH', data, cookie, { 'if-unmodified-since': current.updatedAt })).status, 409);
});
test('atenciones derivan relaciones de la cita y el historial respeta el ámbito', async () => {
  const input = { citaId: appointmentId, diagnostico: 'Diagnóstico de prueba', tratamiento: 'Tratamiento ficticio', observaciones: '' };
  assert.equal((await request('atenciones', 'POST', input, otherCookie)).status, 404);
  const res = await request('atenciones', 'POST', input, profCookie); assert.equal(res.status, 201); encounterId = (await res.json()).id;
  assert.equal((await request('atenciones', 'POST', input, profCookie)).status, 409);
  const history = await (await request(`pacientes/${patientId}/historial`, 'GET', undefined, profCookie)).json(); assert.equal(history.length, 1); assert.equal(history[0].profesionalId, profId);
  assert.equal((await request(`pacientes/${patientId}/historial`, 'GET', undefined, otherCookie)).status, 404);
  const current = await (await request(`citas/${appointmentId}`)).json();
  assert.equal((await request(`citas/${appointmentId}`, 'DELETE', undefined, cookie, { 'if-unmodified-since': current.updatedAt })).status, 409);
  assert.equal((await request(`citas/${appointmentId}`, 'PATCH', { pacienteId: patientId, profesionalId: profId, fecha: '2026-10-21', hora: '09:00', motivo: 'Prueba' }, cookie, { 'if-unmodified-since': current.updatedAt })).status, 409);
});
test('integridad impide eliminar pacientes relacionados y audita sin contenido clínico', async () => {
  const p = await (await request(`pacientes/${patientId}`)).json();
  assert.equal((await request(`pacientes/${patientId}`, 'DELETE', undefined, cookie, { 'if-unmodified-since': p.updatedAt })).status, 409);
  const log = await (await request('audit')).json(); assert.ok(log.length > 0); assert.ok(log.every((row: object) => !('diagnostico' in row) && !('password' in row)));
});
test('dashboard aplica el ámbito clínico y auditoría exige administrador', async () => {
  const admin = await (await request('dashboard')).json();
  const own = await (await request('dashboard', 'GET', undefined, profCookie)).json();
  const other = await (await request('dashboard', 'GET', undefined, otherCookie)).json();
  assert.deepEqual(admin.counts, { pacientes: 1, citas: 1, atenciones: 1 });
  assert.deepEqual(own.counts, admin.counts);
  assert.deepEqual(other.counts, { pacientes: 0, citas: 0, atenciones: 0 });
  assert.ok(own.upcoming.every((appointment: { profesionalId: number }) => appointment.profesionalId === profId));
  assert.equal((await request('audit', 'GET', undefined, profCookie)).status, 403);
});
test('completa CRUD profesional y paciente sin relaciones', async () => {
  const res = await request('profesionales', 'POST', { nombre: 'Temporal', apellido: 'Ficticio', especialidad: 'Ortodoncia', userId: null }); assert.equal(res.status, 201);
  const temporary = await res.json();
  assert.equal((await request(`profesionales/${temporary.id}`, 'PATCH', { nombre: 'Temporal', apellido: 'Actualizado', especialidad: 'Endodoncia', userId: null }, profCookie, { 'if-unmodified-since': temporary.updatedAt })).status, 403);
  const updated = await request(`profesionales/${temporary.id}`, 'PATCH', { nombre: 'Temporal', apellido: 'Actualizado', especialidad: 'Endodoncia', userId: null }, cookie, { 'if-unmodified-since': temporary.updatedAt }); assert.equal(updated.status, 200);
  assert.equal((await request(`profesionales/${temporary.id}`, 'DELETE', undefined, cookie, { 'if-unmodified-since': (await updated.json()).updatedAt })).status, 200);
  assert.equal((await request(`profesionales/${temporary.id}`)).status, 404);
  const p = await request('pacientes', 'POST', { name: 'Temporal ficticio', rut: '22222222-2', fechaNacimiento: '1980-01-01', email: 'temporal@example.test', phone: '+56933333333' }); assert.equal(p.status, 201);
  const patient = await p.json(); assert.equal((await request(`pacientes/${patient.id}`, 'DELETE', undefined, cookie, { 'if-unmodified-since': patient.updatedAt })).status, 200);
});
test('CRUD cita y atención exige propiedad, versiones y referencias consistentes', async () => {
  const input = { pacienteId: patientId, profesionalId: profId, fecha: '2026-10-22', hora: '09:00', motivo: 'Control ficticio' };
  const created = await request('citas', 'POST', input, profCookie); assert.equal(created.status, 201); const appointment = await created.json();
  const changed = await request(`citas/${appointment.id}`, 'PATCH', { ...input, hora: '09:30' }, profCookie, { 'if-unmodified-since': appointment.updatedAt }); assert.equal(changed.status, 200);
  const encounter = await request('atenciones', 'POST', { citaId: appointment.id, diagnostico: 'Prueba', tratamiento: 'Prueba', observaciones: '' }, profCookie); assert.equal(encounter.status, 201); const e = await encounter.json();
  assert.equal((await request(`atenciones/${e.id}`, 'PATCH', { citaId: appointmentId, diagnostico: 'Prueba', tratamiento: 'Prueba', observaciones: '' }, profCookie, { 'if-unmodified-since': e.updatedAt })).status, 409);
  const patched = await request(`atenciones/${e.id}`, 'PATCH', { citaId: appointment.id, diagnostico: 'Prueba actualizada', tratamiento: 'Prueba', observaciones: '' }, profCookie, { 'if-unmodified-since': e.updatedAt }); assert.equal(patched.status, 200); const version = (await patched.json()).updatedAt;
  assert.equal((await request(`atenciones/${e.id}`, 'DELETE', undefined, otherCookie, { 'if-unmodified-since': version })).status, 404);
  assert.equal((await request(`atenciones/${e.id}`, 'DELETE', undefined, profCookie, { 'if-unmodified-since': version })).status, 200);
  assert.equal((await request(`citas/${appointment.id}`, 'DELETE', undefined, profCookie, { 'if-unmodified-since': (await changed.json()).updatedAt })).status, 200);
});
test('importación controlada atómica, respaldo obligatorio y duplicados', async () => {
  const input = { confirmed: true, backupConfirmed: true, pacientes: [{ id: 100, name: 'Paciente importado ficticio', rut: '11111111-1', fechaNacimiento: '1980-01-01', email: 'legacy@example.test', phone: '+56911111111' }], profesionales: [], citas: [], atenciones: [] };
  assert.equal((await request('legacy/import', 'POST', { ...input, backupConfirmed: false })).status, 400);
  assert.equal((await request('legacy/import', 'POST', input, profCookie)).status, 403);
  assert.equal((await request('legacy/import', 'POST', { ...input, citas: [{ id: 100, pacienteId: 100, profesionalId: 999, fecha: '2026-10-20', hora: '10:00', motivo: 'Prueba' }] })).status, 400);
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.pacientes); assert.equal(count.count, 1);
  assert.equal((await request('legacy/import', 'POST', input)).status, 201);
  assert.equal((await request('legacy/import', 'POST', input)).status, 409);
});
test('foto de perfil rechaza SVG y permite formatos raster limitados', async () => {
  assert.equal((await request('me', 'PATCH', { image: 'data:image/svg+xml;base64,PHN2Zz4=' })).status, 400);
  assert.equal((await request('me', 'PATCH', { image: null })).status, 200);
});
test('recuperación usa token de un solo uso y revoca sesiones', async () => {
  const res = await request('auth/request-password-reset', 'POST', { email: 'other@example.test', redirectTo: `${origin}/login` }, ''); assert.equal(res.status, 200); assert.ok(resetToken);
  const payload = { token: resetToken, newPassword: 'Clave-nueva-segura-2026' };
  assert.equal((await request('auth/reset-password', 'POST', payload, '')).status, 200);
  assert.equal((await request('auth/reset-password', 'POST', payload, '')).status, 400);
  assert.equal((await request('me', 'GET', undefined, otherCookie)).status, 401);
});
test('cambio de contraseña exige contraseña actual', async () => {
  assert.equal((await request('auth/change-password', 'POST', { currentPassword: 'incorrecta', newPassword: 'Nueva-clave-segura-2026', revokeOtherSessions: true }, profCookie)).status, 400);
  assert.equal((await request('auth/change-password', 'POST', { currentPassword: password, newPassword: 'Nueva-clave-segura-2026', revokeOtherSessions: true }, profCookie)).status, 200);
});
test('desactivar cuenta revoca sesiones y bloquea credenciales', async () => {
  assert.equal((await request(`users/${profUserId}`, 'PATCH', { name: 'Profesional prueba', role: 'PROFESIONAL', active: false })).status, 200);
  assert.equal((await request('me', 'GET', undefined, profCookie)).status, 401);
  assert.equal((await request('auth/sign-in/email', 'POST', { email: 'prof@example.test', password: 'Nueva-clave-segura-2026' }, '')).status, 401);
  assert.equal((await request(`users/${adminId}`, 'PATCH', { name: 'Admin', role: 'PROFESIONAL', active: false })).status, 409);
});
test('sesiones expiran en backend y logout revoca la sesión', async () => {
  const fresh = await login('admin@example.test');
  assert.equal((await request('auth/sign-out', 'POST', {}, fresh)).status, 200);
  assert.equal((await request('me', 'GET', undefined, fresh)).status, 401);
  await db.update(schema.session).set({ expiresAt: new Date(0) }).where(eq(schema.session.userId, adminId));
  assert.equal((await request('me')).status, 401);
});
test('protege login con rate limit persistente', async () => {
  const codes: number[] = [];
  for (let i = 0; i < 7; i++) codes.push((await request('auth/sign-in/email', 'POST', { email: 'unknown@example.test', password }, '')).status);
  assert.ok(codes.includes(429)); assert.ok((await db.select().from(schema.rateLimit)).length > 0);
});
