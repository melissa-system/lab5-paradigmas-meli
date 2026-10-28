var assert = require('assert');
var fs = require('fs');
var path = require('path');
var { JSDOM } = require('jsdom');
var ioClient = require('socket.io-client');

var INDEX_HTML = path.resolve(__dirname, '..', 'index.html');

// ---------------------------------------------------------------------------
// Mini-implementacion de jQuery: solo lo que index.html usa.
// ---------------------------------------------------------------------------
function makeJQuery(window) {
  var document = window.document;

  function wrap(nodes) {
    nodes = nodes.filter(Boolean);
    var api = {
      _nodes: nodes,
      length: nodes.length,
      val: function (v) {
        if (v === undefined) { return nodes[0] ? nodes[0].value : ''; }
        nodes.forEach(function (n) { n.value = v; });
        return api;
      },
      text: function (v) {
        if (v === undefined) { return nodes[0] ? nodes[0].textContent : ''; }
        nodes.forEach(function (n) { n.textContent = v; });
        return api;
      },
      css: function () { return api; },
      prop: function (name, v) {
        nodes.forEach(function (n) { n[name] = v; });
        return api;
      },
      addClass: function (c) { nodes.forEach(function (n) { n.classList.add(c); }); return api; },
      removeClass: function (c) { nodes.forEach(function (n) { n.classList.remove(c); }); return api; },
      hasClass: function (c) { return nodes[0] ? nodes[0].classList.contains(c) : false; },
      append: function (child) {
        var el = (child && child._single) ? child._single : child;
        nodes.forEach(function (n) {
          if (typeof el === 'string') {
            n.appendChild(document.createTextNode(el));
          } else {
            n.appendChild(el);
          }
        });
        return api;
      },
      on: function (evt, fn) { nodes.forEach(function (n) { n.addEventListener(evt, fn); }); return api; },
      submit: function (fn) { nodes.forEach(function (n) { n.addEventListener('submit', fn); }); return api; },
      focus: function () { if (nodes[0] && nodes[0].focus) { nodes[0].focus(); } return api; },
      html: function (v) { if (nodes[0]) { nodes[0].innerHTML = v; } return api; }
    };
    return api;
  }

  function $(sel) {
    if (typeof sel === 'function') { sel(); return wrap([]); }
    if (typeof sel === 'string' && /^<(\w+)>$/.test(sel)) {
      var tag = sel.replace(/[<>]/g, '');
      var el = document.createElement(tag);
      var single = wrap([el]);
      single._single = el;
      return single;
    }
    if (sel === 'form') { return wrap(Array.prototype.slice.call(document.querySelectorAll('form'))); }
    if (typeof sel === 'string' && sel.charAt(0) === '#') { return wrap([document.getElementById(sel.slice(1))]); }
    if (sel.nodeType) { return wrap([sel]); }
    return wrap(Array.prototype.slice.call(document.querySelectorAll(sel)));
  }

  return $;
}

// ---------------------------------------------------------------------------
// Entorno de DOM con socket simulado. nameGuardado simula localStorage.
// ---------------------------------------------------------------------------
function crearEntorno(nombreGuardado) {
  var html = fs.readFileSync(INDEX_HTML, 'utf8');

  var dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
  var window = dom.window;
  var document = window.document;

  var $ = makeJQuery(window);

  // socket falso: guarda listeners y emisiones
  var listeners = {};
  var emitidos = [];
  var fakeSocket = {
    on: function (evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },
    emit: function (evt, payload) { emitidos.push({ evt: evt, payload: payload }); },
    disparar: function (evt, payload) { (listeners[evt] || []).forEach(function (fn) { fn(payload); }); }
  };

  // localStorage falso, pre-cargado opcionalmente
  var store = {};
  if (nombreGuardado) { store['chat_ux_nombre'] = nombreGuardado; }

  window.$ = $;
  window.jQuery = $;
  window.io = function () { return fakeSocket; };
  window.scrollTo = function () {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    }
  });

  // extrae y evalua el script inline del chat
  var script = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/)[1];
  window.eval(script);

  return { dom: dom, window: window, document: document, socket: fakeSocket, emitidos: emitidos, $: $, store: store };
}

