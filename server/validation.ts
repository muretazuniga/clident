import { z } from 'zod';
const text = (max = 200) => z.string().trim().min(1).max(max);
export const validDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Fecha no válida');
export function validRut(input: string) {
  const rut = input.replace(/[.\s]/g, '').toUpperCase();
  if (!/^\d{7,8}-[\dK]$/.test(rut)) return false;
  const [body, dv] = rut.split('-'); let sum = 0, factor = 2;
  for (const n of [...body].reverse()) { sum += Number(n) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const rest = 11 - sum % 11; return dv === (rest === 11 ? '0' : rest === 10 ? 'K' : String(rest));
}
export const pacienteInput = z.object({ name: text(), rut: text(14).refine(validRut, 'RUT no válido').transform(v => v.replace(/[.\s]/g, '').toUpperCase()), fechaNacimiento: validDate.refine(v => v <= new Date().toISOString().slice(0, 10), 'Fecha de nacimiento futura'), email: z.string().trim().email().max(254), phone: z.string().trim().regex(/^\+?[\d\s()-]{8,25}$/) }).strict();
export const profesionalInput = z.object({ nombre: text(100), apellido: text(100), especialidad: text(100), userId: z.string().min(1).nullable().optional() }).strict();
export const citaInput = z.object({ pacienteId: z.number().int().positive(), profesionalId: z.number().int().positive(), fecha: validDate, hora: z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|30)$/), motivo: text(500) }).strict();
export const atencionInput = z.object({ citaId: z.number().int().positive(), diagnostico: text(10000), tratamiento: text(10000), observaciones: z.string().trim().max(10000).default('') }).strict();
export const userInput = z.object({ name: text(), email: z.string().trim().email().transform(v => v.toLowerCase()), password: z.string().min(12).max(128), role: z.enum(['ADMINISTRADOR', 'PROFESIONAL']) }).strict();
export const userUpdate = userInput.omit({ password: true, email: true }).extend({ active: z.boolean() }).strict();
export const imageInput = z.object({ image: z.string().max(700000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).nullable() }).strict();
