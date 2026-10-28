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

async function abrirChatConectado(page) {
  await page.goto('/');
  await expect(page.locator('#estado')).toHaveText('Conectado', { timeout: 15000 });
  await page.getByPlaceholder('Username').fill('Playwright');
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
