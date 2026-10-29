var assert = require('assert');
var fs = require('fs');
var path = require('path');
var { JSDOM } = require('jsdom');

// Requerimientos social-auth: Acceso requiere autenticacion (pantalla de login)
// y Cancelacion y errores de inicio de sesion.
var LOGIN_HTML = fs.readFileSync(path.resolve(__dirname, '..', 'login.html'), 'utf8');

function abrir(query) {
  var dom = new JSDOM(LOGIN_HTML, { runScripts: 'dangerously', url: 'http://localhost/' + (query || '') });
  var d = dom.window.document;
  return {
    document: d,
    error: d.getElementById('error'),
    accion: d.getElementById('accion')
  };
}

describe('social-auth: pantalla de inicio de sesion', function () {

  it('Given un visitante sin sesion, Then se le pide iniciar sesion con un boton hacia /login', function () {
    var p = abrir();
    assert.equal(p.accion.textContent, 'Iniciar sesión');
    assert.equal(p.accion.getAttribute('href'), '/login');
    assert.equal(p.error.hidden, true);
  });

  it('Given que el usuario cancelo, Then muestra "Cancelaste el inicio de sesión" y Reintentar', function () {
    var p = abrir('?auth_error=cancelled');
    assert.equal(p.error.hidden, false);
    assert.equal(p.error.textContent, 'Cancelaste el inicio de sesión.');
    assert.equal(p.accion.textContent, 'Reintentar');
    assert.equal(p.accion.getAttribute('href'), '/login');
  });

  it('Given un error de autenticacion, Then muestra el mensaje generico y Reintentar', function () {
    var p = abrir('?auth_error=failed');
    assert.equal(p.error.textContent, 'No se pudo iniciar sesión. Intentá de nuevo.');
    assert.equal(p.accion.textContent, 'Reintentar');
  });

  it('Given un codigo desconocido, Then muestra el mensaje generico', function () {
    var p = abrir('?auth_error=otro_codigo');
    assert.equal(p.error.textContent, 'No se pudo iniciar sesión. Intentá de nuevo.');
  });

  it('Given un codigo con HTML, Then no renderiza el texto recibido', function () {
    var p = abrir('?auth_error=' + encodeURIComponent('<img src=x onerror=alert(1)>'));
    assert.equal(p.error.textContent, 'No se pudo iniciar sesión. Intentá de nuevo.');
    assert.equal(p.document.querySelector('img'), null);
  });

  it('Given un codigo heredado del prototipo, Then muestra el mensaje generico', function () {
    var p = abrir('?auth_error=toString');
    assert.equal(p.error.textContent, 'No se pudo iniciar sesión. Intentá de nuevo.');
  });

  it('Given la pantalla, Then no incluye secretos ni configuracion de Auth0', function () {
    assert.doesNotMatch(LOGIN_HTML, /client_?secret|AUTH0_|auth0\.com/i);
  });
});
