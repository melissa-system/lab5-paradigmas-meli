## Why

El chat funciona pero su experiencia de usuario es básica: no hay indicador de conexión, los mensajes no muestran hora, se pueden enviar mensajes vacíos, y no hay feedback claro de quién escribe ni de cuándo. Mejorar la UX hace el chat más usable y confiable sin cambiar el comportamiento de validación ya implementado.

## What Changes

- Mostrar un indicador de estado de conexión (conectado / desconectado) que reacciona a los eventos de Socket.IO.
- Añadir una marca de hora a cada mensaje (hora local del navegador).
- Permitir enviar con Enter y mantener el foco en el campo de texto tras enviar.
- Bloquear el envío de mensajes vacíos o solo con espacios.
- Dar feedback visual inmediato: deshabilitar el botón si el campo está vacío y limpiar el input tras enviar.
- Autoscroll suave hacia el mensaje más reciente.
- Recordar el nombre de usuario en el navegador (localStorage) para no reescribirlo en cada sesión.
- Distinguir visualmente los mensajes propios de los de otros usuarios.

## Capabilities

### New Capabilities
- `chat-ux`: Comportamientos de experiencia de usuario del chat (conexión, hora de mensajes, envío, feedback visual, autoscroll, persistencia de nombre y distinción de mensajes propios).

### Modified Capabilities
<!-- Ninguna: la validación de mensajes y seguridad no cambia. -->

## Impact

- `index.html`: estructura, estilos y JavaScript del cliente (indicador de conexión, hora, manejo de envío, foco, autoscroll, localStorage, marcado de mensajes propios).
- `test/`: nuevas pruebas de integración y e2e (DOM) para los comportamientos de UX.
- Sin cambios en `server.js` ni en `libs/unalib.js` (no se altera la validación existente).
- Sin nuevas dependencias de producción.
