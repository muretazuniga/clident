import type { Role } from '../shared/models';
export const permissions = {
  ADMINISTRADOR: ['users.manage', 'professionals.manage', 'patients.create', 'patients.read.all', 'patients.update.all', 'patients.delete', 'appointments.all', 'encounters.all', 'legacy.import', 'audit.read'],
  PROFESIONAL: ['patients.read.assigned', 'patients.update.assigned', 'appointments.own', 'encounters.own'],
} as const;
export interface Actor { id: string; role: Role; profesionalId: number | null }
export function isAdmin(actor: Actor) { return actor.role === 'ADMINISTRADOR'; }
export function ownsProfessional(actor: Actor, id: number) { return isAdmin(actor) || actor.profesionalId === id; }
