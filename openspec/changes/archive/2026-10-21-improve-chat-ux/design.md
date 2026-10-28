## Context

Ver `proposal.md - Why`. El cliente vive en un único `index.html` con jQuery 1.11 y Socket.IO 4.7. El servidor (`server.js`) solo reemite el mensaje validado; la UX descrita es responsabilidad del cliente. Las specs `chat-ux` definen el comportamiento observable; este documento cubre el cómo.

## Goals / Non-Goals

**Goals:**
- Implementar las mejoras de UX en el cliente sin tocar la capa de validación/seguridad.
- Mantener las dependencias actuales (jQuery + Socket.IO) sin agregar librerías.
- Hacer los comportamientos verificables mediante pruebas de integración y e2e con DOM (jsdom).

**Non-Goals:**
- No se persisten mensajes ni historial en el servidor.
- No se agregan notificaciones, adjuntos ni edición/borrado de mensajes.
- No se cambia el protocolo de Socket.IO ni el formato del mensaje.

## Decisions

- **Estado de conexión vía eventos de Socket.IO.** Se usan `connect`, `disconnect` y `connect_error` para actualizar un elemento `#estado`. Alternativa: polling periódico; se descarta por innecesario.
- **Hora generada en el cliente.** El servidor no envía timestamp, así que la hora se calcula al recibir el mensaje (`new Date()`), formateada HH:MM. Alternativa: agregar timestamp en el servidor; se descarta para no modificar `server.js` ni el contrato existente.
- **Validación de vacío en el cliente y en el servidor.** El cliente evita emitir mensajes vacíos (defensa UX); el servidor ya ignora contenido inválido (defensa de seguridad). No se reemplaza una por otra.
- **Feedback del botón con evento `input`.** Se habilita/deshabilita el botón según `$('#m').val().trim()`. Alternativa: solo deshabilitar en submit; se descarta por menos feedback.
- **Persistencia con `localStorage`.** Nombre guardado con una clave fija; se restaura al cargar. Alternativa: cookies; se descarta por simplicidad y capacidad.
- **Distinción de mensajes propios por marcador local.** Al emitir, el cliente recuerda un identificador/eco y marca el `<li>` correspondiente. Como el servidor reemite a todos sin id de emisor, se usa el nombre persistido como criterio práctico. Alternativa: añadir id de socket al contrato; se descarta por no modificar el protocolo.
- **Autoscroll con desplazamiento al fondo** tras cada append.
- **Pruebas con jsdom + Mocha.** Se carga el HTML, se simula el socket con un stub y se verifican los escenarios; además, pruebas de integración levantando el servidor real y e2e con `socket.io-client`.

## Risks / Trade-offs

- [El marcado de "mensaje propio" por nombre puede marcar mensajes ajenos con el mismo nombre] → Aceptado como heurística; documentado en la spec.
- [jsdom no implementa todo el layout] → Las pruebas verifican estado del DOM (clases, texto, atributos), no geometría.
- [Persistencia puede exponer el nombre en equipos compartidos] → Es información no sensible y configurable por el usuario.
- [Pruebas e2e dependen de un puerto libre] → Se usa un puerto efímero en la prueba.
