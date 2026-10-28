var val = require('../libs/unalib');
var assert = require('assert');

// ---------------------------------------------------------------------------
// Estilo BDD (Given / When / Then)
// Cada prueba declara explicitamente el contexto (Given), la accion (When)
// y el resultado esperado (Then) para mapearse 1:1 con las especificaciones
// de la capacidad "chat-message-validation".
// ---------------------------------------------------------------------------

// Helpers de contexto / accion para mantener las pruebas legibles
function dadoUnMensaje(campos) {
  return JSON.stringify(campos);
}

function cuandoSeValidaElMensaje(campos) {
  return JSON.parse(val.validateMessage(dadoUnMensaje(campos)));
}


describe('chat-message-validation', function(){


  describe('Capacidad: validacion de telefono (contexto heredado)', function(){

    describe('Given un numero de telefono valido', function(){
      it('Then is_valid_phone devuelve true para 8297-8547', function(){
        var telefono = '8297-8547';
        assert.equal(val.is_valid_phone(telefono), true);
      });
    });

    describe('Given un numero de telefono invalido', function(){
      it('Then is_valid_phone devuelve false para 8297p-8547', function(){
        var telefono = '8297p-8547';
        assert.equal(val.is_valid_phone(telefono), false);
      });
    });

  });


  describe('Requerimiento: Prevencion de inyeccion de scripts', function(){

    describe('Given un mensaje de texto que contiene <script>alert(1)</script>', function(){
      it('Then el script queda escapado y no se ejecuta', function(){
        var salida = cuandoSeValidaElMensaje({ nombre: 'meli', mensaje: '<script>alert(1)</script>', color: '#ffffff' });
        assert.equal(salida.mensaje.indexOf('<script>'), -1);
        assert.equal(salida.mensaje.indexOf('&lt;script&gt;'), 0);
      });
    });

    describe('Given un mensaje con el manejador inline <img src=x onerror=alert(1)>', function(){
      it('Then hasScriptInjection lo detecta y el mensaje se muestra como texto', function(){
        var payload = 'hola <img src=x onerror=alert(1)>';
        assert.equal(val.hasScriptInjection(payload), true);
        var salida = cuandoSeValidaElMensaje({ nombre: 'meli', mensaje: payload, color: '#ffffff' });
        assert.equal(salida.mensaje.indexOf('<img'), -1);
      });
    });

    describe('Given un mensaje con el pseudo-protocolo javascript:alert(1)', function(){
      it('Then hasScriptInjection lo detecta', function(){
        assert.equal(val.hasScriptInjection('javascript:alert(1)'), true);
      });
    });

    describe('Given un iframe inyectado', function(){
      it('Then hasScriptInjection lo detecta y no se renderiza', function(){
        var payload = '<iframe src="http://evil.com"></iframe>';
        assert.equal(val.hasScriptInjection(payload), true);
        var salida = cuandoSeValidaElMensaje({ nombre: 'meli', mensaje: payload, color: '#ffffff' });
        assert.equal(salida.mensaje.indexOf('<iframe'), -1);
      });
    });

    describe('Given un nombre de usuario con <script>alert(1)</script>', function(){
      it('Then el nombre se escapa y se muestra como texto', function(){
        var salida = cuandoSeValidaElMensaje({ nombre: '<script>alert(1)</script>', mensaje: 'hola', color: '#ffffff' });
        assert.equal(salida.nombre.indexOf('<script>'), -1);
        assert.equal(salida.nombre.indexOf('&lt;script&gt;'), 0);
      });
    });

    describe('Given un color con inyeccion', function(){
      it('Then el color queda escapado sin etiquetas ejecutables', function(){
        var salida = cuandoSeValidaElMensaje({ nombre: 'meli', mensaje: 'hola', color: '"><script>alert(1)</script>' });
        assert.equal(salida.color.indexOf('<script>'), -1);
      });
    });

    describe('Given un payload que no es una cadena', function(){
      it('Then validateMessage devuelve un mensaje vacio', function(){
        assert.equal(val.validateMessage(undefined), JSON.stringify({ mensaje: '' }));
        assert.equal(val.validateMessage(12345), JSON.stringify({ mensaje: '' }));
      });
    });

    describe('Given un JSON con estructura invalida (un arreglo)', function(){
      it('Then validateMessage devuelve un mensaje vacio', function(){
        assert.equal(val.validateMessage('[1,2,3]'), JSON.stringify({ mensaje: '' }));
      });
    });

    describe('Given una lista de vectores de inyeccion adicionales', function(){
      var vectores = [
        '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
        '<svg onload=alert(1)>',
        '<object data="evil.swf"></object>',
        '<embed src="evil.swf">',
        '<style>body{background:url(javascript:alert(1))}</style>',
        '<form action="evil.com"><input formaction="javascript:alert(1)"></form>',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
        '<img src=x onerror=alert(1)>'
      ];

      it('Then todos se detectan y se neutralizan como texto', function(){
        for (var i = 0; i < vectores.length; i++) {
          assert.equal(val.hasScriptInjection(vectores[i]), true, 'no detecto: ' + vectores[i]);
          var salida = cuandoSeValidaElMensaje({ nombre: 'meli', mensaje: vectores[i], color: '#ffffff' });
          assert.equal(salida.mensaje.indexOf('<iframe'), -1);
          assert.equal(salida.mensaje.indexOf('<svg'), -1);
          assert.equal(salida.mensaje.indexOf('<object'), -1);
          assert.equal(salida.mensaje.indexOf('<embed'), -1);
          assert.equal(salida.mensaje.indexOf('<style'), -1);
        }
      });
    });

  });


  describe('Requerimiento: Validacion de integridad de los datos', function(){

    describe('Given un texto con caracteres de control', function(){
      it('Then sanitizeText los elimina', function(){
        var salida = val.sanitizeText('hola\u0000\u0007mundo');
        assert.equal(salida.indexOf('\u0000'), -1);
        assert.equal(salida.indexOf('\u0007'), -1);
      });
    });

    describe('Given un texto con espacios al inicio y al final', function(){
      it('Then sanitizeText lo recorta', function(){
        assert.equal(val.sanitizeText('   hola   '), 'hola');
      });
    });

    describe('Given un texto que supera la longitud maxima permitida', function(){
      it('Then sanitizeText lo trunca a 1000 caracteres', function(){
        var largo = new Array(5000).join('a');
        assert.equal(val.sanitizeText(largo).length, 1000);
      });
    });

    describe('Given un valor que no es cadena en nombre y color', function(){
      it('Then el sistema los descarta y los reemplaza por cadena vacia', function(){
        var salida = cuandoSeValidaElMensaje({ nombre: 42, mensaje: 'hola', color: true });
        assert.equal(salida.nombre, '');
        assert.equal(salida.color, '');
      });
    });

    describe('Given un valor no string para sanitizeText', function(){
      it('Then devuelve cadena vacia', function(){
        assert.equal(val.sanitizeText(123), '');
        assert.equal(val.sanitizeText(null), '');
      });
    });

  });


  describe('Requerimiento: Aceptar unicamente URLs de imagen o video validas', function(){

    describe('Given la URL de imagen http://site.com/foto.png', function(){
      it('Then is_valid_url_image devuelve true y se inserta una etiqueta <img>', function(){
        assert.equal(val.is_valid_url_image('http://site.com/foto.png'), true);
        var salida = cuandoSeValidaElMensaje({ nombre: 'meli', mensaje: 'http://site.com/foto.png', color: '#ffffff' });
        assert.equal(salida.mensaje.indexOf('<img'), 0);
      });
    });

    describe('Given la URL de imagen http://image.com/image.gif', function(){
      it('Then is_valid_url_image devuelve true', function(){
        assert.equal(val.is_valid_url_image('http://image.com/image.gif'), true);
      });
    });

    describe('Given la URL de video http://site.com/clip.mp4', function(){
      it('Then is_valid_video devuelve true', function(){
        assert.equal(val.is_valid_video('http://site.com/clip.mp4'), true);
      });
    });

    describe('Given la URL de video http://site.com/clip.webm', function(){
      it('Then is_valid_video devuelve true', function(){
        assert.equal(val.is_valid_video('http://site.com/clip.webm'), true);
      });
    });

    describe('Given la URL de YouTube https://www.youtube.com/watch?v=qYwlqx-JLok', function(){
      it('Then is_valid_yt_video devuelve true', function(){
        assert.equal(val.is_valid_yt_video('https://www.youtube.com/watch?v=qYwlqx-JLok'), true);
      });
    });

    describe('Given una URL con extension no permitida (http://site.com/a.exe)', function(){
      it('Then no se genera etiqueta de medio y se muestra como texto escapado', function(){
        var salida = cuandoSeValidaElMensaje({ nombre: 'meli', mensaje: 'http://site.com/a.exe', color: '#ffffff' });
        assert.equal(salida.mensaje.indexOf('<img'), -1);
        assert.equal(salida.mensaje.indexOf('<video'), -1);
      });
    });

    describe('Given una URL sin protocolo seguro (javascript:alert(1))', function(){
      it('Then isSafeUrl devuelve false', function(){
        assert.equal(val.isSafeUrl('javascript:alert(1)'), false);
      });
    });

    describe('Given una URL que aparenta ser imagen pero incluye un payload', function(){
      it('Then is_valid_url_image devuelve false y no se genera <img>', function(){
        var url = 'http://image.com/x.jpg"><script>alert(1)</script>';
        assert.equal(val.is_valid_url_image(url), false);
        var salida = cuandoSeValidaElMensaje({ nombre: 'meli', mensaje: url, color: '#ffffff' });
        assert.equal(salida.mensaje.indexOf('<img'), -1);
      });
    });

    describe('Given la URL javascript:alert(1)//.jpg', function(){
      it('Then is_valid_url_image devuelve false', function(){
        assert.equal(val.is_valid_url_image('javascript:alert(1)//.jpg'), false);
      });
    });

  });


  describe('Requerimiento: Reproductor de video en el chat', function(){

    describe('Given una URL de video valida http://site.com/clip.mp4', function(){
      it('Then el chat inserta un reproductor <video controls>', function(){
        var salida = cuandoSeValidaElMensaje({ nombre: 'meli', mensaje: 'http://site.com/clip.mp4', color: '#ffffff' });
        assert.equal(salida.mensaje.indexOf('<video'), 0);
        assert.notEqual(salida.mensaje.indexOf('controls'), -1);
      });
    });

    describe('Given una URL de video de YouTube valida', function(){
      it('Then el chat inserta un reproductor embebido', function(){
        var salida = cuandoSeValidaElMensaje({ nombre: 'meli', mensaje: 'https://www.youtube.com/watch?v=qYwlqx-JLok', color: '#ffffff' });
        assert.equal(salida.mensaje.indexOf('<iframe'), 0);
      });
    });

  });


  describe('Requerimiento: Saneamiento auxiliar (escapeHtml / isSafeUrl)', function(){

    describe('Given el texto <script>alert(1)</script>', function(){
      it('Then escapeHtml lo transforma en entidades seguras', function(){
        assert.equal(val.escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
      });
    });

    describe('Given comillas que intentan romper un atributo', function(){
      it('Then escapeHtml las convierte en entidades', function(){
        assert.equal(val.escapeHtml('" onerror="alert(1)'), '&quot; onerror=&quot;alert(1)');
      });
    });

    describe('Given una URL http normal', function(){
      it('Then isSafeUrl devuelve true', function(){
        assert.equal(val.isSafeUrl('http://image.com/image.jpg'), true);
      });
    });

    describe('Given una URL con payload de script', function(){
      it('Then isSafeUrl devuelve false', function(){
        assert.equal(val.isSafeUrl('http://image.com/x.jpg"><script>alert(1)</script>'), false);
      });
    });

  });

});
