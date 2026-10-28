## 1. Saneamiento y detección de inyección

- [x] 1.1 Implementar `escapeHtml` para escapar `& < > " ' /`
- [x] 1.2 Implementar `hasScriptInjection` con patrones de vectores conocidos (`<script>`, `<iframe>`, `<svg>`, `<object>`, `<embed>`, `<style>`, `<meta>`, `<base>`, `<form>`, `on*=`, `javascript:`, `vbscript:`, `data:text/html`, `srcdoc=`, `formaction=`, `expression(`, entidades HTML)
- [x] 1.3 Implementar `sanitizeText`: eliminar caracteres de control, recortar, limitar longitud y neutralizar payloads
- [x] 1.4 Exportar `escapeHtml`, `hasScriptInjection` y `sanitizeText` desde el módulo

## 2. Validación de URLs de medios

- [x] 2.1 Implementar `isSafeUrl` (protocolo http/https y sin payloads)
- [x] 2.2 Anclar regex de `is_valid_url_image` y usar `isSafeUrl`
- [x] 2.3 Anclar regex de `is_valid_video` y usar `isSafeUrl`
- [x] 2.4 Anclar regex de `is_valid_yt_video` y usar `isSafeUrl`
- [x] 2.5 Escapar URL en `getImageTag`/`getVideoTag` y codificar el ID en `getEmbeddedCode`

## 3. Integrar en validateMessage

- [x] 3.1 Rechazar entrada no-json, no-objeto y campos no-string
- [x] 3.2 Sanear `nombre` y `color` con `sanitizeText`
- [x] 3.3 Generar tag solo si la URL es de imagen/video válida y segura; en caso contrario mostrar texto escapado
- [x] 3.4 Insertar reproductor de video (`<video controls>`) para URLs de video válidas

## 4. Renderizado seguro en el cliente

- [x] 4.1 Validar el color como hex `#RRGGBB` en `index.html`
- [x] 4.2 Insertar el nombre con `.text()` y el mensaje como nodo, sin reconstruir HTML por concatenación

## 5. Pruebas BDD

- [x] 5.1 Escribir pruebas Given/When/Then para `escapeHtml`, `hasScriptInjection`, `sanitizeText`, `isSafeUrl`
- [x] 5.2 Escribir pruebas para rechazo de inyección en `nombre`, `color` y `mensaje`
- [x] 5.3 Escribir pruebas para validación de URLs de imagen/video/YouTube y rechazo de no permitidas
- [x] 5.4 Escribir prueba del reproductor de video en el mensaje
- [x] 5.5 Ejecutar `npm test` y confirmar que todas las pruebas pasan
