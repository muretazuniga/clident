import { and, eq, exists, sql, desc, gte } from 'drizzle-orm';
import { ZodError, z } from 'zod';
import type { Database } from './db';
import type { Auth } from './auth';
import * as s from './db/schema';
import { getEnv } from './env';
import { Actor, isAdmin, ownsProfessional, permissions } from './permissions';
import { importLegacy } from './legacy';
import { pacienteInput, profesionalInput, citaInput, atencionInput, userUpdate, imageInput } from './validation';
import { createUser } from './users';

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
function fail(status: number, message: string): never { throw new HttpError(status, message); }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export function assertOrigin(request: Request, origin: string) {
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('origin') !== origin) fail(403, 'Origen de solicitud no permitido.');
}
async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'Se requiere JSON.');
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 1024 * 1024) fail(413, 'Solicitud demasiado grande.');
  try { return JSON.parse(raw); } catch { return fail(400, 'JSON no válido.'); }
}
const userFields = { id: s.user.id, name: s.user.name, email: s.user.email, role: s.user.role, active: s.user.active, emailVerified: s.user.emailVerified, image: s.user.image };
const clinicalFields = { id: s.atenciones.id, citaId: s.atenciones.citaId, pacienteId: s.citas.pacienteId, profesionalId: s.citas.profesionalId, paciente: s.pacientes.name, profesional: sql<string>`${s.profesionales.nombre} || ' ' || ${s.profesionales.apellido}`, fecha: s.citas.fecha, diagnostico: s.atenciones.diagnostico, tratamiento: s.atenciones.tratamiento, observaciones: s.atenciones.observaciones, updatedAt: s.atenciones.updatedAt };
const appointmentFields = { id: s.citas.id, pacienteId: s.citas.pacienteId, profesionalId: s.citas.profesionalId, paciente: s.pacientes.name, profesional: sql<string>`${s.profesionales.nombre} || ' ' || ${s.profesionales.apellido}`, especialidad: s.profesionales.especialidad, fecha: s.citas.fecha, hora: sql<string>`to_char(${s.citas.hora}, 'HH24:MI')`, motivo: s.citas.motivo, updatedAt: s.citas.updatedAt };

