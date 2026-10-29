// UNA Chat: Express + Socket.IO con autenticacion social (Auth0).

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var express = require('express');
var { Server } = require('socket.io');
var validation = require('./libs/unalib');
var { loadAuthConfig } = require('./libs/config');
var authUtils = require('./libs/auth');
var socketTicket = require('./libs/socketTicket');

var port = process.env.PORT || 3000;
// Las paginas viven en views/ (no en la raiz ni en public/) para que ningun
// hosting las sirva como archivo estatico sin pasar por la autenticacion.
// Se leen con readFileSync para que Vercel las incluya en la funcion.
var INDEX_HTML = fs.readFileSync(path.join(__dirname, 'views', 'index.html'), 'utf8');
var LOGIN_HTML = fs.readFileSync(path.join(__dirname, 'views', 'login.html'), 'utf8');

// Crea la app. Por defecto usa Auth0 real desde las variables de entorno y
// falla si falta alguna. Las pruebas pueden inyectar `auth` y `ticketSecret`.
function createServer(options) {
  options = options || {};

  var auth = options.auth;
  var ticketSecret = options.ticketSecret;

  if (!auth) {
    var authConfig = loadAuthConfig(options.env || process.env);
    auth = require('express-openid-connect').auth(authConfig);
    ticketSecret = ticketSecret || authConfig.secret;
  }
  if (!ticketSecret) {
    ticketSecret = crypto.randomBytes(32).toString('hex');
  }

  var app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true); // Vercel y otros proxies terminan HTTPS

  // /login, /logout y /callback los maneja el middleware de Auth0
  app.use(auth);

  // root: chat con sesion, pantalla de inicio de sesion sin ella
  app.get('/', function (req, res) {
    res.set('Cache-Control', 'no-store');
    res.type('html').send(authUtils.isAuthenticated(req) ? INDEX_HTML : LOGIN_HTML);
  });

  // identidad publica del usuario autenticado
  app.get('/me', function (req, res) {
    res.set('Cache-Control', 'no-store');
    if (!authUtils.isAuthenticated(req)) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    res.json(authUtils.publicProfile(req.oidc.user));
  });

  // ticket corto para conectarse al canal en tiempo real
  app.get('/socket-token', function (req, res) {
    res.set('Cache-Control', 'no-store');
    if (!authUtils.isAuthenticated(req)) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    var perfil = authUtils.publicProfile(req.oidc.user);
    res.json({ token: socketTicket.sign({ name: perfil.name }, ticketSecret) });
  });

  // errores del inicio de sesion (cancelacion, respuesta invalida...)
  app.use(function (err, req, res, next) {
    var esDeAutenticacion = req.path === '/callback' || (err && typeof err.error === 'string');
    if (!esDeAutenticacion) { return next(err); }
    var codigo = authUtils.mapAuthError(err);
    console.warn('Inicio de sesion fallido:', codigo);
    res.redirect('/?auth_error=' + codigo);
  });

  var http = require('http').createServer(app);
  var io = new Server(http);

  // solo se conectan clientes con un ticket valido
  io.use(function (socket, next) {
    var datos = socket.handshake.auth || {};
    var usuario = socketTicket.verify(datos.token, ticketSecret);
    if (!usuario) { return next(new Error('unauthorized')); }
    socket.data.user = usuario;
    next();
  });

  io.on('connection', function (socket) {
    socket.on('Evento-Mensaje-Server', function (msg) {
      // el remitente sale de la identidad, no de lo que envie el cliente
      var conRemitente = authUtils.withSender(msg, socket.data.user.name);
      io.emit('Evento-Mensaje-Server', validation.validateMessage(conRemitente));
    });
  });

  return { app: app, http: http, io: io };
}

// solo escucha al ejecutarse directamente (node server.js)
if (require.main === module) {
  require('dotenv').config({ quiet: true });
  var server;
  try {
    server = createServer();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  server.http.listen(port, function () {
    console.log('listening on *:' + port);
  });
}

module.exports = { createServer: createServer, port: port };
