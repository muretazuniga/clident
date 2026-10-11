# CLIDENT en Vercel

## Arquitectura y configuración

Se conserva Angular 20/Ionic 8 en `www`, la API TypeScript en `api/[...path].ts`, Drizzle/PostgreSQL y Better Auth. `vercel.json` usa el preset Other (`framework: null`), Node 24 definido en `package.json`, el build `npm run build:all` y la instalación de los dos árboles de dependencias mediante `npm ci && npm ci --prefix server`.

La configuración TypeScript de la Function usa NodeNext para emitir módulos ejecutables en Node 24. La configuración Angular permanece independiente. El adaptador HTTP comparte implementación entre Vercel, desarrollo y la fixture de navegador; soporta JSON ya parseado, strings, Buffer y cuerpos de streaming, limita las solicitudes a 1 MB, conserva múltiples cookies y no expone errores internos.

El fallback SPA excluye `/api`, `/api/*`, assets y archivos. Las respuestas API usan `no-store`. La política CSP permite scripts del mismo origen y estilos inline requeridos por Ionic; no permite scripts inline ni eval. Se deshabilitó únicamente la inserción de CSS crítico que generaba un handler inline en el HTML de Angular. Se conservan minificación y optimización de scripts y estilos.

`.vercelignore` y las exclusiones de la Function protegen `.env`, secretos, respaldos y fixtures. Los archivos `.env` no deben formar parte de un artefacto ni ser copiados a `www`. No se aplican migraciones ni bootstrap durante el build.

## Variables del servidor

Configura en Project Settings > Environment Variables:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión agrupada de Neon, exclusiva del backend |
| `BETTER_AUTH_SECRET` | Secreto aleatorio de al menos 32 caracteres, distinto por entorno |
| `BETTER_AUTH_URL` | Origen HTTPS estable de la aplicación, sin ruta, query ni fragmento |
| `NODE_ENV` | `production` en el entorno desplegado |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Envío de recuperación de contraseña; TLS obligatorio y timeouts acotados |

`DATABASE_URL_UNPOOLED` corresponde a herramientas de migración; no es necesaria para las peticiones de la Function. No guardes `BOOTSTRAP_PASSWORD` ni otras variables de bootstrap en Vercel. Conserva la URL directa en el entorno local controlado.

Preview debe usar una rama/base de pruebas independiente y un origen HTTPS estable configurado para sus cookies y recuperación. No apuntes pruebas de CRUD a la base clínica real. Los orígenes no se amplían automáticamente con comodines. No hace falta Neon CLI ni Git para este procedimiento.

## Verificaciones locales

1. `npm run build:all`, `npm run lint`, `npm test -- --watch=false`, `npm run test:server`.
2. `npm run test:browser`: datos ficticios en PGlite efímero; nueve rutas en cinco anchos, CSP, login, cookies, persistencia, logout y restricciones del profesional.
3. `npm run package:vercel`: usa el constructor oficial `@vercel/node` instalado con Vercel CLI. Genera solo el paquete de la Function en `artifacts/vercel-function`, verifica Node 24 y rechaza archivos privados. Reutiliza las dependencias ya instaladas y no accede a Neon ni a la cuenta Vercel.
4. `npm run test:vercel`: arranca el paquete anterior en un proceso Node 24 sin credenciales, impide resolver módulos fuera del paquete y comprueba un error 503 seguro. No prueba la infraestructura pública.
5. `npm run check:vercel`: ejecuta `whoami` sin mostrar datos de cuenta; informa si se confirmó autenticación y si existe una vinculación local. No vincula ni despliega.
6. `npm run check:assets`: revisa frontend y paquete de Function contra los secretos configurados, sin imprimirlos. Rechaza archivos `.env` incluidos. Es una comprobación adicional del artefacto, no una auditoría exhaustiva del historial Git.

El paquete de `artifacts` es una validación del constructor Node, no un resultado completo de `vercel build` ni un artefacto para `vercel deploy --prebuilt`. El build oficial requiere vinculación y configuración de cuenta, y sigue pendiente.

Resultados del 11 de octubre de 2026: build Angular/backend, TypeScript del servidor y de la Function y ESLint correctos; 18 pruebas Angular y 29 de backend aprobadas; 45 comprobaciones responsive con CSP activa y flujos de navegador aprobados; Function Node 24 empaquetada con 1.078 archivos y ejecutada con resolución aislada; 1.244 archivos del frontend y Function revisados sin coincidencias de secretos configurados ni archivos `.env`.

## Continuación por el propietario

La CLI local está instalada. Cuando dispongas de acceso a Vercel:

1. Ejecuta `npx --no-install vercel login` e inicia sesión en tu cuenta.
2. Ejecuta `npx --no-install vercel link` y selecciona explícitamente el proyecto y equipo. `.vercel` ya está ignorado. No conectes un repositorio Git si no deseas despliegues desde Git.
3. Configura las variables de Preview y Production en el dashboard. Elige el dominio HTTPS y usa su origen exacto en `BETTER_AUTH_URL`.
4. Ejecuta `npx --no-install vercel pull --environment=preview` para descargar ajustes al directorio privado `.vercel`; no sobrescribas el `.env` de desarrollo. Luego ejecuta `npx --no-install vercel build`.
5. Tras autorizar explícitamente un despliegue de prueba, ejecuta `npx --no-install vercel deploy --prebuilt`. No uses `--prod` sin autorización específica.
6. En la URL pública verifica carga de Angular, recarga de rutas internas, API JSON (nunca HTML), login y cookies Secure/HttpOnly, permisos, sesión y logout. Prueba CRUD e historial exclusivamente en la base de Preview con datos sintéticos. Verifica envío y uso único del enlace de recuperación.

En esta sesión no se confirmó autenticación de Vercel y no existe vinculación local ni URL desplegada. No se ejecutaron login interactivo, link, pull, deploy ni operaciones Git de escritura.

## Límites de verificación y seguridad

El build y el arranque aislado no comprueban rutas del edge público, TLS del dominio, concurrencia real, envío SMTP ni persistencia entre instancias de Functions. Deben comprobarse antes de usar el sistema con datos clínicos.

La revisión de dependencias corrigió `tar` crítico mediante Capacitor CLI 7.6.9 y un override de tar 7.5.22. Se aplicaron actualizaciones compatibles sin `--force` ni `--legacy-peer-deps`. El árbol de desarrollo conserva alertas que requieren seguimiento de herramientas Angular/Vercel; no se ha declarado libre de vulnerabilidades. Las alertas moderadas del backend proceden de herramientas Drizzle/esbuild y no forman parte de los módulos trazados para la Function.

Referencias: [Vercel build](https://vercel.com/docs/cli/build), [Vercel pull](https://vercel.com/docs/cli/pull), [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js).
