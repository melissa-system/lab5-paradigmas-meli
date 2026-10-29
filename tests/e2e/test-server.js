// Servidor SOLO PARA PRUEBAS E2E: la app real de UNA Chat con autenticacion
// simulada (tests/helpers/fakeAuth.js), para recorrer el flujo completo sin
// depender de Auth0 ni de credenciales. No se usa en produccion.
const { createServer } = require('../../server');
const { fakeAuth } = require('../helpers/fakeAuth');

const port = Number(process.env.E2E_PORT) || 3100;
const server = createServer({ auth: fakeAuth({ loginAs: 'Usuario E2E' }) });

server.http.listen(port, '127.0.0.1', () => {
  console.log(`UNA Chat (auth simulada) en http://127.0.0.1:${port}`);
});
