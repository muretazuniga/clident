import { config } from 'dotenv';
import { basename, resolve } from 'node:path';
if (process.env.NODE_ENV !== 'production') config({ path: resolve(process.cwd(), basename(process.cwd()) === 'server' ? '../.env' : '.env'), quiet: true });
import { z } from 'zod';
import { databaseUrl } from './db/config';
const schema = z.object({ DATABASE_URL: z.string().startsWith('postgres'), BETTER_AUTH_SECRET: z.string().min(32), BETTER_AUTH_URL: z.string().url(), NODE_ENV: z.enum(['development', 'test', 'production']).default('development'), SMTP_HOST: z.string().optional(), SMTP_PORT: z.coerce.number().default(587), SMTP_USER: z.string().optional(), SMTP_PASSWORD: z.string().optional(), MAIL_FROM: z.string().optional() });
export function getEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) throw new Error('Configuración de servidor incompleta. Consulta .env.example.');
  databaseUrl(parsed.data.DATABASE_URL);
  const publicUrl = new URL(parsed.data.BETTER_AUTH_URL);
  if (!['http:', 'https:'].includes(publicUrl.protocol) || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash || publicUrl.pathname !== '/') throw new Error('BETTER_AUTH_URL debe contener únicamente el origen HTTP o HTTPS de la aplicación.');
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.BETTER_AUTH_URL.startsWith('https://')) throw new Error('Se requiere HTTPS en producción.');
  return parsed.data;
}
