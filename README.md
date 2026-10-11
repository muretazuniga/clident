# CLIDENT Enterprise

Aplicación de gestión clínica odontológica para el Portafolio de Título (PTY4479), Duoc UC.
Integrantes: Belén Bustos y Matías Ureta.

## Arquitectura

Angular 20 + Ionic 8 + TypeScript + SCSS → API del mismo origen → Drizzle ORM → PostgreSQL de Neon.
Capacitor e Ionic Storage permanecen en el proyecto. Storage se utiliza exclusivamente para recuperar datos anteriores mediante acciones explícitas; los nuevos registros clínicos no se persisten en el navegador.

`src/app/services/api.service.ts` concentra las solicitudes y los errores HTTP. Las pantallas realizan CRUD individual y no reemplazan listas completas en el servidor.
`server/` es un paquete Node independiente, con su propio archivo de bloqueo. `api/[...path].ts` adapta el controlador a Vercel Functions.
La API usa cookies y no habilita CORS entre orígenes distintos. La aplicación web y la API deben compartir dominio.

## Dependencias

El conflicto original era Better Auth 1.7.7 → peer opcional @sveltejs/kit 2.70.3 → @sveltejs/vite-plugin-svelte 7.3.1 → Vite 8.
Angular 20 utiliza Vite 7.3.6. El plugin Svelte 6.x acepta Vite 7, pero instalar Svelte en Angular no es necesario.
La solución fue aislar las dependencias del backend, conservando Better Auth 1.7.7 y Drizzle 0.45.x.
La instalación normal de server/package.json no instala Svelte ni Vite y no usa --force ni --legacy-peer-deps.
Nodemailer se actualizó a 10.1.0 después de revisar las vulnerabilidades de la versión 7.

## Configuración local

Se requiere Node 24.x y npm. Los dos paquetes tienen archivos de bloqueo independientes:

```sh
npm ci
npm ci --prefix server
```

Copia .env.example a .env y configura sus valores reales. .env está ignorado. No pegues credenciales en Angular, documentación, capturas o comandos compartidos.

| Variable | Uso |
| --- | --- |
| DATABASE_URL | Conexión PostgreSQL pooled de Neon, solo backend |
| DATABASE_URL_UNPOOLED | Conexión directa para migraciones |
| BETTER_AUTH_SECRET | Secreto aleatorio de al menos 32 caracteres |
| BETTER_AUTH_URL | http://localhost:4200 en desarrollo; URL HTTPS exacta en producción |
| NODE_ENV | development, test o production |
| SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD | Transporte SMTP para recuperación |
| MAIL_FROM | Remitente autorizado |
| BOOTSTRAP_EMAIL, BOOTSTRAP_NAME, BOOTSTRAP_PASSWORD | Solo inicialización local del primer administrador |

