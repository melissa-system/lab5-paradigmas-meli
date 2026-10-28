# chat-message-validation

## Purpose

Define las reglas de saneamiento y validación de los mensajes del chat, garantizando que ninguna entrada del usuario pueda inyectar código ejecutable y que solo se rendericen medios provenientes de URLs válidas de imagen o video.

## Requirements

### Requirement: Prevención de inyección de scripts

El sistema SHALL detectar y neutralizar cualquier intento de inyección de scripts en los campos del mensaje (`nombre`, `color`, `mensaje`) antes de emitirlo a los clientes.

#### Scenario: Etiqueta script en el mensaje
- **WHEN** un mensaje contiene `<script>alert(1)</script>`
- **THEN** el texto se muestra escapado (`&lt;script&gt;...`) y no se ejecuta ningún script

#### Scenario: Manejador de evento inline
- **WHEN** un mensaje contiene `<img src=x onerror=alert(1)>`
- **THEN** el sistema lo detecta como inyección y lo muestra como texto plano escapado

#### Scenario: Pseudo-protocolo javascript
- **WHEN** un mensaje contiene `javascript:alert(1)`
- **THEN** el sistema lo detecta como inyección y no lo renderiza como enlace ni medio

#### Scenario: Inyección en el nombre
- **WHEN** el campo `nombre` contiene `<script>alert(1)</script>`
- **THEN** el nombre se escapa y se muestra como texto, sin ejecutar código

#### Scenario: Estructura de mensaje inválida
- **WHEN** el payload recibido no es un objeto JSON válido o no es una cadena
- **THEN** el sistema devuelve un mensaje vacío en lugar de propagar contenido no validado

### Requirement: Validación de integridad de los datos

El sistema SHALL sanear los campos de texto eliminando caracteres de control, recortando espacios y limitando la longitud, y SHALL ignorar cualquier campo que no sea una cadena de texto.

#### Scenario: Caracteres de control
- **WHEN** un campo contiene caracteres de control (p. ej. `\u0000`)
- **THEN** esos caracteres se eliminan antes de emitir el mensaje

#### Scenario: Longitud excesiva
- **WHEN** un campo de texto supera la longitud máxima permitida
- **THEN** el contenido se trunca al límite establecido

#### Scenario: Campo con tipo incorrecto
- **WHEN** `nombre` o `color` llegan como número o booleano
- **THEN** el sistema los descarta y los reemplaza por cadena vacía

### Requirement: Aceptar únicamente URLs de imagen o video válidas

El sistema SHALL renderizar como medio únicamente URLs con protocolo http/https que terminen en una extensión de imagen o video válida y que no contengan payloads de inyección.

#### Scenario: URL de imagen válida
- **WHEN** el mensaje es `http://site.com/foto.png`
- **THEN** el sistema inserta una etiqueta `<img>` con la imagen

#### Scenario: URL de video válida
- **WHEN** el mensaje es `http://site.com/clip.mp4`
- **THEN** el sistema inserta un reproductor de video `<video controls>` en el chat

#### Scenario: URL de video de YouTube válida
- **WHEN** el mensaje es una URL válida de YouTube
- **THEN** el sistema inserta un reproductor embebido de YouTube

#### Scenario: URL no permitida
- **WHEN** el mensaje es una URL con extensión no soportada o sin protocolo http/https (p. ej. `http://site.com/a.exe` o `javascript:...`)
- **THEN** el sistema no genera ninguna etiqueta de medio y muestra el contenido como texto escapado

#### Scenario: URL con payload disfrazado
- **WHEN** la URL aparenta ser una imagen pero incluye un payload (p. ej. `http://site.com/x.jpg" onerror="alert(1)`)
- **THEN** el sistema rechaza el medio y muestra la entrada como texto seguro

### Requirement: Reproductor de video en el chat

El sistema SHALL mostrar los videos en el chat mediante un elemento reproductor con controles, en lugar de un enlace o texto plano.

#### Scenario: Reproducción de video
- **WHEN** el usuario envía una URL de video válida
- **THEN** el chat muestra un elemento de video con controles de reproducción
