const request = require('supertest');
const { io: createClient } = require('socket.io-client');
const { createServer } = require('../../server');
const { fakeAuth, cookieFor } = require('../helpers/fakeAuth');
const validation = require('../../libs/unalib');

let server;
let httpServer;
let client;
let validateMessageSpy;

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout esperando la respuesta del servidor'));
    }, 5000);

    client.once('Evento-Mensaje-Server', (response) => {
      clearTimeout(timer);
      resolve(JSON.parse(response));
    });

    client.emit('Evento-Mensaje-Server', JSON.stringify(payload));
  });
}

// El chat requiere sesion (US-01): se usa autenticacion simulada y el ticket
// que entrega /socket-token al usuario autenticado.
const USUARIO = 'Usuario Integracion';

beforeAll((done) => {
  validateMessageSpy = jest.spyOn(validation, 'validateMessage');
  server = createServer({ auth: fakeAuth(), ticketSecret: 'i'.repeat(64) });

  httpServer = server.http.listen(0, '127.0.0.1', async () => {
    const { port } = httpServer.address();
    const { body } = await request(server.app).get('/socket-token').set('Cookie', cookieFor(USUARIO));
    client = createClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: { token: body.token }
    });
    client.on('connect', done);
    client.on('connect_error', done);
  });
});

afterAll(async () => {
  if (client) {
    client.close();
  }
  await new Promise((resolve) => server.io.close(resolve));
  validateMessageSpy.mockRestore();
});

beforeEach(() => {
  validateMessageSpy.mockClear();
});

describe('Backend HTTP', () => {
  test('Given un usuario autenticado, When se solicita GET /, Then entrega el cliente HTML del chat', async () => {
    const response = await request(server.app).get('/').set('Cookie', cookieFor(USUARIO)).expect(200);

    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('<title>Chat Socket.IO UNA</title>');
  });
});

describe('Backend + una-lib por Socket.IO', () => {
  test('Given una URL de imagen valida, When se envia el mensaje, Then el backend la acepta y devuelve un tag img', async () => {
    const payload = {
      nombre: 'Ana',
      color: '#112233',
      mensaje: 'https://example.com/foto.png'
    };

    const response = await sendMessage(payload);

    expect(validateMessageSpy).toHaveBeenCalledTimes(1);
    expect(validateMessageSpy).toHaveBeenCalledWith(JSON.stringify({ ...payload, nombre: USUARIO }));
    // el remitente lo asigna el servidor desde la identidad autenticada (US-01)
    expect(response.nombre).toBe(USUARIO);
    expect(response.mensaje).toContain('<img');
    expect(response.mensaje).toContain('foto.png');
  });

  test('Given una URL de video valida, When se envia el mensaje, Then el backend la acepta y devuelve un tag video', async () => {
    const payload = {
      nombre: 'Luis',
      color: '#445566',
      mensaje: 'https://example.com/clip.mp4'
    };

    const response = await sendMessage(payload);

    expect(validateMessageSpy).toHaveBeenCalledTimes(1);
    expect(response.mensaje).toContain('<video controls');
    expect(response.mensaje).toContain('clip.mp4');
  });

  test('Given un script, When se envia el mensaje, Then la validacion devuelve contenido saneado', async () => {
    const payload = {
      nombre: 'Meli',
      color: '#778899',
      mensaje: '<script>alert("xss")</script>'
    };

    const response = await sendMessage(payload);

    expect(validateMessageSpy).toHaveBeenCalledTimes(1);
    expect(response.mensaje).not.toContain('<script');
    expect(response.mensaje).toContain('&lt;script&gt;');
    expect(response.mensaje).toContain('alert');
  });

  test('Given una URL no permitida, When se envia el mensaje, Then no se genera tag de medio', async () => {
    const payload = {
      nombre: 'Meli',
      color: '#778899',
      mensaje: 'https://example.com/archivo.exe'
    };

    const response = await sendMessage(payload);

    expect(validateMessageSpy).toHaveBeenCalledTimes(1);
    expect(response.mensaje).not.toContain('<img');
    expect(response.mensaje).not.toContain('<video');
    expect(response.mensaje).toContain('archivo.exe');
  });
});
