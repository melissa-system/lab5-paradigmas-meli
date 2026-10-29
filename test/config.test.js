var assert = require('assert');
var config = require('../libs/config');

// Requerimiento social-auth: Configuracion por variables de entorno sin secretos expuestos

function envCompleto() {
  return {
    AUTH0_DOMAIN: 'dev-ejemplo.us.auth0.com',
    AUTH0_CLIENT_ID: 'client-id-de-prueba',
    AUTH0_CLIENT_SECRET: 'client-secret-de-prueba',
    AUTH0_SECRET: 'x'.repeat(64),
    BASE_URL: 'http://localhost:3000'
  };
}

describe('social-auth: configuracion por variables de entorno', function () {

  it('Given todas las variables, When se carga, Then arma la configuracion de Auth0', function () {
    var c = config.loadAuthConfig(envCompleto());
    assert.equal(c.issuerBaseURL, 'https://dev-ejemplo.us.auth0.com');
    assert.equal(c.baseURL, 'http://localhost:3000');
    assert.equal(c.clientID, 'client-id-de-prueba');
    assert.equal(c.clientSecret, 'client-secret-de-prueba');
    assert.equal(c.authRequired, false);
    assert.equal(c.auth0Logout, true);
    assert.equal(c.authorizationParams.response_type, 'code');
    assert.match(c.authorizationParams.scope, /openid/);
  });

  ['AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'AUTH0_SECRET', 'BASE_URL'].forEach(function (nombre) {
    it('Given falta ' + nombre + ', When se carga, Then falla indicando la variable', function () {
      var env = envCompleto();
      delete env[nombre];
      assert.throws(function () { config.loadAuthConfig(env); }, function (err) {
        return err.name === 'ConfigError' && err.message.indexOf(nombre) !== -1;
      });
    });
  });

  it('Given una variable solo con espacios, When se carga, Then se considera ausente', function () {
    var env = envCompleto();
    env.AUTH0_CLIENT_ID = '   ';
    assert.throws(function () { config.loadAuthConfig(env); }, /AUTH0_CLIENT_ID/);
  });

  it('Given el dominio con https:// y barra final, When se carga, Then lo normaliza', function () {
    var env = envCompleto();
    env.AUTH0_DOMAIN = 'https://dev-ejemplo.us.auth0.com/';
    assert.equal(config.loadAuthConfig(env).issuerBaseURL, 'https://dev-ejemplo.us.auth0.com');
  });

  it('Given BASE_URL con barra final, When se carga, Then la quita', function () {
    var env = envCompleto();
    env.BASE_URL = 'https://una-chat.vercel.app/';
    assert.equal(config.loadAuthConfig(env).baseURL, 'https://una-chat.vercel.app');
  });

  it('Given BASE_URL invalida, When se carga, Then falla', function () {
    var env = envCompleto();
    env.BASE_URL = 'no-es-url';
    assert.throws(function () { config.loadAuthConfig(env); }, /BASE_URL/);
  });

  it('Given AUTH0_SECRET corto, When se carga, Then falla pidiendo al menos 32 caracteres', function () {
    var env = envCompleto();
    env.AUTH0_SECRET = 'corto';
    assert.throws(function () { config.loadAuthConfig(env); }, /AUTH0_SECRET/);
  });

  it('Given el repositorio, Then .env.example lista todas las variables sin valores', function () {
    var fs = require('fs');
    var path = require('path');
    var ejemplo = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
    config.REQUIRED_VARS.forEach(function (nombre) {
      var linea = ejemplo.split(/\r?\n/).find(function (l) { return l.indexOf(nombre + '=') === 0; });
      assert.ok(linea, 'falta ' + nombre + ' en .env.example');
    });
    assert.doesNotMatch(ejemplo, /AUTH0_CLIENT_SECRET=\S/);
    assert.doesNotMatch(ejemplo, /AUTH0_SECRET=\S/);
  });

  it('Given el repositorio, Then .env esta excluido de git', function () {
    var fs = require('fs');
    var path = require('path');
    var gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
    assert.match(gitignore, /^\.env$/m);
  });
});
