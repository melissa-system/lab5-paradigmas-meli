## Context

Ver `proposal.md`. UNA Chat es un servidor Express 5 + Socket.IO 4.8 (`server.js`) que sirve un único `index.html` (jQuery) y reemite mensajes validados por `libs/unalib.js`. No hay sesiones ni usuarios. Las pruebas importan `server.js` y usan `server.app`, `server.http` y `server.io`. Hay que agregar autenticación con Auth0 en local y en Vercel sin perder la validación existente ni la posibilidad de probar sin una cuenta real de Auth0.

## Goals / Non-Goals

**Goals:**
- Login/logout con Auth0 Universal Login y un proveedor social (Google).
- Proteger tanto la página del chat como el handshake de Socket.IO.
- Identidad visible y remitente asignado por el servidor (anti-suplantación).
- Manejo claro de cancelación/errores con reintento.
- Configuración solo por variables de entorno; secretos nunca en git ni en el navegador.
- Desplegable en Vercel; pruebas automatizadas sin depender de Auth0.

**Non-Goals:**
- Roles, permisos o administración de usuarios.
- Persistencia de mensajes o historial.
- Login con usuario/contraseña propio (solo social).
- Garantizar chat en tiempo real dentro de Vercel (ver Riesgos y la pregunta abierta de la propuesta).

## Decisions

- **SDK `express-openid-connect`** (oficial de Auth0 para Express, flujo Authorization Code del lado del servidor). La sesión vive en una cookie cifrada (`appSession`) firmada con `AUTH0_SECRET`; no requiere base de datos, lo que encaja con Vercel serverless. Alternativas: `passport-auth0` (más código y sesión en memoria, mala para serverless) o SPA SDK en el navegador (expondría tokens al cliente) → descartadas.
- **`authRequired: false` + control explícito.** `/` decide: con sesión envía `index.html`; sin sesión envía `login.html`. Así el visitante ve una pantalla propia que le pide iniciar sesión (criterio 6) en lugar de un redirect opaco. Rutas: `/login`, `/logout`, `/callback` del SDK; `/me` devuelve `{ name, email, picture }` o 401; `/socket-token` devuelve el ticket del canal o 401.
- **Socket.IO autenticado con un ticket firmado de corta duración.** El SDK escribe la cookie de sesión con métodos de Express (`res.cookie`/`res.clearCookie`), que no existen en las peticiones crudas del handshake de Socket.IO, así que no se ejecuta `io.engine.use(auth)`. En su lugar, `/socket-token` (solo con sesión) entrega un ticket HMAC-SHA256 con `{ name, exp }` (vence en 2 minutos, clave derivada de `AUTH0_SECRET`); el cliente lo envía en `io({ auth })` (función, así cada reconexión pide uno nuevo) e `io.use()` lo verifica y rechaza con `unauthorized` si falta, está alterado o venció. El nombre queda en `socket.data.user` y el servidor sobrescribe `nombre` antes de `validateMessage` (sigue saneado). La cookie de sesión sigue siendo HttpOnly. Alternativas: emular `res.cookie` sobre la respuesta cruda (frágil) o descifrar la cookie a mano (duplica lógica interna del SDK) → descartadas.
- **Fábrica inyectable `createServer({ auth, env })`.** Por defecto construye el middleware real desde las variables de entorno y falla con un mensaje claro si falta alguna (nunca "fail open"). Las pruebas inyectan un middleware falso que define `req.oidc` (usuario fijo o anónimo). `server.js` sigue exportando `{ app, http, io, port }` cuando se ejecuta directamente; las pruebas usan la fábrica. El servidor falso de E2E vive en `tests/e2e/` y no forma parte del código de producción.
- **Errores de login vía manejador de errores de Express.** Los errores que lanza el SDK en `/callback` (p. ej. `access_denied` cuando el usuario cancela) se mapean a un código propio de una lista blanca (`cancelled` | `failed`) y se redirige a `/?auth_error=<código>`. `login.html` traduce el código a un texto fijo en español; nunca inserta en el DOM texto que venga de la URL.
- **Identidad en el cliente.** `index.html` llama a `/me` al cargar, pinta nombre/foto en una barra superior con un enlace "Cerrar sesión" (`/logout`), rellena el campo nombre en solo lectura y usa ese nombre para marcar mensajes propios. Se elimina el uso de `localStorage` para el nombre.
- **Vercel.** Vercel detecta Express sin configuración si existe `app.js`/`index.js`/`server.js` que exporte la app; `app.js` exporta `createServer().app`. Solo `public/**` se sirve como estático, así que las páginas viven en `views/` y se leen con `fs.readFileSync` (Vercel las incluye en la función); no queda HTML en la raíz que pueda saltarse el login. Sin `vercel.json`. `BASE_URL` se define por ambiente (local: `http://localhost:3000`; Vercel: el dominio `https://<proyecto>.vercel.app`). Variables configuradas en el panel de Vercel.
- **`dotenv` solo para local.** Se carga si existe `.env`; en Vercel se usan las variables del panel.

## Risks / Trade-offs

- [Vercel no mantiene WebSockets ni estado entre invocaciones] → El login/logout funciona; el chat en vivo puede no hacerlo. Se documenta en el README y queda como pregunta de negocio. Mitigación posible fuera de alcance: alojar Socket.IO en un servicio con procesos persistentes.
- [Ticket robado dentro de su ventana de 2 minutos] → solo permite publicar con ese nombre durante ese lapso; no da acceso a la sesión ni a tokens. Las pruebas cubren ticket ausente, alterado, de otro secreto y vencido.
- [Jest no puede cargar `openid-client` (solo ESM) en Node < 24.9] → las pruebas con el middleware real de Auth0 corren en Mocha (`test/auth-real.test.js`); Jest usa la autenticación simulada.
- [Llaves de desarrollo de Google en Auth0] → sirven para el laboratorio pero Auth0 advierte que no son para producción; documentado.
- [Cambio rompe el comportamiento previo de nombre libre] → Marcado como BREAKING; las pruebas existentes se adaptan.
- [Secretos filtrados por error] → `.env` ya está en `.gitignore`; se agrega `.env.example` y una prueba que verifica que las respuestas al navegador no contienen el secreto.
