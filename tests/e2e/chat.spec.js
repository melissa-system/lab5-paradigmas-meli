const { test, expect } = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const MEDIA = {
  '/test-image.jpg': { file: 'test-image.jpg', type: 'image/jpeg' },
  '/test-video.webm': { file: 'test-video.webm', type: 'video/webm' }
};

let mediaServer;
let mediaBaseUrl;

function servirArchivo(req, res, filePath, contentType) {
  const { size } = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? Number(match[1]) : 0;
    const end = match && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;

    if (start >= size) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      res.end();
      return;
    }

    res.writeHead(206, {
      'Content-Type': contentType,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': size,
    'Accept-Ranges': 'bytes'
  });
  fs.createReadStream(filePath).pipe(res);
}

test.beforeAll(async () => {
  mediaServer = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://127.0.0.1');
    const media = MEDIA[pathname];

    if (!media) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    servirArchivo(req, res, path.join(__dirname, 'fixtures', media.file), media.type);
  });

  await new Promise((resolve) => mediaServer.listen(0, '127.0.0.1', resolve));
  mediaBaseUrl = `http://127.0.0.1:${mediaServer.address().port}`;
});

test.afterAll(async () => {
  if (mediaServer) {
    await new Promise((resolve) => mediaServer.close(resolve));
  }
});

// US-01: el chat requiere sesion. El servidor E2E simula el proveedor social:
// /login autentica como "Usuario E2E" y vuelve a /.
async function iniciarSesion(page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await expect(page.locator('#usuario-nombre')).toHaveText('Usuario E2E');
}

async function abrirChatConectado(page) {
  await iniciarSesion(page);
  await expect(page.locator('#estado')).toHaveText('Conectado', { timeout: 15000 });
}

async function enviarMensaje(page, texto) {
  await page.getByPlaceholder('Escriba un mensaje').fill(texto);
  await page.getByRole('button', { name: 'Send' }).click();
}

test('Given una URL de imagen valida, When se envia, Then la imagen se muestra y termina de cargar', async ({ page }) => {
  const urlImagen = `${mediaBaseUrl}/test-image.jpg`;

  await abrirChatConectado(page);
  await enviarMensaje(page, urlImagen);

  const imagen = page.locator('#messages img').last();
  await expect(imagen).toBeVisible();
  await expect(imagen).toHaveAttribute('src', urlImagen);
  await expect
    .poll(() => imagen.evaluate((el) => el.complete && el.naturalWidth > 0), { timeout: 15000 })
    .toBe(true);
});

test('Given una URL de video valida, When se envia, Then el reproductor aparece y carga el contenido', async ({ page }) => {
  const urlVideo = `${mediaBaseUrl}/test-video.webm`;

  await abrirChatConectado(page);
  await enviarMensaje(page, urlVideo);

  const video = page.locator('#messages video').last();
  await expect(video).toBeVisible();
  await expect(video.locator('source')).toHaveAttribute('src', urlVideo);
  expect(await video.evaluate((el) => el.controls)).toBe(true);
  await expect
    .poll(() => video.evaluate((el) => el.readyState), { timeout: 20000 })
    .toBeGreaterThanOrEqual(2);
  expect(await video.evaluate((el) => el.duration)).toBeGreaterThan(0);
});

test('Given un script, When se envia, Then no se ejecuta ningun alert y el mensaje se muestra saneado', async ({ page }) => {
  const dialogos = [];

  page.on('dialog', async (dialog) => {
    dialogos.push(dialog.message());
    await dialog.dismiss();
  });

  await abrirChatConectado(page);
  await enviarMensaje(page, '<script>alert("xss")</script>');

  const mensaje = page.locator('#messages li').last();
  await expect(mensaje).toContainText('<script>alert("xss")</script>');
  expect(await mensaje.innerHTML()).toContain('&lt;script&gt;');
  await expect(page.locator('#messages script')).toHaveCount(0);
  expect(dialogos).toEqual([]);
});

// ---------------------------------------------------------------------------
// US-01 · social-auth
// ---------------------------------------------------------------------------

test('Given un visitante sin sesion, When abre UNA Chat, Then se le pide iniciar sesion y no ve el chat', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.locator('#messages')).toHaveCount(0);
});

test('Given un usuario que inicia sesion, When entra al chat, Then ve su identidad y publica con su nombre', async ({ page }) => {
  await abrirChatConectado(page);

  await expect(page.getByRole('link', { name: 'Cerrar sesión' })).toBeVisible();
  await expect(page.getByPlaceholder('Username')).toHaveValue('Usuario E2E');
  await expect(page.getByPlaceholder('Username')).not.toBeEditable();

  await enviarMensaje(page, 'hola desde e2e');
  const mensaje = page.locator('#messages li').last();
  await expect(mensaje).toContainText('Usuario E2E');
  await expect(mensaje).toContainText('hola desde e2e');
  await expect(mensaje).toHaveClass(/propio/);
});

test('Given un usuario autenticado, When cierra sesion, Then vuelve a la pantalla de inicio de sesion', async ({ page }) => {
  await abrirChatConectado(page);
  await page.getByRole('link', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.locator('#messages')).toHaveCount(0);
});

test('Given que el usuario cancela en el proveedor, When vuelve, Then ve un mensaje claro y puede reintentar', async ({ page }) => {
  await page.goto('/callback?error=access_denied&error_description=User%20cancelled');
  await expect(page.getByRole('alert')).toHaveText('Cancelaste el inicio de sesión.');

  await page.getByRole('link', { name: 'Reintentar' }).click();
  await expect(page.locator('#usuario-nombre')).toHaveText('Usuario E2E');
});

test('Given un error de autenticacion, When vuelve, Then ve el mensaje generico y Reintentar', async ({ page }) => {
  await page.goto('/callback?error=server_error');
  await expect(page.getByRole('alert')).toHaveText('No se pudo iniciar sesión. Intentá de nuevo.');
  await expect(page.getByRole('link', { name: 'Reintentar' })).toBeVisible();
});
