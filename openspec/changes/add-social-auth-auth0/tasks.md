## 1. Configuración y dependencias

- [x] 1.1 Agregar `express-openid-connect` (producción) y `dotenv` (carga local de `.env`)
- [x] 1.2 Crear `.env.example` con `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `BASE_URL` sin valores reales; confirmar que `.env` está en `.gitignore`
- [x] 1.3 Módulo de configuración que lee y valida las variables y falla con un mensaje claro si falta alguna (prueba primero)

## 2. Servidor

- [x] 2.1 Refactorizar `server.js` a `createServer({ auth })`, manteniendo `npm start` y la validación existente (pruebas existentes adaptadas primero)
- [x] 2.2 `/` sirve `login.html` sin sesión e `index.html` con sesión
- [x] 2.3 `/me` devuelve solo `{ name, email, picture }` o 401
- [x] 2.4 Proteger el handshake de Socket.IO con un ticket firmado de `/socket-token` (`io.use`) y rechazar clientes sin sesión
- [x] 2.5 Asignar `nombre` desde la identidad autenticada antes de `validateMessage`
- [x] 2.6 Manejador de errores de autenticación: mapear a `cancelled`/`failed` y redirigir a `/?auth_error=<código>`

## 3. Cliente

- [x] 3.1 Crear `login.html` con botón "Iniciar sesión" y mensajes de cancelación/error con "Reintentar" (texto fijo por código, sin reflejar la URL)
- [x] 3.2 En `index.html`: barra de identidad (nombre, foto, "Cerrar sesión") cargada desde `/me`
- [x] 3.3 Campo nombre en solo lectura con el nombre de la identidad; quitar `localStorage` del nombre; marcar mensajes propios con ese nombre

## 4. Pruebas

- [x] 4.1 Integración (Jest): `/` con y sin sesión, `/me`, rechazo de Socket.IO sin sesión, anti-suplantación del remitente, redirección de errores, secretos ausentes en respuestas
- [x] 4.2 Unitarias (Mocha/jsdom): `login.html` muestra el mensaje correcto por código y el genérico ante códigos desconocidos o con HTML; `index.html` pinta la identidad
- [ ] 4.3 E2E (Playwright): servidor de prueba con autenticación falsa; flujo login → chat → mensaje → logout; actualizar `playwright.config.js`
- [x] 4.4 Ejecutar las tres suites y la auditoría de dependencias (Mocha 86, Jest 21, Playwright 8; `npm audit --omit=dev` sin vulnerabilidades). `npm run snyk:test` y capturas: en la máquina de Meli

## 5. Despliegue y documentación

- [x] 5.1 Entrada `app.js` para Vercel y páginas movidas a `views/` (sin HTML estático que evite el login)
- [x] 5.2 README: configurar Auth0 (aplicación, conexión social, URLs locales y de Vercel), ejecutar en local, desplegar en Vercel y limitación de tiempo real
- [ ] 5.3 Verificación manual con Auth0 real: login/logout/cancelación en local y en Vercel (evidencias)
