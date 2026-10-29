var assert = require('assert');
var fs = require('fs');
var path = require('path');

// Requerimiento social-auth: Mismo flujo en el despliegue (Vercel)
describe('social-auth: preparado para Vercel', function () {
  var RAIZ = path.resolve(__dirname, '..');
  var VARS = {
    AUTH0_DOMAIN: 'dev-ejemplo.us.auth0.com',
    AUTH0_CLIENT_ID: 'id',
    AUTH0_CLIENT_SECRET: 'secret',
    AUTH0_SECRET: 'z'.repeat(64),
    BASE_URL: 'https://una-chat.vercel.app'
  };
  var respaldo = {};

  before(function () {
    Object.keys(VARS).forEach(function (k) { respaldo[k] = process.env[k]; process.env[k] = VARS[k]; });
  });

  after(function () {
    Object.keys(VARS).forEach(function (k) {
      if (respaldo[k] === undefined) { delete process.env[k]; } else { process.env[k] = respaldo[k]; }
    });
  });

  it('Given las variables de entorno, When Vercel carga app.js, Then exporta la app Express', function () {
    var app = require('../app');
    assert.equal(typeof app, 'function');
    assert.equal(typeof app.handle, 'function');
  });

  it('Given el proyecto, Then no hay HTML en la raiz ni en public/ que se sirva sin autenticacion', function () {
    var raiz = fs.readdirSync(RAIZ).filter(function (f) { return /\.html?$/i.test(f); });
    assert.deepEqual(raiz, []);
    assert.equal(fs.existsSync(path.join(RAIZ, 'public')), false);
  });
});
