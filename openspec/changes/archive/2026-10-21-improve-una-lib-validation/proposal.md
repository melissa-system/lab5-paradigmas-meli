## Why

El chat acepta texto libre y URLs, y `validateMessage` en `una-lib` construía HTML concatenando entrada del usuario sin sanear, permitiendo inyección de scripts (XSS) y URLs maliciosas (`javascript:`, payloads `onerror`). Es necesario reforzar la validación para garantizar integridad de los datos y una experiencia segura.

## What Changes

- Reforzar `validateMessage` en `una-lib` para detectar y neutralizar inyección de scripts (etiquetas `<script>`, `<iframe>`, `<svg>`, `<object>`, `<embed>`, `<style>`, manejadores `on*=`, `javascript:`, `vbscript:`, `data:text/html`, `srcdoc`, `formaction`, entidades HTML).
- Agregar sanitización de campos de texto (recorte, eliminación de caracteres de control, límite de longitud y escape HTML).
- Aceptar únicamente URLs que apunten a imágenes o videos válidos (protocolo http/https, extensión válida y sin payloads).
- Insertar un reproductor de video (`<video controls>`) cuando el mensaje sea una URL de video válida.
- Cubrir todas las reglas con pruebas unitarias en estilo BDD (Given/When/Then).

## Capabilities

### New Capabilities
- `chat-message-validation`: Reglas de saneamiento y validación de mensajes del chat, incluyendo prevención de inyección de scripts, validación de URLs de imagen/video y renderizado seguro de medios.

### Modified Capabilities
<!-- Ninguna: no existen specs previas en openspec/specs/. -->

## Impact

- `libs/unalib.js`: `validateMessage`, helpers de validación/sanitización (`escapeHtml`, `hasScriptInjection`, `isSafeUrl`, `sanitizeText`), detección de imagen/video y generación de tags.
- `index.html`: renderizado seguro del mensaje/nombre/color en el cliente.
- `test/test.js`: nuevas pruebas unitarias BDD.
- Sin nuevas dependencias; se mantiene Node.js + Mocha.