describe('chat-ux (integracion DOM)', function () {

  describe('Requerimiento: Indicador de estado de conexion', function () {

    it('Given un cliente recien cargado, Then el indicador muestra Desconectado', function () {
      var e = crearEntorno();
      assert.equal(e.document.getElementById('estado').textContent, 'Desconectado');
    });

    it('Given el cliente, When se dispara connect, Then el indicador muestra Conectado', function () {
      var e = crearEntorno();
      e.socket.disparar('connect');
      var estado = e.document.getElementById('estado');
      assert.equal(estado.textContent, 'Conectado');
      assert.equal(estado.classList.contains('conectado'), true);
      assert.equal(estado.classList.contains('desconectado'), false);
    });

    it('Given el cliente conectado, When se dispara disconnect, Then el indicador muestra Desconectado', function () {
      var e = crearEntorno();
      e.socket.disparar('connect');
      e.socket.disparar('disconnect');
      var estado = e.document.getElementById('estado');
      assert.equal(estado.textContent, 'Desconectado');
      assert.equal(estado.classList.contains('desconectado'), true);
    });

    it('Given el cliente conectado, When se dispara connect_error, Then el indicador muestra Desconectado', function () {
      var e = crearEntorno();
      e.socket.disparar('connect');
      e.socket.disparar('connect_error');
      assert.equal(e.document.getElementById('estado').textContent, 'Desconectado');
    });

  });

  describe('Requerimiento: Hora en cada mensaje', function () {

    it('Given un mensaje recibido, When se renderiza, Then incluye una hora HH:MM', function () {
      var e = crearEntorno();
      e.socket.disparar('Evento-Mensaje-Server', JSON.stringify({ nombre: 'meli', mensaje: 'hola', color: '#112233' }));
      var hora = e.document.querySelector('#messages li .hora');
      assert.ok(hora, 'debe existir el elemento de hora');
      assert.ok(/^\d{2}:\d{2}$/.test(hora.textContent), 'formato HH:MM, fue: ' + hora.textContent);
    });

  });

  describe('Requerimiento: Envio de mensajes', function () {

    function enviar(e) {
      e.document.querySelector('form').dispatchEvent(new e.window.Event('submit'));
    }

    it('Given el campo con contenido, When el usuario envia, Then se emite y el campo queda limpio', function () {
      var e = crearEntorno();
      e.$('#nombre').val('meli');
      e.$('#m').val('hola mundo');
      enviar(e);
      assert.equal(e.emitidos.length, 1);
      assert.equal(e.emitidos[0].evt, 'Evento-Mensaje-Server');
      assert.equal(e.$('#m').val(), '');
    });

    it('Given el campo vacio o con espacios, When el usuario intenta enviar, Then no se emite nada', function () {
      var e = crearEntorno();
      e.$('#m').val('   ');
      enviar(e);
      assert.equal(e.emitidos.length, 0);
    });

    it('Given un envio, When termina, Then el campo de texto recupera el foco', function () {
      var e = crearEntorno();
      e.$('#m').val('hola');
      enviar(e);
      assert.equal(e.document.activeElement, e.document.getElementById('m'));
    });

  });

  describe('Requerimiento: Feedback visual del formulario', function () {

    it('Given el campo vacio, When carga, Then el boton esta deshabilitado', function () {
      var e = crearEntorno();
      assert.equal(e.document.getElementById('enviar').disabled, true);
    });

    it('Given el campo, When se escribe contenido, Then el boton se habilita', function () {
      var e = crearEntorno();
      var m = e.document.getElementById('m');
      m.value = 'hola';
      m.dispatchEvent(new e.window.Event('input'));
      assert.equal(e.document.getElementById('enviar').disabled, false);
    });

    it('Given el campo con contenido, When se borra, Then el boton se deshabilita', function () {
      var e = crearEntorno();
      var m = e.document.getElementById('m');
      m.value = 'hola';
      m.dispatchEvent(new e.window.Event('input'));
      m.value = '';
      m.dispatchEvent(new e.window.Event('input'));
      assert.equal(e.document.getElementById('enviar').disabled, true);
    });

  });

  describe('Requerimiento: Persistencia del nombre de usuario', function () {

    it('Given un nombre escrito, When el usuario envia, Then se guarda en localStorage', function () {
      var e = crearEntorno();
      e.$('#nombre').val('melissa');
      e.$('#m').val('hola');
      e.document.querySelector('form').dispatchEvent(new e.window.Event('submit'));
      assert.equal(e.store['chat_ux_nombre'], 'melissa');
    });

    it('Given un nombre guardado, When el cliente carga, Then el campo de nombre se rellena', function () {
      var e = crearEntorno('melissa');
      assert.equal(e.$('#nombre').val(), 'melissa');
    });

  });

  describe('Requerimiento: Distincion de mensajes propios', function () {

    it('Given el usuario meli, When recibe su propio mensaje, Then se marca como propio', function () {
      var e = crearEntorno('meli');
      e.socket.disparar('Evento-Mensaje-Server', JSON.stringify({ nombre: 'meli', mensaje: 'hola', color: '#112233' }));
      var li = e.document.querySelector('#messages li');
      assert.equal(li.classList.contains('propio'), true);
    });

    it('Given el usuario meli, When recibe un mensaje ajeno, Then no se marca como propio', function () {
      var e = crearEntorno('meli');
      e.socket.disparar('Evento-Mensaje-Server', JSON.stringify({ nombre: 'otro', mensaje: 'hola', color: '#112233' }));
      var li = e.document.querySelector('#messages li');
      assert.equal(li.classList.contains('propio'), false);
    });

  });

  describe('Requerimiento: Autoscroll a mensajes recientes', function () {

    it('Given la lista, When llega un mensaje, Then se llama a scrollTo', function () {
      var e = crearEntorno();
      var llamado = false;
      e.window.scrollTo = function () { llamado = true; };
      e.socket.disparar('Evento-Mensaje-Server', JSON.stringify({ nombre: 'meli', mensaje: 'hola', color: '#112233' }));
      assert.equal(llamado, true);
    });

  });

});

