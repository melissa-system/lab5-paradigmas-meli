// Ticket corto y firmado (HMAC-SHA256) que autoriza la conexion al canal de
// Socket.IO. Lo entrega /socket-token solo a usuarios con sesion; el handshake
// lo verifica. No contiene secretos: solo el nombre y su vencimiento.
var crypto = require('crypto');

var DEFAULT_TTL_SECONDS = 120;

function clave(secret) {
  // clave derivada: separa el uso del secreto de sesion del de los tickets
  return crypto.createHash('sha256').update('una-chat:socket-ticket:' + secret).digest();
}

function firma(datos, secret) {
  return crypto.createHmac('sha256', clave(secret)).update(datos).digest('base64url');
}

function sign(payload, secret, ttlSeconds, now) {
  var ahora = typeof now === 'number' ? now : Date.now();
  var ttl = typeof ttlSeconds === 'number' ? ttlSeconds : DEFAULT_TTL_SECONDS;
  var datos = Buffer.from(JSON.stringify({
    name: String(payload.name),
    exp: ahora + ttl * 1000
  })).toString('base64url');
  return datos + '.' + firma(datos, secret);
}

// Devuelve { name } si el ticket es valido y vigente; si no, null
function verify(token, secret, now) {
  if (typeof token !== 'string') { return null; }
  var partes = token.split('.');
  if (partes.length !== 2 || !partes[0] || !partes[1]) { return null; }

  var esperada = Buffer.from(firma(partes[0], secret));
  var recibida = Buffer.from(partes[1]);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) {
    return null;
  }

  try {
    var payload = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
    var ahora = typeof now === 'number' ? now : Date.now();
    if (!payload || typeof payload.name !== 'string' || typeof payload.exp !== 'number' || payload.exp < ahora) {
      return null;
    }
    return { name: payload.name };
  } catch (e) {
    return null;
  }
}

module.exports = { sign: sign, verify: verify, DEFAULT_TTL_SECONDS: DEFAULT_TTL_SECONDS };
