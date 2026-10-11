export type Role = 'ADMINISTRADOR' | 'PROFESIONAL';
export interface Paciente { id: number; name: string; rut: string; fechaNacimiento: string; email: string; phone: string; updatedAt: string }
export interface Profesional { id: number; nombre: string; apellido: string; especialidad: string; userId: string | null; updatedAt: string }
export interface Cita { id: number; pacienteId: number; profesionalId: number; paciente: string; profesional: string; especialidad: string; fecha: string; hora: string; motivo: string; updatedAt: string }
export interface Atencion { id: number; citaId: number; pacienteId: number; profesionalId: number; paciente: string; profesional: string; fecha: string; diagnostico: string; tratamiento: string; observaciones: string; updatedAt: string }
export interface Usuario { id: string; name: string; email: string; role: Role; active: boolean; image: string | null; emailVerified: boolean }
export type Entity = 'pacientes' | 'profesionales' | 'citas' | 'atenciones';
export interface Dashboard { counts: { pacientes: number; citas: number; atenciones: number }; upcoming: Cita[] }
export interface AuditEntry { id: number; actorId: string | null; action: string; resource: string; resourceId: string; createdAt: string }
