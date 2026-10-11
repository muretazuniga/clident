import { createDatabase } from '../server/db';
import { createUser } from '../server/users';
async function main() {
  const db = createDatabase();
  try {
    await createUser(db, { name: process.env.BOOTSTRAP_NAME, email: process.env.BOOTSTRAP_EMAIL, password: process.env.BOOTSTRAP_PASSWORD, role: 'ADMINISTRADOR' }, null, true);
    console.log('Administrador inicial creado. Retira BOOTSTRAP_PASSWORD del entorno.');
  } finally { await db.$client.end(); }
}
main().then(() => process.exit(0)).catch(() => { console.error('Inicialización cancelada. Verifica configuración, contraseña y que no existan usuarios.'); process.exit(1); });
