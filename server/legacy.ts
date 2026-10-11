import { createHash } from 'node:crypto';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from './db';
import * as s from './db/schema';
import { pacienteInput, profesionalInput, citaInput, atencionInput } from './validation';
import { HttpError } from './api';
const oldId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const legacyInput = z.object({
  confirmed: z.literal(true), backupConfirmed: z.literal(true),
  pacientes: z.array(pacienteInput.extend({ id: oldId }).passthrough()).max(1000),
  profesionales: z.array(profesionalInput.omit({ userId: true }).extend({ id: oldId }).passthrough()).max(1000),
  citas: z.array(citaInput.extend({ id: oldId }).passthrough()).max(2000),
  atenciones: z.array(atencionInput.extend({ id: oldId }).passthrough()).max(2000),
}).strict().superRefine((data, ctx) => {
  for (const key of ['pacientes', 'profesionales', 'citas', 'atenciones'] as const) {
    const ids = data[key].map(r => r.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: [key], message: 'Identificadores duplicados.' });
  }
});
export async function importLegacy(db: Database, actorId: string, input: unknown) {
  const data = legacyInput.parse(input);
  const id = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(728110)`);
    if ((await tx.select().from(s.imports).where(eq(s.imports.id, id))).length) throw new HttpError(409, 'Este respaldo ya fue importado.');
    const patients = new Map<number, number>(), professionals = new Map<number, number>(), appointments = new Map<number, number>();
    for (const item of data.pacientes) {
      const validated = pacienteInput.parse({ name: item.name, rut: item.rut, fechaNacimiento: item.fechaNacimiento, email: item.email, phone: item.phone });
      const [existing] = await tx.select().from(s.pacientes).where(eq(s.pacientes.rut, validated.rut));
      if (existing) throw new HttpError(409, 'Un RUT del respaldo ya existe. La importación fue cancelada sin cambios.');
      const [record] = await tx.insert(s.pacientes).values(validated).returning(); patients.set(item.id, record.id);
    }
    for (const item of data.profesionales) {
      const [existing] = await tx.select().from(s.profesionales).where(and(sql`lower(trim(${s.profesionales.nombre})) = ${item.nombre.toLowerCase()}`, sql`lower(trim(${s.profesionales.apellido})) = ${item.apellido.toLowerCase()}`, sql`lower(trim(${s.profesionales.especialidad})) = ${item.especialidad.toLowerCase()}`));
      if (existing) throw new HttpError(409, 'Un profesional del respaldo ya existe. La importación fue cancelada sin cambios.');
      const [record] = await tx.insert(s.profesionales).values({ nombre: item.nombre, apellido: item.apellido, especialidad: item.especialidad }).returning(); professionals.set(item.id, record.id);
    }
    for (const item of data.citas) {
      const pacienteId = patients.get(item.pacienteId), profesionalId = professionals.get(item.profesionalId);
      if (!pacienteId || !profesionalId) throw new HttpError(400, 'El respaldo contiene citas sin paciente o profesional.');
      const [record] = await tx.insert(s.citas).values({ pacienteId, profesionalId, fecha: item.fecha, hora: item.hora, motivo: item.motivo }).returning(); appointments.set(item.id, record.id);
    }
    for (const item of data.atenciones) {
      const citaId = appointments.get(item.citaId);
      const oldAppointment = data.citas.find(c => c.id === item.citaId);
      if (!citaId || !oldAppointment || (item['pacienteId'] !== undefined && item['pacienteId'] !== oldAppointment.pacienteId) || (item['profesionalId'] !== undefined && item['profesionalId'] !== oldAppointment.profesionalId)) throw new HttpError(400, 'El respaldo contiene atenciones con relaciones inconsistentes.');
      await tx.insert(s.atenciones).values({ citaId, diagnostico: item.diagnostico, tratamiento: item.tratamiento, observaciones: item.observaciones });
    }
    await tx.insert(s.imports).values({ id, actorId });
    await tx.insert(s.audit).values({ actorId, action: 'import', resource: 'legacy', resourceId: id });
    return { pacientes: patients.size, profesionales: professionals.size, citas: appointments.size, atenciones: data.atenciones.length };
  });
}