// ---------------------------------------------------------------------------
// E2E: servidor real + cliente socket.io real
// ---------------------------------------------------------------------------
describe('chat-ux e2e (servidor real)', function () {

  this.timeout(15000);

  var server;
  var url;

  before(function (done) {
    var mod = require('../server');
    server = mod.http.listen(0, '127.0.0.1', function () {
      url = 'http://127.0.0.1:' + server.address().port;
      done();
    });
  });

  after(function (done) {
    server.close(function () { done(); });
    if (server.io) { server.io.close(); }
  });

  function cliente() {
    return ioClient(url, { forceNew: true, transports: ['websocket'] });
  }

  it('Given un cliente, When envia un mensaje valido, Then lo recibe de vuelta', function (done) {
    var c = cliente();
    c.on('connect', function () {
      c.emit('Evento-Mensaje-Server', JSON.stringify({ nombre: 'e2e', mensaje: 'hola e2e', color: '#112233' }));
    });
    c.on('Evento-Mensaje-Server', function (msg) {
      var obj = JSON.parse(msg);
      try {
        assert.equal(obj.nombre, 'e2e');
        assert.equal(obj.mensaje, 'hola e2e');
        c.close();
        done();
      } catch (err) { c.close(); done(err); }
    });
  });

  it('Given un cliente, When envia un script, Then el servidor lo neutraliza', function (done) {
    var c = cliente();
    c.on('connect', function () {
      c.emit('Evento-Mensaje-Server', JSON.stringify({ nombre: 'e2e', mensaje: '<script>alert(1)</script>', color: '#112233' }));
    });
    c.on('Evento-Mensaje-Server', function (msg) {
      var obj = JSON.parse(msg);
      try {
        assert.equal(obj.mensaje.indexOf('<script>'), -1);
        c.close();
        done();
      } catch (err) { c.close(); done(err); }
    });
  });

  it('Given un cliente, When envia una URL de video valida, Then recibe un reproductor', function (done) {
    var c = cliente();
    c.on('connect', function () {
      c.emit('Evento-Mensaje-Server', JSON.stringify({ nombre: 'e2e', mensaje: 'http://site.com/clip.mp4', color: '#112233' }));
    });
    c.on('Evento-Mensaje-Server', function (msg) {
      var obj = JSON.parse(msg);
      try {
        assert.equal(obj.mensaje.indexOf('<video'), 0);
        c.close();
        done();
      } catch (err) { c.close(); done(err); }
    });
  });

});
