## Why

Hoy cualquiera que abra UNA Chat puede escribir con el nombre que quiera: no hay identidad ni control de acceso. La historia US-01 pide que el usuario inicie sesión con una cuenta de red social (OAuth mediante Auth0) para acceder al chat sin crear otra contraseña, que la app muestre quién está conectado y que funcione tanto en local como desplegada en Vercel.

## What Changes

- Integrar Auth0 (Universal Login) con al menos un proveedor social (Google) para iniciar y cerrar sesión.
- **BREAKING**: el chat requiere autenticación. Sin sesión, `/` muestra una pantalla que pide iniciar sesión y el canal en tiempo real rechaza la conexión.
- Mostrar la identidad del usuario autenticado (nombre y foto si existe) y un botón para cerrar sesión.
- El nombre del remitente de cada mensaje lo asigna el servidor a partir de la identidad autenticada; el campo de nombre deja de ser editable y ya no se guarda en el navegador.
- Mostrar un mensaje claro y un botón "Reintentar" cuando el usuario cancela el inicio de sesión o Auth0 devuelve un error.
- Toda la configuración (dominio, client id, client secret, secreto de sesión, URL base) se lee de variables de entorno; se agrega `.env.example` sin credenciales y ningún secreto llega al navegador.
- Preparar el despliegue en Vercel (punto de entrada serverless + `vercel.json`) y documentar en el README la configuración de Auth0, la ejecución local y el despliegue.

## Capabilities

### New Capabilities
- `social-auth`: inicio y cierre de sesión con proveedor social vía Auth0, protección del chat, identidad visible, manejo de cancelación/errores y configuración por variables de entorno.

### Modified Capabilities
- `chat-ux`: se elimina el requisito "Persistencia del nombre de usuario" y se agrega "Nombre desde la identidad autenticada": el nombre proviene de la identidad en lugar de escribirse y guardarse en el navegador.

## Impact

- `server.js`: se refactoriza a una fábrica `createServer({ auth })` para poder inyectar la autenticación (real en producción, falsa en pruebas); middleware de Auth0, rutas `/login`, `/logout`, `/callback`, `/me`, protección del handshake de Socket.IO y manejador de errores de autenticación.
- `index.html`: barra de identidad (nombre, foto, "Cerrar sesión"); el campo nombre pasa a solo lectura.
- Nuevo `login.html`: pantalla de inicio de sesión y de error con "Reintentar".
- Nuevos `api/index.js` y `vercel.json` para Vercel; nuevos `.env.example` y `README.md`.
- Nueva dependencia de producción: `express-openid-connect` (SDK oficial de Auth0 para Express). Desarrollo: `dotenv` para cargar `.env` en local.
- Pruebas: se adaptan las suites de integración (Jest) y E2E (Playwright) para usar un servidor con autenticación falsa; nuevas pruebas para los escenarios de `social-auth`.
- Sin cambios en `libs/unalib.js` (la validación de mensajes se mantiene).

## Open questions (negocio)

- **Tiempo real en Vercel:** Vercel ejecuta la app como funciones serverless y no mantiene conexiones WebSocket persistentes. El flujo de inicio y cierre de sesión (lo que pide el criterio 7) funcionará en Vercel, pero el intercambio de mensajes en tiempo real por Socket.IO puede no funcionar allí. Si se requiere chat en vivo en el despliegue, habría que definir otro hosting para el servidor de Socket.IO. Esto no impide implementar la historia; se documenta en el README.
