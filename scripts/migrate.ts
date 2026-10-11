import { migrateDatabase } from '../server/migrate';
migrateDatabase().then(() => console.log('Migraciones aplicadas.')).catch(() => { console.error('Migración cancelada. Revisa --apply, configuración y acceso a la base de datos.'); process.exitCode = 1; });
