// Configuracion de Auth0 a partir de variables de entorno.
// Nunca se hardcodean credenciales: si falta algo, el servidor no arranca.

var REQUIRED_VARS = [
  'AUTH0_DOMAIN',
  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET',
  'AUTH0_SECRET',
  'BASE_URL'
];

var MIN_SECRET_LENGTH = 32;

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

function valor(env, nombre) {
  var v = env[nombre];
  return typeof v === 'string' ? v.trim() : '';
}

// Devuelve la configuracion para express-openid-connect o lanza ConfigError
function loadAuthConfig(env) {
  env = env || process.env;

  var faltantes = REQUIRED_VARS.filter(function (nombre) { return !valor(env, nombre); });
  if (faltantes.length) {
    throw new ConfigError(
      'Faltan variables de entorno para Auth0: ' + faltantes.join(', ') +
      '. Copia .env.example a .env y completalas (en Vercel: Settings > Environment Variables).'
    );
  }

  var dominio = valor(env, 'AUTH0_DOMAIN').replace(/^https?:\/\//i, '').replace(/\/+$/, '');

  var baseURL;
  try {
    baseURL = new URL(valor(env, 'BASE_URL'));
  } catch (e) {
    throw new ConfigError('BASE_URL no es una URL valida (ejemplo: http://localhost:3000).');
  }
  if (baseURL.protocol !== 'http:' && baseURL.protocol !== 'https:') {
    throw new ConfigError('BASE_URL debe usar http o https.');
  }

  var secreto = valor(env, 'AUTH0_SECRET');
  if (secreto.length < MIN_SECRET_LENGTH) {
    throw new ConfigError('AUTH0_SECRET debe tener al menos ' + MIN_SECRET_LENGTH + ' caracteres aleatorios.');
  }

  return {
    authRequired: false,          // el servidor decide que mostrar sin sesion
    auth0Logout: true,            // cerrar sesion tambien en Auth0
    issuerBaseURL: 'https://' + dominio,
    baseURL: baseURL.href.replace(/\/+$/, ''),
    clientID: valor(env, 'AUTH0_CLIENT_ID'),
    clientSecret: valor(env, 'AUTH0_CLIENT_SECRET'),
    secret: secreto,
    routes: {
      login: '/login',
      logout: '/logout',
      callback: '/callback'
    },
    authorizationParams: {
      response_type: 'code',
      scope: 'openid profile email'
    }
  };
}

module.exports = {
  REQUIRED_VARS: REQUIRED_VARS,
  ConfigError: ConfigError,
  loadAuthConfig: loadAuthConfig
};
