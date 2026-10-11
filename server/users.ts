import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import type { Database } from './db';
import { user, account, audit } from './db/schema';
import { userInput } from './validation';
export async function createUser(db: Database, input: unknown, actorId: string | null, bootstrap = false) {
  const data = userInput.parse(input);
  const password = await hashPassword(data.password);
  return db.transaction(async tx => {
    // Serializa la inicialización y las modificaciones administrativas.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(728109)`);
    if (actorId) {
      const [actor] = await tx.select().from(user).where(eq(user.id, actorId));
      if (!actor?.active || actor.role !== 'ADMINISTRADOR') throw new Error('Cuenta administradora no disponible.');
    }
    if (bootstrap && (await tx.select({ id: user.id }).from(user).limit(1)).length) throw new Error('La inicialización solo se permite sobre una instalación sin usuarios.');
    const id = randomUUID();
    const [created] = await tx.insert(user).values({ id, name: data.name, email: data.email, role: data.role }).returning();
    await tx.insert(account).values({ id: randomUUID(), accountId: id, providerId: 'credential', userId: id, password });
    await tx.insert(audit).values({ actorId: actorId ?? id, action: bootstrap ? 'bootstrap' : 'create', resource: 'users', resourceId: id });
    return { id: created.id, name: created.name, email: created.email, role: created.role, active: created.active, emailVerified: created.emailVerified, image: null };
  });
}
