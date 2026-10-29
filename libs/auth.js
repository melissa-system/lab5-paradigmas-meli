// Utilidades de autenticacion de UNA Chat (Auth0 via express-openid-connect).

// Solo datos publicos del perfil: nunca tokens, ids de sesion ni secretos
function publicProfile(user) {
  if (!user) { return null; }
  var nombre = user.name || user.nickname || user.email || 'Usuario';
  var foto = typeof user.picture === 'string' && /^https:\/\//i.test(user.picture) ? user.picture : '';
  return {
    name: String(nombre),
    email: typeof user.email === 'string' ? user.email : '',
    picture: foto
  };
}

// Traduce un error del callback a un codigo propio de una lista blanca
function mapAuthError(err) {
  return err && err.error === 'access_denied' ? 'cancelled' : 'failed';
}

// Reemplaza el remitente enviado por el cliente por el de la identidad
function withSender(raw, name) {
  try {
    var obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      obj.nombre = name;
      return JSON.stringify(obj);
    }
  } catch (e) {
    // payload invalido: validateMessage lo convierte en mensaje vacio
  }
  return raw;
}

function isAuthenticated(req) {
  return Boolean(req.oidc && typeof req.oidc.isAuthenticated === 'function' && req.oidc.isAuthenticated());
}

module.exports = {
  publicProfile: publicProfile,
  mapAuthError: mapAuthError,
  withSender: withSender,
  isAuthenticated: isAuthenticated
};
