// Punto de entrada para Vercel (deteccion automatica de Express: app.js).
// Exporta la app de UNA Chat con Auth0 configurado desde las variables de
// entorno del proyecto en Vercel. En local se usa `npm start` (server.js).
const { createServer } = require('./server');

module.exports = createServer().app;
