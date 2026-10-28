// modulo de ejemplo.

// escapa caracteres peligrosos de HTML para prevenir inyeccion de scripts (XSS)
function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// detecta payloads de inyeccion de scripts en un texto
function hasScriptInjection(value) {
  if (typeof value !== 'string') {
    return false;
  }
  var patterns = [
    /<\s*script/i,              // etiquetas script
    /<\s*\/\s*script/i,
    /<\s*iframe/i,              // iframes inyectados
    /<\s*img[^>]*onerror/i,     // manejadores de eventos en img
    /<\s*svg/i,
    /<\s*object/i,
    /<\s*embed/i,
    /<\s*link/i,
    /<\s*style/i,
    /<\s*meta/i,
    /<\s*base/i,
    /<\s*form/i,
    /<\s*video[^>]*onerror/i,
    /<\s*audio/i,
    /on\w+\s*=/i,               // manejadores de eventos inline (onclick, onerror, onload...)
    /javascript\s*:/i,          // pseudo-protocolo javascript:
    /vbscript\s*:/i,
    /data\s*:\s*text\/html/i,   // data URIs con html
    /data\s*:\s*image\/svg/i,   // svg en data URI (puede contener script)
    /srcdoc\s*=/i,              // iframe srcdoc
    /formaction\s*=/i,          // secuestro de envio de formularios
    /expression\s*\(/i,         // css expression (IE)
    /&\{/,                      // ofuscacion de entidades
    /&#x?[0-9a-f]+;?/i          // entidades html (pueden codificar < >)
  ];
  for (var i = 0; i < patterns.length; i++) {
    if (patterns[i].test(value)) {
      return true;
    }
  }
  return false;
}

// limpia y valida un campo de texto libre (nombre, color, mensaje de texto)
function sanitizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  // elimina caracteres de control (excepto tab, salto de linea y retorno)
  var clean = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  // elimina espacios iniciales/finales y limita la longitud
  clean = clean.trim().slice(0, 1000);
  // si trae un patron malicioso conocido, se neutraliza por completo
  if (hasScriptInjection(clean)) {
    return escapeHtml(clean);
  }
  // de lo contrario se escapa igualmente para mostrarlo como texto plano seguro
  return escapeHtml(clean);
}

// valida que una url use un protocolo seguro (http/https)
function isSafeUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }
  // normaliza quitando espacios iniciales
  var trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return false;
  }
  // rechaza cualquier intento de inyeccion dentro de la url
  if (hasScriptInjection(trimmed)) {
    return false;
  }
  return true;
}

module.exports = {

  escapeHtml: escapeHtml,

  hasScriptInjection: hasScriptInjection,

  sanitizeText: sanitizeText,

  isSafeUrl: isSafeUrl,


    // logica que valida si un telefono esta correcto...
    is_valid_phone: function (phone) {
      // inicializacion lazy
      var isValid = false;
      // expresion regular copiada de StackOverflow
      var re = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/i;
  
      // validacion Regex
      try {
        isValid = re.test(phone);
      } catch (e) {
        console.log(e);
      } finally {
          return isValid;
      }
      // fin del try-catch block
    },
  
    is_valid_url_image: function (url) {
  
      // inicializacion lazy
      var isValid = false;
      // expresion regular anclada: la url debe terminar en una extension de imagen
      var re = /^https?:\/\/[^\s"'<>]+\.(?:jpg|gif|png|jpeg|bmp|webp|svg)(?:\?[^\s"'<>]*)?$/i;
  
      // validacion Regex
      try {
        isValid = isSafeUrl(url) && re.test(url.trim());
      } catch (e) {
        console.log(e);
      } finally {
          return isValid;
      }
      // fin del try-catch block
    },
  
    is_valid_video: function (url) {
  
      // inicializacion lazy
      var isValid = false;
      // expresion regular anclada para archivos de video comunes
      var re = /^https?:\/\/[^\s"'<>]+\.(?:mp4|webm|ogg|ogv|mov|avi|mkv)(?:\?[^\s"'<>]*)?$/i;
  
      // validacion Regex
      try {
        isValid = isSafeUrl(url) && re.test(url.trim());
      } catch (e) {
        console.log(e);
      } finally {
          return isValid;
      }
      // fin del try-catch block
    },
  
    is_valid_yt_video: function (url) {
  
      // inicializacion lazy
      var isValid = false;
      // expresion regular copiada de StackOverflow
      var re = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})$/i;
  
      // validacion Regex
      try {
        isValid = isSafeUrl(url) && re.test(url.trim());
      } catch (e) {
        console.log(e);
      } finally {
          return isValid;
      }
      // fin del try-catch block
    },
  
    getYTVideoId: function(url){
  
      return url.match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/)[1];
    },
  
    getEmbeddedCode: function (url){
      var id = this.getYTVideoId(url);
      // el id de YouTube solo puede contener caracteres seguros
      var safeId = encodeURIComponent(id).replace(/%2F/gi, '');
      var code = '<iframe width="560" height="315" src="https://www.youtube.com/embed/'+safeId+ '" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      return code;
    },
  
    getImageTag: function(url){
      var safeUrl = escapeHtml(url);
      var tag = '<img src="'+safeUrl+'" style="max-height: 400px;max-width: 400px;">';
      return tag;
    },
  
    getVideoTag: function(url){
      var safeUrl = escapeHtml(url);
      var tag = '<video controls style="max-height: 400px;max-width: 400px;"><source src="'+safeUrl+'">Tu navegador no soporta el elemento de video.</video>';
      return tag;
    },
  
    validateMessage: function(msg){
      // Handle invalid input
      if (!msg || typeof msg !== 'string') {
        return JSON.stringify({ mensaje: '' });
      }

      try {
        var obj = JSON.parse(msg);

        // el mensaje parseado debe ser un objeto
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
          return JSON.stringify({ mensaje: '' });
        }

      // sanitiza nombre y color: siempre son texto, nunca HTML
      obj.nombre = sanitizeText(obj.nombre);
      obj.color = sanitizeText(obj.color);

      // valida que el mensaje sea texto
      if (typeof obj.mensaje !== 'string') {
        obj.mensaje = '';
      }

      // una url de imagen/video solo genera el tag si es seguro y termina en extension valida
      if(this.is_valid_url_image(obj.mensaje)){
        console.log("Es una imagen!")
        obj.mensaje = this.getImageTag(obj.mensaje);
      }
      else if(this.is_valid_yt_video(obj.mensaje)){
        console.log("Es un video de YouTube!")
        obj.mensaje = this.getEmbeddedCode(obj.mensaje);
      }
      else if(this.is_valid_video(obj.mensaje)){
        console.log("Es un video!")
        obj.mensaje = this.getVideoTag(obj.mensaje);
      }
      else{
        // cualquier otro contenido se sanitiza y se muestra como texto plano
        console.log("Es un texto!")
        obj.mensaje = sanitizeText(obj.mensaje);
      }
      
      return JSON.stringify(obj);
      } catch (e) {
        console.log('Error processing message:', e);
        return JSON.stringify({ mensaje: sanitizeText(msg) }); // Return sanitized message on error
      }
    }
  
  
  
    
    
  
  // fin del modulo
  };
  