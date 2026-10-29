var assert = require('assert');
var request = require('supertest');
var ioClient = require('socket.io-client');
var { createServer } = require('../server');

// social-auth con el middleware REAL de Auth0 (express-openid-connect).
// No contacta a Auth0: solo se prueban rutas que no requieren discovery.
describe('social-auth con el middleware real de Auth0 (sin red)', function () {
  this.timeout(15000);

  var env = {
    AUTH0_DOMAIN: 'dev-ejemplo.us.auth0.com',
    AUTH0_CLIENT_ID: 'CLIENT_ID_DE_PRUEBA',
    AUTH0_CLIENT_SECRET: 'CLIENT_SECRET_QUE_NO_DEBE_FILTRARSE',
    AUTH0_SECRET: 'SESSION_SECRET_QUE_NO_DEBE_FILTRARSE_0123456789abcdef',
    BASE_URL: 'http://localhost:3000'
  };
  var server;
  var url;

  before(function (done) {
    server = createServer({ env: env });
    server.http.listen(0, '127.0.0.1', function () {
      url = 'http://127.0.0.1:' + server.http.address().port;
      done();
    });
  });

  after(function (done) {
    server.io.close(function () { done(); });
  });

  it('Given un visitante sin sesion, When pide /, Then ve la pantalla de inicio de sesion', async function () {
    var res = await request(server.app).get('/').expect(200);
    assert.ok(res.text.indexOf('Iniciar sesión') !== -1);
    assert.equal(res.text.indexOf('id="messages"'), -1);
  });

  it('Given las respuestas al navegador, Then no contienen el client secret ni el secreto de sesion', async function () {
    var rutas = ['/', '/me', '/socket-token', '/?auth_error=failed'];
    for (var i = 0; i < rutas.length; i++) {
      var res = await request(server.app).get(rutas[i]);
      var todo = JSON.stringify(res.headers) + res.text;
      assert.equal(todo.indexOf(env.AUTH0_CLIENT_SECRET), -1, rutas[i]);
      assert.equal(todo.indexOf(env.AUTH0_SECRET), -1, rutas[i]);
    }
  });

  it('Given un visitante sin sesion, When pide /me y /socket-token, Then recibe 401', async function () {
    await request(server.app).get('/me').expect(401);
    await request(server.app).get('/socket-token').expect(401);
  });

  it('Given un cliente sin ticket, When se conecta al canal, Then se rechaza', function (done) {
    var c = ioClient(url, { forceNew: true, reconnection: false, transports: ['websocket'] });
    c.on('connect', function () { c.close(); done(new Error('no deberia conectarse')); });
    c.on('connect_error', function (err) {
      c.close();
      try { assert.equal(err.message, 'unauthorized'); done(); } catch (e) { done(e); }
    });
  });
});
