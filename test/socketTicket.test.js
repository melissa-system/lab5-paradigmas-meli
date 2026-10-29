var assert = require('assert');
var ticket = require('../libs/socketTicket');

// Requerimiento social-auth: Acceso al chat requiere autenticacion (canal en tiempo real)
describe('social-auth: ticket firmado para el canal en tiempo real', function () {
  var SECRET = 's'.repeat(64);

  it('Given un usuario, When se firma y se verifica, Then devuelve su nombre', function () {
    var t = ticket.sign({ name: 'Ana' }, SECRET);
    assert.equal(ticket.verify(t, SECRET).name, 'Ana');
  });

  it('Given un ticket alterado, When se verifica, Then se rechaza', function () {
    var t = ticket.sign({ name: 'Ana' }, SECRET);
    var partes = t.split('.');
    var falso = Buffer.from(JSON.stringify({ name: 'Admin', exp: Date.now() + 60000 })).toString('base64url');
    assert.equal(ticket.verify(falso + '.' + partes[1], SECRET), null);
  });

  it('Given otro secreto, When se verifica, Then se rechaza', function () {
    var t = ticket.sign({ name: 'Ana' }, SECRET);
    assert.equal(ticket.verify(t, 'o'.repeat(64)), null);
  });

  it('Given un ticket vencido, When se verifica, Then se rechaza', function () {
    var t = ticket.sign({ name: 'Ana' }, SECRET, 60, 1000);
    assert.equal(ticket.verify(t, SECRET, 1000 + 61 * 1000), null);
  });

  it('Given basura o vacio, When se verifica, Then se rechaza sin lanzar', function () {
    [undefined, null, '', 'abc', 'a.b.c', 123, {}].forEach(function (v) {
      assert.equal(ticket.verify(v, SECRET), null);
    });
  });
});