export function createApi(db: Database, auth: Auth) {
  const origin = new URL(getEnv().BETTER_AUTH_URL).origin;
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url); const path = url.pathname.replace(/\/$/, '');
      assertOrigin(request, origin);
      if (path.startsWith('/api/auth/')) {
        const allowed = ['sign-in/email', 'sign-out', 'get-session', 'request-password-reset', 'reset-password', 'change-password', 'revoke-session', 'revoke-sessions', 'list-sessions'];
        if (!allowed.includes(path.slice('/api/auth/'.length))) fail(404, 'Endpoint no disponible.');
        if (path === '/api/auth/request-password-reset' && typeof auth.options.emailAndPassword?.sendResetPassword !== 'function') fail(503, 'La recuperación de contraseña no está disponible. Contacta con administración.');
        const response = await auth.handler(request); response.headers.set('Cache-Control', 'no-store'); return response;
      }
      const sess = await auth.api.getSession({ headers: request.headers });
      if (!sess) fail(401, 'La sesión expiró. Inicia sesión nuevamente.');
      const [u] = await db.select(userFields).from(s.user).where(eq(s.user.id, sess.user.id));
      if (!u?.active) fail(401, 'La sesión no está disponible.');
      const [prof] = await db.select({ id: s.profesionales.id }).from(s.profesionales).where(eq(s.profesionales.userId, u.id));
      const actor: Actor = { id: u.id, role: u.role as Actor['role'], profesionalId: prof?.id ?? null };
      const admin = () => { if (!isAdmin(actor)) fail(403, 'No tienes permiso para esta operación.'); };
      const patientScope = isAdmin(actor) ? undefined : exists(db.select({ id: s.citas.id }).from(s.citas).where(and(eq(s.citas.pacienteId, s.pacientes.id), eq(s.citas.profesionalId, actor.profesionalId ?? -1))));
      const ownScope = isAdmin(actor) ? undefined : eq(s.citas.profesionalId, actor.profesionalId ?? -1);
      if (path === '/api/dashboard' && request.method === 'GET') {
        const [patients] = await db.select({ count: sql<number>`count(*)::int` }).from(s.pacientes).where(patientScope);
        const [appointments] = await db.select({ count: sql<number>`count(*)::int` }).from(s.citas).where(ownScope);
        const [encounters] = await db.select({ count: sql<number>`count(*)::int` }).from(s.atenciones).innerJoin(s.citas, eq(s.atenciones.citaId, s.citas.id)).where(ownScope);
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const upcoming = await db.select(appointmentFields).from(s.citas).innerJoin(s.pacientes, eq(s.citas.pacienteId, s.pacientes.id)).innerJoin(s.profesionales, eq(s.citas.profesionalId, s.profesionales.id)).where(and(ownScope, gte(s.citas.fecha, today))).orderBy(s.citas.fecha, s.citas.hora).limit(5);
        return json({ counts: { pacientes: patients.count, citas: appointments.count, atenciones: encounters.count }, upcoming });
      }
      const [,, resource, rawId, subresource] = path.split('/');
      const numericId = rawId && ['pacientes', 'profesionales', 'citas', 'atenciones'].includes(resource) ? z.coerce.number().int().positive().parse(rawId) : undefined;
      if (path === '/api/me' && request.method === 'GET') return json(u);
      if (path === '/api/me' && request.method === 'PATCH') {
        const data = imageInput.parse(await body(request));
        await db.update(s.user).set({ ...data, updatedAt: new Date() }).where(eq(s.user.id, actor.id));
        return json({ success: true });
      }
      if (resource === 'users') {
        admin();
        if (request.method === 'GET' && !rawId) return json(await db.select(userFields).from(s.user).orderBy(s.user.name));
        if (request.method === 'POST' && !rawId) return json(await createUser(db, await body(request), actor.id), 201);
        if (request.method === 'PATCH' && rawId) {
          const data = userUpdate.parse(await body(request));
          if (rawId === actor.id && (!data.active || data.role !== 'ADMINISTRADOR')) fail(409, 'No puedes desactivar ni cambiar el rol de tu propia cuenta.');
          const updated = await db.transaction(async tx => {
            await tx.execute(sql`SELECT pg_advisory_xact_lock(728109)`);
            await tx.execute(sql`SELECT pg_advisory_xact_lock(728110)`);
            const [administrator] = await tx.select().from(s.user).where(eq(s.user.id, actor.id));
            if (!administrator?.active || administrator.role !== 'ADMINISTRADOR') fail(401, 'La sesión cambió.');
            const [target] = await tx.select().from(s.user).where(eq(s.user.id, rawId)).for('update');
            if (!target) fail(404, 'Cuenta no disponible.');
            const linked = await tx.select().from(s.profesionales).where(eq(s.profesionales.userId, rawId));
            if (linked.length && data.role !== 'PROFESIONAL') fail(409, 'Desvincula el profesional antes de cambiar su rol.');
            const [record] = await tx.update(s.user).set({ ...data, updatedAt: new Date() }).where(eq(s.user.id, rawId)).returning(userFields);
            await tx.delete(s.session).where(eq(s.session.userId, rawId));
            await tx.insert(s.audit).values({ actorId: actor.id, action: 'update-and-revoke', resource: 'users', resourceId: rawId });
            return record;
          });
          return json(updated);
        }
        fail(405, 'Método no permitido.');
      }
      if (path === '/api/permissions' && request.method === 'GET') { admin(); return json(permissions); }
      if (path === '/api/audit' && request.method === 'GET') { admin(); return json(await db.select().from(s.audit).orderBy(desc(s.audit.createdAt)).limit(100)); }
      if (path === '/api/legacy/import' && request.method === 'POST') { admin(); return json(await importLegacy(db, actor.id, await body(request)), 201); }
      if (resource === 'pacientes' && subresource === 'historial' && request.method === 'GET') {
        const [patient] = await db.select().from(s.pacientes).where(and(eq(s.pacientes.id, numericId!), patientScope));
        if (!patient) fail(404, 'Registro no disponible.');
        return json(await db.select(clinicalFields).from(s.atenciones).innerJoin(s.citas, eq(s.atenciones.citaId, s.citas.id)).innerJoin(s.pacientes, eq(s.citas.pacienteId, s.pacientes.id)).innerJoin(s.profesionales, eq(s.citas.profesionalId, s.profesionales.id)).where(and(eq(s.citas.pacienteId, numericId!), ownScope)).orderBy(desc(s.citas.fecha)));
      }
      if (subresource) fail(404, 'Endpoint no disponible.');
      if (request.method === 'GET') {
        let records;
        if (resource === 'pacientes') records = await db.select().from(s.pacientes).where(and(patientScope, numericId ? eq(s.pacientes.id, numericId) : undefined)).orderBy(s.pacientes.name);
        else if (resource === 'profesionales') records = await db.select().from(s.profesionales).where(and(isAdmin(actor) ? undefined : eq(s.profesionales.id, actor.profesionalId ?? -1), numericId ? eq(s.profesionales.id, numericId) : undefined)).orderBy(s.profesionales.nombre);
        else if (resource === 'citas') records = await db.select(appointmentFields).from(s.citas).innerJoin(s.pacientes, eq(s.citas.pacienteId, s.pacientes.id)).innerJoin(s.profesionales, eq(s.citas.profesionalId, s.profesionales.id)).where(and(ownScope, numericId ? eq(s.citas.id, numericId) : undefined)).orderBy(s.citas.fecha, s.citas.hora);
        else if (resource === 'atenciones') records = await db.select(clinicalFields).from(s.atenciones).innerJoin(s.citas, eq(s.atenciones.citaId, s.citas.id)).innerJoin(s.pacientes, eq(s.citas.pacienteId, s.pacientes.id)).innerJoin(s.profesionales, eq(s.citas.profesionalId, s.profesionales.id)).where(and(ownScope, numericId ? eq(s.atenciones.id, numericId) : undefined)).orderBy(desc(s.citas.fecha));
        else fail(404, 'Endpoint no disponible.');
        if (numericId && !records[0]) fail(404, 'Registro no disponible.');
        return json(numericId ? records[0] : records);
      }
      if (!['POST', 'PATCH', 'DELETE'].includes(request.method)) fail(405, 'Método no permitido.');
      const schemas = { pacientes: pacienteInput, profesionales: profesionalInput, citas: citaInput, atenciones: atencionInput };
      if (!(resource in schemas)) fail(404, 'Endpoint no disponible.');
      if ((request.method === 'POST') === !!numericId) fail(405, 'Ruta no válida para esta operación.');
      if (resource === 'profesionales' || (resource === 'pacientes' && request.method !== 'PATCH')) admin();
      const parsed = request.method === 'DELETE' ? null : schemas[resource as keyof typeof schemas].parse(await body(request));
      const result = await db.transaction(async tx => {
        // Evita carreras entre reasignar agenda, autorizar y modificar un recurso.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(728110)`);
        const [currentUser] = await tx.select().from(s.user).where(eq(s.user.id, actor.id));
        if (!currentUser?.active || currentUser.role !== actor.role) fail(401, 'La sesión cambió. Inicia sesión nuevamente.');
        const [currentProf] = await tx.select().from(s.profesionales).where(eq(s.profesionales.userId, actor.id));
        actor.profesionalId = currentProf?.id ?? null;
        const table = s[resource as 'pacientes' | 'profesionales' | 'citas' | 'atenciones'];
        let current: any;
        if (numericId) {
          [current] = await tx.select().from(table).where(eq(table.id, numericId)).for('update');
          if (!current) fail(404, 'Registro no disponible.');
          const expected = request.headers.get('if-unmodified-since');
          if (!expected || new Date(expected).getTime() !== current.updatedAt.getTime()) fail(409, 'El registro cambió. Actualiza la página antes de guardar.');
        }
        if (resource === 'pacientes' && !isAdmin(actor)) {
          const [assigned] = await tx.select().from(s.citas).where(and(eq(s.citas.pacienteId, numericId!), eq(s.citas.profesionalId, actor.profesionalId ?? -1))).limit(1);
          if (!assigned) fail(404, 'Registro no disponible.');
        }
        if (resource === 'citas' || resource === 'atenciones') {
          let appointment = resource === 'citas' ? current : undefined;
          if (resource === 'atenciones') {
            const citaId = current?.citaId ?? (parsed as z.infer<typeof atencionInput>)?.citaId;
            [appointment] = await tx.select().from(s.citas).where(eq(s.citas.id, citaId)).for('update');
            if (!appointment) fail(404, 'Cita no disponible.');
            if (current && (parsed as z.infer<typeof atencionInput>)?.citaId !== undefined && (parsed as z.infer<typeof atencionInput>).citaId !== current.citaId) fail(409, 'No se puede reasignar una atención clínica.');
          }
          if (appointment && !ownsProfessional(actor, appointment.profesionalId)) fail(404, 'Registro no disponible.');
          if (resource === 'citas' && parsed) {
            const data = parsed as z.infer<typeof citaInput>;
            if (!ownsProfessional(actor, data.profesionalId)) fail(403, 'Solo puedes administrar tu agenda.');
            if (!isAdmin(actor)) {
              const [assigned] = await tx.select().from(s.citas).where(and(eq(s.citas.pacienteId, data.pacienteId), eq(s.citas.profesionalId, actor.profesionalId ?? -1))).limit(1);
              if (!assigned) fail(403, 'El paciente debe estar asignado por administración.');
            }
            if (current) {
              const [encounter] = await tx.select().from(s.atenciones).where(eq(s.atenciones.citaId, current.id));
              if (encounter) fail(409, 'Una cita con atención registrada no se puede modificar.');
            }
          }
        }
        if (resource === 'profesionales' && parsed && (parsed as z.infer<typeof profesionalInput>).userId) {
          const [linked] = await tx.select().from(s.user).where(eq(s.user.id, (parsed as z.infer<typeof profesionalInput>).userId!));
          if (!linked || linked.role !== 'PROFESIONAL' || !linked.active) fail(400, 'Selecciona una cuenta profesional activa.');
        }
        let changed: any;
        if (request.method === 'DELETE') { [changed] = await tx.delete(table).where(eq(table.id, numericId!)).returning(); }
        else if (numericId) { [changed] = await tx.update(table).set({ ...parsed, updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)) }).where(eq(table.id, numericId)).returning(); }
        else { [changed] = await tx.insert(table).values(parsed as any).returning(); }
        await tx.insert(s.audit).values({ actorId: actor.id, action: request.method, resource, resourceId: String(changed.id) });
        return changed;
      });
      return json(result, request.method === 'POST' ? 201 : 200);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      if (error instanceof ZodError) return json({ error: 'Revisa los datos del formulario.', fields: error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) }, 400);
      const code = (error as any)?.code ?? (error as any)?.cause?.code;
      if (code === '23505') return json({ error: 'Ya existe un registro con estos datos o el horario está ocupado.' }, 409);
      if (code === '23503') return json({ error: 'El registro tiene relaciones clínicas o la referencia no existe.' }, 409);
      return json({ error: 'No se pudo completar la solicitud. Inténtalo nuevamente.' }, 503);
    }
  };
}
