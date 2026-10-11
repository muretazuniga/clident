# Conexión de Clident a Neon

Proyecto previsto: `rapid-dust-32085230`. El ID del proyecto no es una credencial ni reemplaza una cadena de conexión. No se necesita Neon CLI, `neon link`, `neon config init` ni `neon deploy`. Se conserva PostgreSQL mediante `pg`, Drizzle ORM y Better Auth.

## Configuración local

Desde la raíz de Clident, copia `.env.example` a `.env` únicamente si este archivo aún no existe. `.env` está excluido por `.gitignore`. Nunca copies sus valores a Angular ni los publiques en el chat.

En Neon Console, abre el proyecto y **Connect**. Selecciona explícitamente la rama, base y rol correctos. Copia la cadena con **Connection pooling** activado a `DATABASE_URL`. Copia la cadena del mismo endpoint, base y rol con pooling desactivado a `DATABASE_URL_UNPOOLED`. Conserva los parámetros TLS. El backend exige validación del certificado para Neon y habilita channel binding cuando el servidor lo ofrece.

Configura también:

- `BETTER_AUTH_SECRET`: secreto aleatorio de al menos 32 caracteres. Puedes generarlo con un gestor de contraseñas. No lo reutilices en otros entornos.
- `BETTER_AUTH_URL=http://localhost:4200` y `NODE_ENV=development` para desarrollo.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` para recuperación de contraseñas. Sin SMTP no se ha verificado el envío de correos reales.

Ejecuta `npm run db:check`. Comprueba ambas conexiones mediante transacciones de solo lectura y muestra versión, zona horaria, cantidad de tablas y presencia del registro de migraciones, sin mostrar credenciales. No aplica migraciones ni inicializa usuarios. Una conexión real exitosa es necesaria para afirmar que Neon está conectado; la compilación no la sustituye.

## Migraciones revisadas

La migración `migrations/0000_youthful_fenris.sql` crea once tablas, índices, claves foráneas, restricciones y secuencias identity. Utiliza SQL PostgreSQL estándar sin extensiones adicionales. Está probada localmente en PGlite y fue aplicada y verificada en la base Neon configurada el 11 de octubre de 2026.

### Inicialización verificada

Se confirmó por consultas de solo lectura que las conexiones agrupada y directa apuntan al mismo endpoint, base y rol. Antes de migrar no existían objetos de usuario ni registro de migraciones. La equivalencia del endpoint identifica el mismo destino de proyecto/rama; no se realizó una consulta a la API de administración de Neon para obtener sus identificadores.

Se ejecutó `npm run db:migrate -- --apply` con la conexión directa. Posteriormente ambas conexiones informaron PostgreSQL 18.6, zona GMT (UTC), once tablas públicas y registro de migraciones presente. Se verificaron las once claves primarias, ocho claves foráneas, dos restricciones CHECK y el hash y timestamp registrados por Drizzle. Todas las tablas de aplicación permanecen vacías; únicamente existe el registro técnico de la migración.

Las tablas son `users`, `sessions`, `accounts`, `verifications`, `rate_limits`, `pacientes`, `profesionales`, `citas`, `atenciones`, `audit_log` y `legacy_imports`. El registro técnico está en `drizzle.__drizzle_migrations`, fuera de las once tablas públicas.

El script `server/verify-initialization.ts` comprueba esta migración inicial: sin argumentos exige una base vacía; con `--after` exige el esquema inicial y tablas de aplicación vacías. No es un verificador general para una base con usuarios o datos clínicos. No modifica datos.

1. Revisa el SQL y el destino seleccionado en Neon antes de aplicar cambios. La migración inicial corresponde a una base nueva: no la apliques sobre un esquema existente desconocido.
2. Si hay datos, prepara primero una copia recuperable o una rama de prueba en Neon. La retención de restauración depende de tu plan y configuración.
3. Comprueba `npm run db:check`. Ambas URL deben apuntar al mismo endpoint, base y rol; la herramienta de migración rechaza una URL agrupada de Neon como conexión directa.
4. Cuando autorices la aplicación, ejecuta `npm run db:migrate -- --apply`. No forma parte del build ni del despliegue. Drizzle registra las migraciones en `drizzle.__drizzle_migrations`; no utiliza `push` para sincronizar el esquema.
5. Ejecuta nuevamente `npm run db:check` y prueba autenticación y CRUD con datos ficticios.

No edites una migración ya aplicada. Genera nuevas migraciones con `npm run db:generate`, revisa su SQL y versiona manualmente los archivos. No ejecutes cambios destructivos sin autorización y una estrategia de recuperación. No se incluye un rollback destructivo automático.

## Primer administrador

Después de migrar, configura temporalmente `BOOTSTRAP_EMAIL`, `BOOTSTRAP_NAME` y `BOOTSTRAP_PASSWORD` en el `.env` local. La contraseña debe cumplir la validación de la aplicación (mínimo 12 caracteres). Ejecuta `npm run bootstrap:admin` únicamente sobre la base elegida para inicializar.

Este es el siguiente paso pendiente. El esquema ya está creado y la tabla `users` está vacía. La creación está autorizada si las variables son válidas, pero no se ha ejecutado por la contraseña insuficiente. No publiques las credenciales en el chat.

En la revisión integral del 11 de octubre se confirmó autorización para inicializar si las variables son válidas. `BOOTSTRAP_PASSWORD` no cumple la longitud de 12 a 128 caracteres; la operación se omitió y siguen existiendo cero usuarios. Corrige únicamente esa variable localmente y ejecuta `npm run check:readiness -- --bootstrap`. El comando es seguro al repetirse: no crea otra cuenta si ya existen usuarios, valida el administrador previsto y verifica login, cookie HttpOnly/SameSite, acceso administrativo y logout cuando las credenciales son correctas. No modifica registros clínicos ni cambia contraseñas.

El secreto de Better Auth tenía menos de 32 caracteres y se corrigió localmente antes de inicializar, tras confirmar ausencia de usuarios, sesiones y recuperaciones. Su valor no se mostró. No es un procedimiento de rotación para una instalación en uso; en ese caso se requiere coordinación. Después del bootstrap retira `BOOTSTRAP_PASSWORD` y conserva el secreto de sesión privado.

La operación usa el hash de Better Auth, una transacción y un bloqueo para evitar inicializaciones concurrentes. Se rechaza si existe cualquier usuario; no incorpora una contraseña predeterminada. Retira `BOOTSTRAP_PASSWORD` del archivo inmediatamente después. Inicia sesión desde Angular y verifica el rol y acceso administrativo. No es una operación del build ni un endpoint público.

## Vercel

El frontend se compila en `www` y la API está en `api/[...path].ts`, con Node 24 y pool pequeño reutilizado por instancia. `vercel.json` mantiene API y SPA en el mismo origen. Las transacciones clínicas y las sesiones continúan en PostgreSQL.

Configura las variables anteriores en **Project Settings > Environment Variables**, exclusivamente para el servidor. En producción usa `NODE_ENV=production`, `BETTER_AUTH_URL=https://tu-dominio` y un secreto distinto del desarrollo. Usa una rama/base separada para Preview; no apuntes previews al entorno clínico de producción. `DATABASE_URL` agrupada se utiliza en ejecución; la directa se reserva para las herramientas de migración. No configures las variables temporales del bootstrap en Vercel.

El build no accede a Neon ni aplica migraciones. El despliegue lo realiza el propietario. La ejecución real de Functions, TLS, conexiones concurrentes, correo y cookies de producción debe verificarse tras configurar los servicios; no se ha desplegado desde este entorno.
