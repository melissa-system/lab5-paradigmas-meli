## 1. Estructura y estilos del cliente

- [x] 1.1 Agregar elemento de estado de conexión (`#estado`) con estilos conectado/desconectado
- [x] 1.2 Agregar estilos para la hora del mensaje y para el mensaje propio (`.propio`)

## 2. Comportamiento de conexión

- [x] 2.1 Actualizar `#estado` en los eventos `connect`, `disconnect` y `connect_error`

## 3. Comportamiento de envío

- [x] 3.1 Bloquear el envío de mensajes vacíos o solo con espacios
- [x] 3.2 Mantener el foco en el campo de texto tras enviar
- [x] 3.3 Guardar el nombre en localStorage y restaurarlo al cargar
- [x] 3.4 Habilitar/deshabilitar el botón según el contenido del campo

## 4. Renderizado de mensajes

- [x] 4.1 Mostrar la hora local (HH:MM) junto a cada mensaje
- [x] 4.2 Marcar visualmente los mensajes propios (`.propio`)
- [x] 4.3 Autoscroll al final tras cada mensaje

## 5. Pruebas unitarias, integración y e2e

- [x] 5.1 Agregar jsdom y socket.io-client como dependencias de desarrollo
- [x] 5.2 Pruebas de integración: estado de conexión y envío (con socket stub)
- [x] 5.3 Pruebas de e2e: levantar server.js y verificar emisión/recepción real
- [x] 5.4 Ejecutar toda la suite (`npm test`) y confirmar que no se rompe nada
