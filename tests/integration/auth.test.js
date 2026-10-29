const request = require('supertest');
const { io: createClient } = require('socket.io-client');
const { createServer } = require('../../server');
const { fakeAuth, cookieFor } = require('../helpers/fakeAuth');

// Requerimientos de la capacidad social-auth (openspec/changes/add-social-auth-auth0).
// El middleware REAL de Auth0 se prueba con Mocha en test/auth-real.test.js:
// su dependencia openid-client es solo ESM y Jest no la carga en Node < 24.9.

const TICKET_SECRET = 't'.repeat(64);

function iniciar(options) {
  return new Promise((resolve) => {
    const server = createServer(options);
    server.http.listen(0, '127.0.0.1', () => {
      server.url = `http://127.0.0.1:${server.http.address().port}`;
      resolve(server);
    });
  });
}

function cerrar(server) {
  return new Promise((resolve) => server.io.close(() => resolve()));
}

function conectar(url, token) {
  return new Promise((resolve, reject) => {
    const client = createClient(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: token === undefined ? {} : { token }
    });
    client.on('connect', () => resolve(client));
    client.on('connect_error', (err) => { client.close(); reject(err); });
  });
}

async function tokenPara(server, nombre) {
  const res = await request(server.app).get('/socket-token').set('Cookie', cookieFor(nombre)).expect(200);
  return res.body.token;
}

describe('social-auth con autenticacion simulada', () => {
  let server;

  beforeAll(async () => {
    server = await iniciar({ auth: fakeAuth({ loginAs: 'Ana Prueba' }), ticketSecret: TICKET_SECRET });
  });

  afterAll(() => cerrar(server));

  describe('Acceso al chat requiere autenticacion', () => {
    test('Given un visitante sin sesion, When pide /, Then ve la pantalla de inicio de sesion y no el chat', async () => {
      const res = await request(server.app).get('/').expect(200);
      expect(res.text).toContain('Iniciar sesión');
      expect(res.text).not.toContain('id="messages"');
    });

    test('Given un usuario con sesion, When pide /, Then ve el chat', async () => {
      const res = await request(server.app).get('/').set('Cookie', cookieFor('Ana Prueba')).expect(200);
      expect(res.text).toContain('<title>Chat Socket.IO UNA</title>');
      expect(res.text).toContain('id="messages"');
    });

    test('Given un cliente sin ticket, When se conecta al canal, Then se rechaza', async () => {
      await expect(conectar(server.url)).rejects.toThrow('unauthorized');
    });

    test('Given un ticket invalido, When se conecta al canal, Then se rechaza', async () => {
      await expect(conectar(server.url, 'no.valido')).rejects.toThrow('unauthorized');
    });

    test('Given un visitante sin sesion, When pide /socket-token, Then recibe 401', async () => {
      await request(server.app).get('/socket-token').expect(401);
    });

    test('Given un usuario con sesion, When usa su ticket, Then se conecta al canal', async () => {
      const client = await conectar(server.url, await tokenPara(server, 'Ana Prueba'));
      expect(client.connected).toBe(true);
      client.close();
    });
  });

  describe('Inicio de sesion', () => {
    test('Given un visitante, When pide /login, Then se inicia el flujo de autenticacion', async () => {
      const res = await request(server.app).get('/login').expect(302);
      expect(res.headers.location).toBeDefined();
    });
  });

  describe('Identidad visible y cierre de sesion', () => {
    test('Given un usuario con sesion, When pide /me, Then recibe solo nombre, correo y foto', async () => {
      const res = await request(server.app).get('/me').set('Cookie', cookieFor('Ana Prueba')).expect(200);
      expect(Object.keys(res.body).sort()).toEqual(['email', 'name', 'picture']);
      expect(res.body.name).toBe('Ana Prueba');
      expect(JSON.stringify(res.body)).not.toContain('sid-interno');
    });

    test('Given un visitante sin sesion, When pide /me, Then recibe 401', async () => {
      await request(server.app).get('/me').expect(401);
    });

    test('Given el chat, Then ofrece cerrar sesion en /logout', async () => {
      const res = await request(server.app).get('/').set('Cookie', cookieFor('Ana Prueba')).expect(200);
      expect(res.text).toContain('href="/logout"');
      expect(res.text).toContain('Cerrar sesión');
    });
  });

  describe('Remitente tomado de la identidad', () => {
    test('Given Ana autenticada, When envia un mensaje con nombre "Admin", Then se publica como Ana', async () => {
      const client = await conectar(server.url, await tokenPara(server, 'Ana Prueba'));
      const recibido = new Promise((resolve) => client.once('Evento-Mensaje-Server', (m) => resolve(JSON.parse(m))));
      client.emit('Evento-Mensaje-Server', JSON.stringify({ nombre: 'Admin', mensaje: 'hola', color: '#112233' }));
      const msg = await recibido;
      expect(msg.nombre).toBe('Ana Prueba');
      expect(msg.mensaje).toBe('hola');
      client.close();
    });

    test('Given un nombre de identidad con HTML, When se publica, Then sigue saneado', async () => {
      const client = await conectar(server.url, await tokenPara(server, '<b>x</b>'));
      const recibido = new Promise((resolve) => client.once('Evento-Mensaje-Server', (m) => resolve(JSON.parse(m))));
      client.emit('Evento-Mensaje-Server', JSON.stringify({ nombre: 'z', mensaje: 'hola', color: '#112233' }));
      const msg = await recibido;
      expect(msg.nombre).not.toContain('<b>');
      client.close();
    });
  });

  describe('Cancelacion y errores de inicio de sesion', () => {
    test('Given el usuario cancela, When vuelve al callback con access_denied, Then se redirige con auth_error=cancelled', async () => {
      const res = await request(server.app).get('/callback?error=access_denied&error_description=User%20cancelled').expect(302);
      expect(res.headers.location).toBe('/?auth_error=cancelled');
    });

    test('Given otro error de Auth0, When vuelve al callback, Then se redirige con auth_error=failed', async () => {
      const res = await request(server.app).get('/callback?error=server_error').expect(302);
      expect(res.headers.location).toBe('/?auth_error=failed');
    });

    test('Given un error con HTML en la descripcion, Then la redireccion no la refleja', async () => {
      const res = await request(server.app).get('/callback?error=%3Cscript%3E&error_description=%3Cscript%3Ealert(1)%3C%2Fscript%3E').expect(302);
      expect(res.headers.location).toBe('/?auth_error=failed');
    });
  });
});

describe('social-auth: configuracion obligatoria', () => {
  test('Given que faltan variables, When se crea el servidor, Then no inicia y dice cual falta', () => {
    // falla al validar la configuracion, antes de cargar el SDK de Auth0
    expect(() => createServer({ env: {} })).toThrow(/AUTH0_DOMAIN/);
  });
});
