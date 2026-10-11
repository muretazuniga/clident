import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import nodemailer from 'nodemailer';
import { eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import type { Database } from './db';
import * as schema from './db/schema';
import { getEnv } from './env';
export function createAuth(db: Database, options?: { sendPasswordReset: (data: { user: { email: string }; url: string; token: string }) => Promise<void> }) {
  const env = getEnv();
  const configuredMail = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.MAIL_FROM);
  const transport = configuredMail ? nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, requireTLS: env.SMTP_PORT !== 465, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }) : null;
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL, trustedOrigins: [new URL(env.BETTER_AUTH_URL).origin],
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128, revokeSessionsOnPasswordReset: true,
      ...(options?.sendPasswordReset ? { sendResetPassword: options.sendPasswordReset } : transport ? { sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
        await transport.sendMail({ from: env.MAIL_FROM, to: user.email, subject: 'Restablecer contraseña de CLIDENT', text: `Solicitaste restablecer tu contraseña. Abre este enlace: ${url}\nSi no lo solicitaste, ignora este mensaje.` });
      } } : {}) },
    user: { additionalFields: { role: { type: 'string', defaultValue: 'PROFESIONAL', input: false }, active: { type: 'boolean', defaultValue: true, input: false } } },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 30, cookieCache: { enabled: false } },
    advanced: { useSecureCookies: env.NODE_ENV === 'production', defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60, customRules: { '/sign-in/email': { window: 60, max: 5 }, '/request-password-reset': { window: 300, max: 3 } } },
    databaseHooks: { session: { create: { before: async (s) => {
      const [u] = await db.select().from(schema.user).where(eq(schema.user.id, s.userId));
      if (!u?.active) throw new APIError('UNAUTHORIZED', { message: 'Credenciales no válidas.' });
      return { data: s };
    } } } },
    logger: { disabled: true },
  });
}
export type Auth = ReturnType<typeof createAuth>;
