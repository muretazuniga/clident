import './env';
import { createDatabase } from './db';
import { createUser } from './users';
import { createApi } from './api';
import { createAuth } from './auth';
import { sql, eq } from 'drizzle-orm';
import { user } from './db/schema';
import { userInput } from './validation';
import { getEnv } from './env';

let stage = 'configuración';
async function main() {
  const db = createDatabase();
  try {
    stage = 'consulta de cuentas';
    const [state] = await db.select({ count: sql<number>`count(*)::int`, admins: sql<number>`count(*) filter (where role = 'ADMINISTRADOR' and active)::int` }).from(user);
    console.log(`Neon: ${state.count} cuentas; ${state.admins} administradores activos.`);
    const input = { name: process.env.BOOTSTRAP_NAME, email: process.env.BOOTSTRAP_EMAIL, password: process.env.BOOTSTRAP_PASSWORD, role: 'ADMINISTRADOR' };
    const validated = userInput.safeParse(input);
    if (!state.count && validated.success && process.argv.includes('--bootstrap')) {
      stage = 'inicialización administrativa';
      await createUser(db, validated.data, null, true);
      console.log('Administrador previsto creado. Retira BOOTSTRAP_PASSWORD del entorno.');
    } else if (!state.count) {
      console.log(validated.success ? 'Bootstrap válido, pendiente de ejecución con --bootstrap.' : 'Bootstrap incompleto o inválido; no se crean cuentas.');
      if (!validated.success) console.log(`Campos de bootstrap que requieren corrección: ${[...new Set(validated.error.issues.map(issue => ({ name: 'BOOTSTRAP_NAME', email: 'BOOTSTRAP_EMAIL', password: 'BOOTSTRAP_PASSWORD' }[String(issue.path[0])] || 'configuración')))].join(', ')}.`);
    }
    const env = getEnv();
    console.log(`Correo: ${env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.MAIL_FROM ? 'configuración presente; envío externo pendiente de verificación' : 'configuración incompleta'}.`);
    if (!validated.success) { console.log('Login real no ejecutado: faltan credenciales de bootstrap válidas.'); return; }
    const [admin] = await db.select({ role: user.role, active: user.active }).from(user).where(eq(user.email, validated.data.email));
    if (!admin || !admin.active || admin.role !== 'ADMINISTRADOR') { console.log('Login real no ejecutado: no existe el administrador previsto activo.'); return; }
    const origin = new URL(env.BETTER_AUTH_URL).origin;
    stage = 'login y sesión';
    const handler = createApi(db, createAuth(db));
    const request = (path: string, method = 'GET', data?: unknown, cookie = '') => handler(new Request(`${origin}/api/${path}`, { method, headers: { origin, cookie, ...(data ? { 'content-type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) }));
    const login = await request('auth/sign-in/email', 'POST', { email: validated.data.email, password: validated.data.password });
    if (login.status !== 200) throw new Error('Login real rechazado.');
    const cookies = login.headers.getSetCookie();
    const cookie = cookies.map(c => c.split(';')[0]).join('; ');
    try {
      if (!cookies.some(c => c.includes('HttpOnly') && /SameSite=Lax/i.test(c))) throw new Error('Cookie insegura.');
      if (env.NODE_ENV === 'production' && !cookies.some(c => /; Secure/i.test(c))) throw new Error('Falta cookie Secure.');
      if ((await request('me', 'GET', undefined, cookie)).status !== 200 || (await request('users', 'GET', undefined, cookie)).status !== 200) throw new Error('Acceso administrativo rechazado.');
      if ((await request('me')).status !== 401) throw new Error('Acceso sin sesión permitido.');
      console.log('Login real, cookie HttpOnly/SameSite, sesión persistente y acceso administrativo verificados contra Neon.');
    } finally {
      if ((await request('auth/sign-out', 'POST', {}, cookie)).status !== 200) throw new Error('Logout fallido.');
    }
    if ((await request('me', 'GET', undefined, cookie)).status !== 401) throw new Error('Sesión no revocada.');
    console.log('Logout real y revocación verificados. No se insertaron datos clínicos.');
  } finally { await db.$client.end(); }
}
main().catch((error: unknown) => {
  const candidate = error as { code?: string; cause?: { code?: string } };
  const code = candidate.cause?.code || candidate.code;
  console.error(`Verificación fallida en ${stage}${code && /^[A-Z0-9_]+$/.test(code) ? ` (${code})` : ''}. No se muestran credenciales ni detalles privados.`);
  if (stage === 'configuración') {
    console.error(`Secreto de 32 caracteres: ${!!process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length >= 32}; NODE_ENV válido: ${['development', 'test', 'production'].includes(process.env.NODE_ENV || 'development')}; HTTPS requerido/cumplido: ${process.env.NODE_ENV !== 'production' || !!process.env.BETTER_AUTH_URL?.startsWith('https://')}.`);
  }
  process.exitCode = 1;
});
