# UNA Chat

Chat en tiempo real (Node.js, Express 5, Socket.IO 4.8) del curso Paradigmas de Programación, UNA. Valida y sanea los mensajes contra inyección de scripts, muestra imágenes y videos, y requiere iniciar sesión con una red social mediante **Auth0** (historia US-01).

- Repositorio: https://github.com/melissa-system/lab5-paradigmas-meli
- Despliegue en Vercel: _agregar aquí la URL cuando esté desplegado_

## Contenido

1. [Requisitos](#requisitos)
2. [Configurar Auth0](#configurar-auth0)
3. [Ejecutar en local](#ejecutar-en-local)
4. [Pruebas](#pruebas)
5. [Desplegar en Vercel](#desplegar-en-vercel)
6. [Cómo funciona la autenticación](#cómo-funciona-la-autenticación)
7. [Limitación conocida: tiempo real en Vercel](#limitación-conocida-tiempo-real-en-vercel)

## Requisitos

- Node.js 20.19 o superior (recomendado 22 LTS)
- Una cuenta personal y gratuita en [Auth0](https://auth0.com)
- Para el despliegue: una cuenta en [Vercel](https://vercel.com) conectada a GitHub

## Configurar Auth0

1. **Crear la aplicación.** En el panel de Auth0: **Applications → Applications → + Create Application**.
   - Nombre: `UNA Chat`
   - Tipo: **Regular Web Applications** (tecnología: Express)
2. **Proveedor social.** En **Authentication → Social**, activá **google-oauth2** (Google). Si no existe, usá **+ Create Connection → Google / Gmail** y dejá vacíos Client ID y Client Secret para usar las llaves de desarrollo de Auth0. Luego, en la pestaña **Applications** de esa conexión, encendé **UNA Chat**.
   - Recomendado: en **Applications → UNA Chat → Connections**, apagá `Username-Password-Authentication` para que solo se entre con la red social.
3. **URLs permitidas.** En **Applications → UNA Chat → Settings**, sección *Application URIs* (separadas por coma):

   | Campo | Valor |
   |-------|-------|
   | Allowed Callback URLs | `http://localhost:3000/callback, https://<tu-proyecto>.vercel.app/callback` |
   | Allowed Logout URLs | `http://localhost:3000, https://<tu-proyecto>.vercel.app` |
   | Allowed Web Origins | `http://localhost:3000, https://<tu-proyecto>.vercel.app` |

   Guardá con **Save Changes**. Reemplazá `<tu-proyecto>` por el dominio real que te asigne Vercel.
4. **Datos para el `.env`.** En la misma pestaña **Settings** copiá **Domain**, **Client ID** y **Client Secret**.

## Ejecutar en local

```bash
git clone https://github.com/melissa-system/lab5-paradigmas-meli.git
cd lab5-paradigmas-meli
npm install
cp .env.example .env      # en Windows: copy .env.example .env
```

Completá `.env` (nunca lo subas a git, ya está en `.gitignore`):

| Variable | Valor |
|----------|-------|
| `AUTH0_DOMAIN` | Domain de la aplicación (p. ej. `dev-xxxx.us.auth0.com`) |
| `AUTH0_CLIENT_ID` | Client ID |
| `AUTH0_CLIENT_SECRET` | Client Secret |
| `AUTH0_SECRET` | Cadena aleatoria de 32+ caracteres para cifrar la sesión: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `BASE_URL` | `http://localhost:3000` |

Iniciá el servidor y abrí http://localhost:3000:

```bash
npm start
```

Sin sesión verás la pantalla **Iniciar sesión**; al entrar con Google volverás al chat con tu nombre, tu foto y el botón **Cerrar sesión**. Si falta alguna variable, el servidor no arranca e indica cuál.

## Pruebas

Las pruebas no necesitan Auth0: usan una autenticación simulada (`tests/helpers/fakeAuth.js`), salvo `test/auth-real.test.js`, que ejercita el middleware real de Auth0 sin conectarse a la red.

| Suite | Comando | Qué cubre |
|-------|---------|-----------|
| Unitarias / DOM (Mocha) | `npm test` | validación de mensajes, configuración, ticket del canal, pantalla de login, UX del chat, middleware real de Auth0, entrada de Vercel |
| Integración (Jest + Supertest + socket.io-client) | `npx jest tests/integration --runInBand --env=node` | rutas `/`, `/me`, `/socket-token`, rechazo del canal sin sesión, remitente desde la identidad, errores de login |
| End-to-end (Playwright) | `npx playwright test --project=chromium` | flujo completo en el navegador: login, chat, imagen, video, XSS, logout, cancelación |
| Dependencias (Snyk) | `npm run snyk:test` | vulnerabilidades conocidas |

La primera vez, Playwright puede pedir `npx playwright install chromium`. El reporte se abre con `npx playwright show-report`.

## Desplegar en Vercel

1. En Vercel: **Add New… → Project → Import** el repositorio `lab5-paradigmas-meli`. Vercel detecta Express automáticamente por `app.js`; no hace falta comando de build.
2. En **Settings → Environment Variables** (ambiente *Production*) agregá las mismas variables del `.env`, pero con `BASE_URL=https://<tu-proyecto>.vercel.app` (sin barra final).
3. **Deploy**. Copiá el dominio asignado y agregalo en Auth0 (paso 3 de [Configurar Auth0](#configurar-auth0)): callback, logout y web origin.
4. Si cambiaste variables después del primer despliegue, hacé **Redeploy** para que tomen efecto.
5. Probá en el dominio de Vercel: iniciar sesión, ver tu identidad y cerrar sesión.

## Cómo funciona la autenticación

- **SDK:** [`express-openid-connect`](https://github.com/auth0/express-openid-connect) (oficial de Auth0). Flujo *Authorization Code* del lado del servidor; la sesión vive en una cookie cifrada y HttpOnly (`appSession`), sin base de datos.
- **Rutas:** `/login`, `/callback` y `/logout` las maneja el SDK. `GET /` muestra `views/login.html` sin sesión y `views/index.html` con sesión. `GET /me` devuelve solo `{ name, email, picture }`.
- **Canal en tiempo real:** `GET /socket-token` entrega a usuarios con sesión un ticket firmado (HMAC-SHA256, vence en 2 minutos). Socket.IO rechaza con `unauthorized` cualquier conexión sin ticket válido. El servidor asigna el remitente de cada mensaje desde la identidad (nadie puede escribir con otro nombre).
- **Errores:** si el usuario cancela (`access_denied`) o Auth0 devuelve un error, se redirige a `/?auth_error=cancelled|failed` y la pantalla muestra un mensaje fijo en español con **Reintentar**. Nunca se muestra texto tomado de la URL.
- **Secretos:** solo en variables de entorno. Ni el Client Secret ni `AUTH0_SECRET` llegan al navegador (hay pruebas que lo verifican).
- **Especificación:** cambio OpenSpec `openspec/changes/add-social-auth-auth0` (propuesta, diseño, specs y tareas).

## Limitación conocida: tiempo real en Vercel

Vercel ejecuta la app como funciones serverless y no mantiene conexiones WebSocket persistentes. En el despliegue funcionan el **inicio y cierre de sesión** y la identidad, pero el **intercambio de mensajes en tiempo real (Socket.IO) puede no funcionar** y el indicador mostrará "Desconectado". En local funciona completo. Para tener chat en vivo en producción habría que alojar el servidor de Socket.IO en un servicio con procesos persistentes (por ejemplo Render o Railway); queda como decisión pendiente.
