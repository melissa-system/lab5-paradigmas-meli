// Middleware de autenticacion FALSO, solo para pruebas.
// Imita la forma de `req.oidc` que expone express-openid-connect, sin contactar
// a Auth0. El usuario "autenticado" se toma de la cookie `test-user`.
// Nunca se usa en produccion: server.js construye el middleware real desde las
// variables de entorno y falla si faltan.

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
  });
  return out;
}

function userFromName(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
  return {
    sub: `test|${slug}`,
    name,
    email: `${slug}@test.local`,
    picture: '',
    // datos internos que NUNCA deben llegar al navegador
    sid: 'sid-interno-de-prueba'
  };
}

function cookieFor(name) {
  return `test-user=${encodeURIComponent(name)}`;
}

function fakeAuth(options = {}) {
  const loginAs = options.loginAs || 'Usuario Prueba';

  return function fakeAuthMiddleware(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    const user = cookies['test-user'] ? userFromName(cookies['test-user']) : undefined;

    req.oidc = {
      isAuthenticated: () => Boolean(user),
      user
    };

    const url = new URL(req.url || '/', 'http://localhost');

    // /login: simula un proveedor que autentica de inmediato
    if (url.pathname === '/login') {
      res.statusCode = 302;
      res.setHeader('Set-Cookie', `${cookieFor(loginAs)}; Path=/; HttpOnly`);
      res.setHeader('Location', '/');
      return res.end();
    }

    // /logout: borra la sesion simulada
    if (url.pathname === '/logout') {
      res.statusCode = 302;
      res.setHeader('Set-Cookie', 'test-user=; Path=/; Max-Age=0');
      res.setHeader('Location', '/');
      return res.end();
    }

    // /callback?error=...: simula el error que lanza el SDK real
    // (http-errors 400 con la propiedad `error` del proveedor)
    if (url.pathname === '/callback') {
      const err = new Error('callback error');
      err.status = 400;
      err.error = url.searchParams.get('error') || 'invalid_request';
      return next(err);
    }

    return next();
  };
}

module.exports = { fakeAuth, cookieFor, parseCookies };