Puedes generar un secreto con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` y guardarlo directamente en tu entorno privado.
No existen cuentas ni contraseñas predeterminadas.

### Conectar Neon

1. Crea bases o ramas separadas para desarrollo y producción.
2. Obtén la conexión pooled y la directa desde Neon y cópialas a DATABASE_URL y DATABASE_URL_UNPOOLED. Mantén los parámetros TLS que entrega Neon.
3. Revisa las migraciones SQL en migrations/. La inicialización crea tablas y no borra información.
4. Cuando hayas elegido conscientemente la base destino, aplica las migraciones:

```sh
npm --prefix server run db:migrate -- --apply
```

5. Configura las variables BOOTSTRAP en .env y ejecuta:

```sh
npm run bootstrap:admin
```

La inicialización se serializa con un bloqueo PostgreSQL y se rechaza si existe cualquier usuario. Retira BOOTSTRAP_PASSWORD del entorno después de usarla.
Para futuros cambios de esquema, `npm run db:generate` genera SQL local; revisa el resultado antes de aplicarlo.
No ejecutes migraciones destructivas sobre una base remota sin respaldo y aprobación.

### Ejecutar la aplicación

En dos terminales desde la raíz:

```sh
npm run dev:api
npm start
```

Abre http://localhost:4200. Angular usa proxy.conf.json hacia 127.0.0.1:3001.
Inicia sesión con el administrador que creaste y crea las cuentas profesionales desde Administración.
Después vincula cada cuenta en Profesionales. La vinculación es única y solo admite cuentas profesionales activas.

## Modelo relacional

| Tabla | Relaciones y restricciones |
| --- | --- |
| users | UUID de identidad, correo único, roles permitidos y estado activo |
| accounts | FK users, credencial con hash de Better Auth, proveedor e identidad únicos |
| sessions | FK users, token único, expiración y revocación |
| verifications | Identificadores, valores y expiración de recuperación |
| rate_limits | Clave única, contador y instante; almacenamiento compartido para Functions |
| pacientes | ID identity, RUT normalizado único y fecha de nacimiento |
| profesionales | ID identity, especialidad y FK opcional única a users |
| citas | FK pacientes y profesionales; horario único por profesional, fecha y hora |
| atenciones | FK única a citas; diagnóstico, tratamiento y observaciones |
| audit_log | Actor, operación, tipo e ID del recurso, instante |
| legacy_imports | Huella única del respaldo y actor de importación |

Las atenciones derivan paciente y profesional de la cita y no duplican nombres ni relaciones.
Las claves clínicas usan ON DELETE RESTRICT: no se eliminan pacientes/profesionales con citas, ni citas con atención.
Una cita con atención no se puede reasignar ni modificar.
created_at, updated_at, sesiones y auditoría son timestamptz y se envían como ISO 8601 UTC.
La fecha de nacimiento es date. La agenda conserva fecha y hora civil de la clínica en America/Santiago, sin convertirlas a UTC; el diseño actual admite una sola zona clínica y bloques de 30 minutos.
PATCH y DELETE clínicos requieren If-Unmodified-Since con el updatedAt ISO recibido. El servidor rechaza ediciones concurrentes con 409.

## Autenticación y permisos

Better Auth implementa correo/contraseña, hash, cookies HttpOnly, SameSite=Lax, Secure en producción, sesiones de ocho horas con renovación y revocación.
No se guardan contraseñas ni tokens en localStorage. El registro público y la modificación de roles mediante endpoints de autenticación están bloqueados.
El servidor verifica la cuenta activa en cada solicitud. Desactivar o cambiar una cuenta revoca sus sesiones.
El logout y la expiración recargan el cliente para descartar registros clínicos que queden en memoria de vistas Ionic.

La recuperación requiere SMTP real. Sin configuración SMTP, el flujo no enviará correos ni permitirá recuperar mediante enlaces de demostración.
Los enlaces vencen, tienen un solo uso y el restablecimiento revoca sesiones. El cambio de contraseña exige la contraseña actual.
El rate limit de autenticación se almacena en PostgreSQL: cinco intentos de login por minuto y tres solicitudes de recuperación por cinco minutos.
Las mutaciones de la API exigen Origin exacto y JSON. Better Auth conserva además sus comprobaciones de origen y CSRF.

| Operación | ADMINISTRADOR | PROFESIONAL |
| --- | --- | --- |
| Usuarios: crear, editar, asignar rol, activar/desactivar | Sí | No |
| Consultar matriz de permisos y auditoría | Sí | No |
| Profesionales: crear, vincular, editar, eliminar | Sí | No |
| Consultar profesionales | Todos | Solo su ficha vinculada |
| Pacientes: crear/eliminar | Sí, sujeto a integridad | No |
| Pacientes: consultar/actualizar | Todos | Asociados a citas de su agenda |
| Citas: CRUD | Todas | Solo propias; paciente previamente asignado |
| Atenciones: consultar/registrar/actualizar | Todas | Solo las de sus citas |
| Historial | Completo | Solo atenciones de su agenda |
| Importar datos locales | Sí | No |

La asignación inicial de un paciente se realiza mediante una cita creada por administración.
La existencia de una cita mantiene el vínculo de acceso, incluso pasada su fecha; una política de cierre o reasignación requiere acordar reglas clínicas.
Los dos roles y su matriz están versionados en server/permissions.ts: el panel asigna roles, pero no permite inventar permisos arbitrarios.
No se permite desactivar ni quitar el rol administrador de la propia cuenta. Una cuenta vinculada a un profesional debe desvincularse antes de pasar a administrador.

## Endpoints

Todos los endpoints de negocio requieren sesión. Las respuestas incluyen Cache-Control: no-store.
Errores: 400 validación, 401 sesión, 403 permiso/origen, 404 recurso fuera de ámbito, 409 duplicado/relación/conflicto, 413 tamaño, 415 formato y 503 servicio no disponible.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET / POST | /api/pacientes, /api/profesionales, /api/citas, /api/atenciones | Listar y crear |
| GET / PATCH / DELETE | /api/{entidad}/{id} | Consultar, actualizar y eliminar según ámbito |
| GET | /api/pacientes/{id}/historial | Historial autorizado |
| GET / PATCH | /api/me | Identidad y foto de la cuenta actual |
| GET / POST | /api/users | Listar y crear cuentas |
| PATCH | /api/users/{uuid} | Nombre, rol y estado; revoca sesiones |
| GET | /api/permissions | Matriz fija de roles |
| GET | /api/audit | Últimas 100 operaciones |
| POST | /api/legacy/import | Importación voluntaria y atómica |
| POST | /api/auth/sign-in/email | Login |
| POST | /api/auth/sign-out | Logout |
| GET | /api/auth/get-session, /api/auth/list-sessions | Sesiones de Better Auth |
| POST | /api/auth/request-password-reset, /api/auth/reset-password | Recuperación |
| POST | /api/auth/change-password | Cambio de contraseña |
| POST | /api/auth/revoke-session, /api/auth/revoke-sessions | Revocación |

Los cuerpos de pacientes, profesionales, citas y atenciones se definen en server/validation.ts.
Los tipos de respuesta compartidos están en shared/models.ts.
Las fotos admiten PNG, JPEG o WebP, hasta 500 KB desde la interfaz; el backend limita el data URL a 700000 caracteres y bloquea SVG.

## Recuperación de Ionic Storage

No hay importación automática ni borrado local. No se usa el antiguo ACTIVE_USER como identidad.
En Administración, descarga el respaldo, confirma que guardaste el archivo y solicita la importación explícita.
El archivo contiene información sensible y debe almacenarse en un lugar protegido.
El servidor valida cada fila, RUT, fecha, IDs y relaciones. Rechaza RUT/profesionales ya existentes y respaldos repetidos.
Reasigna IDs de manera controlada, dentro de una transacción. Si una fila falla, toda la operación se revierte.
Después vincula los profesionales importados a sus cuentas.

Los datos de demostración antiguos pueden tener RUT inválidos; se rechazan y deben corregirse en un respaldo revisado antes de importar. Los límites de importación son 1 MB por solicitud, 1000 pacientes/profesionales y 2000 citas/atenciones.
La interfaz importa el respaldo de la instalación actual; un proceso de importación parcial o de archivos externos deberá validarse por separado.
La foto local se puede recuperar explícitamente desde Mi perfil, confirmando que corresponde al usuario actual.
Los snapshots anteriores de Ionic Storage permanecen por seguridad de recuperación. Una vez comprobada la migración, su eliminación debe ser una decisión explícita del propietario.

## Interfaz

Login por correo, resumen con indicadores provenientes de la API, pacientes/historial, profesionales, agenda, atenciones, perfil y administración.
Sistema visual azul, superficies blancas y fondo gris claro, formularios y listados consistentes.
Sidebar desde 1024px y menú móvil, controles táctiles, etiquetas accesibles, navegación activa, confirmaciones, estados vacíos y mensajes de carga/error/éxito.
Se conservan la navegación y los formularios clínicos; los datos ficticios no se usan como contenido operacional.

## Verificación local

```sh
npm run build:all
npm test
npm run test:server
npm run test:browser
```

Las pruebas del backend ejecutan migraciones SQL sobre PGlite, una instancia PostgreSQL embebida sin conexión remota.
Cubren autenticación real con Better Auth, cookies, sesión, recuperación con transporte de correo simulado, permisos por recurso, CRUD, integridad, concurrencia e importación.
Las pruebas de navegador usan una fixture PostgreSQL efímera y datos ficticios. No activan un modo demo en la aplicación ni acceden a Neon.
Las capturas y resultados se guardan en artifacts/browser/, ignorado.
La fixture nunca se importa desde la API de producción.

## Vercel

La configuración está preparada, pero no se ha vinculado ni desplegado ningún proyecto remoto.
Configura la raíz del repositorio, Node 24.x, instalación de ambos paquetes, build npm run build:all y salida www.
vercel.json conserva /api para Functions y redirige las rutas web a index.html.
Configura las variables de servidor en Vercel por entorno; BETTER_AUTH_URL debe coincidir exactamente con el dominio HTTPS de ese entorno. No uses comodines de previews para el origen de autenticación.
Aplica previamente las migraciones revisadas y crea el administrador contra la base destino desde un entorno controlado.
No publiques BOOTSTRAP_PASSWORD como variable permanente.
Después del despliegue realizado por el propietario, comprueba login, cookies Secure, SMTP, rutas SPA/API, permisos, expiración, conexiones y errores en el entorno real.

## Límites pendientes

Existe un .env local ignorado con las conexiones de Neon configuradas. La migración inicial se aplicó y verificó en PostgreSQL 18.6 mediante las conexiones directa y agrupada: once tablas públicas vacías y registro de Drizzle correcto. El primer administrador sigue pendiente. La persistencia tras reiniciar una Function y la ejecución en Vercel requieren validación adicional. Consulta docs/NEON.md.
No se ha enviado correo SMTP real ni ejecutado el runtime alojado en Vercel.
La auditoría registra metadatos de operaciones clínicas/usuarios/importación; no almacena versiones completas de los textos clínicos ni un historial de accesos de lectura.
El endpoint DELETE de atenciones existe con ámbito por recurso; la interfaz conserva los registros y ofrece actualización. Antes de uso clínico real se debe acordar una política de retención, corrección y eliminación.
Los listados no tienen paginación; volumen, carga y restauración de respaldos deben probarse antes de producción.
La solución usa un único ámbito de clínica; no implementa múltiples organizaciones.
La aplicación web mantiene mismo origen. La ejecución nativa de Capacitor con API remota y cookies necesita una política adicional de origen/sesiones y pruebas de dispositivo.
npm audit del backend reportó cuatro avisos moderados en herramientas de desarrollo de drizzle-kit/esbuild. No se utiliza su servidor de desarrollo, y no se aplicó una degradación forzada incompatible.
Ionic Storage genera un aviso CommonJS de localforage durante el build.
No se declara el sistema listo para producción sin validar las dependencias externas y las políticas pendientes.

## Referencias técnicas

- [Better Auth: correo y contraseña](https://better-auth.com/docs/authentication/email-password)
- [Better Auth: rate limiting](https://better-auth.com/docs/concepts/rate-limit)
- [Neon: conexión PostgreSQL](https://neon.com/docs/get-started/connect-neon)
- [Vercel: Functions Node](https://vercel.com/docs/functions/runtimes/node-js)
## Resultados de esta implementación

Verificación local del 11 de octubre de 2026:

- Build Angular de producción: correcto, salida www.
- Backend: TypeScript correcto y artefacto ESM en server/dist/api.mjs.
- Angular: 18 pruebas aprobadas en Chrome Headless, ninguna omitida.
- Backend: 29 pruebas aprobadas, incluyendo SQL en PostgreSQL embebido, permisos del dashboard, adaptador Vercel, cookies Secure en HTTPS y validación de configuración de Neon, ninguna omitida.
- Navegador: 45 comprobaciones de overflow en 9 pantallas y 5 anchos, más login real, cookie HttpOnly, creación/persistencia de paciente, logout y permisos de rutas.
- ESLint: sin errores ni advertencias.
- git diff --check: sin errores de espacios; solo avisos de normalización de finales de línea de Windows.
- npm audit --omit=dev del frontend: cero vulnerabilidades reportadas.
- Backend: cuatro avisos moderados asociados a drizzle-kit y su esbuild antiguo; sin hallazgos altos/críticos después de actualizar Nodemailer.

Las capturas contienen exclusivamente datos ficticios y están en artifacts/browser/. La comprobación de overflow no sustituye una auditoría completa de accesibilidad ni pruebas en dispositivos físicos.
No se ejecutaron operaciones Git de escritura, despliegues ni importaciones de datos del propietario. Neon cuenta con la migración inicial aplicada y verificada.
# Integración con Neon

Consulta [docs/NEON.md](docs/NEON.md) para configurar el proyecto `rapid-dust-32085230`, verificar las conexiones sin escrituras y aplicar las migraciones e inicializar el administrador de forma controlada.

Consulta [docs/VERCEL.md](docs/VERCEL.md) para el empaquetado local con el constructor oficial, las variables de producción y la continuación del despliegue sin Git. Se corrigieron resolución de módulos NodeNext, separación entre SPA y API, exclusión de archivos privados, CSP y manejo de cuerpos/cookies. El paquete arranca en Node 24 aislado; todavía falta validar la infraestructura pública.

El dashboard usa `GET /api/dashboard` con indicadores agregados y hasta cinco próximas citas según el ámbito autorizado. Administración integra `GET /api/audit` con los últimos cien eventos sin contenido clínico. Las operaciones clínicas usan API; Ionic Storage se conserva únicamente para recuperación voluntaria de datos antiguos.

`npm run check:readiness -- --bootstrap` comprueba cuentas, variables y correo; inicializa solo si no hay usuarios y las variables son válidas. La creación sigue pendiente por BOOTSTRAP_PASSWORD inválida. No hay SMTP completo ni acceso confirmado/vinculación de Vercel. El secreto local insuficiente se corrigió tras verificar que no existían identidades ni sesiones.

La actualización de seguridad conservó Angular 20, Ionic 8 y Capacitor 7, sin flags de resolución forzada: Capacitor CLI 7.6.9 y tar 7.5.22 eliminan la alerta crítica. La auditoría del frontend de ejecución reportó cero alertas; el backend conserva cuatro moderadas de herramientas Drizzle/esbuild y el árbol de desarrollo conserva alertas Angular/Vercel. No se afirma que todas las dependencias estén libres de vulnerabilidades.
