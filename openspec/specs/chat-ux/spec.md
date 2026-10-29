## Purpose

Define los comportamientos de experiencia de usuario del chat que hacen la conversación más clara y usable, incluyendo feedback de conexión, hora de los mensajes, control de envío, autoscroll, persistencia del nombre y distinción de mensajes propios, sin alterar las reglas de validación y seguridad ya existentes.

## Requirements

### Requirement: Indicador de estado de conexión

El chat SHALL mostrar el estado de la conexión con el servidor y actualizarlo ante cambios de conectividad.

#### Scenario: Conexión establecida
- **WHEN** el cliente establece conexión con el servidor
- **THEN** el indicador muestra el estado "Conectado"

#### Scenario: Conexión perdida
- **WHEN** el cliente pierde la conexión con el servidor
- **THEN** el indicador muestra el estado "Desconectado"

#### Scenario: Reconexión
- **WHEN** el cliente se reconecta tras una caída
- **THEN** el indicador vuelve a mostrar el estado "Conectado"

### Requirement: Hora en cada mensaje

El chat SHALL mostrar la hora de recepción junto a cada mensaje.

#### Scenario: Mensaje recibido
- **WHEN** el cliente recibe un mensaje del servidor
- **THEN** el mensaje se muestra junto con su hora local en formato HH:MM

### Requirement: Envío de mensajes

El chat SHALL permitir enviar mensajes tanto con el botón como con la tecla Enter, y SHALL bloquear el envío de mensajes vacíos o compuestos solo por espacios.

#### Scenario: Envío con botón
- **WHEN** el usuario escribe un mensaje no vacío y pulsa "Send"
- **THEN** el mensaje se emite al servidor y el campo de texto queda limpio

#### Scenario: Envío con Enter
- **WHEN** el usuario pulsa Enter con un mensaje no vacío
- **THEN** el mensaje se emite al servidor

#### Scenario: Mensaje vacío
- **WHEN** el usuario intenta enviar un mensaje vacío o solo con espacios
- **THEN** el chat no emite ningún mensaje al servidor

#### Scenario: Foco tras enviar
- **WHEN** el usuario envía un mensaje
- **THEN** el campo de texto recibe el foco para seguir escribiendo

### Requirement: Feedback visual del formulario

El chat SHALL reflejar visualmente si hay contenido listo para enviar.

#### Scenario: Campo vacío
- **WHEN** el campo de texto está vacío
- **THEN** el botón de envío se muestra deshabilitado

#### Scenario: Campo con contenido
- **WHEN** el campo de texto tiene contenido
- **THEN** el botón de envío se muestra habilitado

### Requirement: Autoscroll a mensajes recientes

El chat SHALL desplazarse automáticamente al mensaje más reciente cuando llega uno nuevo.

#### Scenario: Llega un mensaje nuevo
- **WHEN** el cliente recibe o envía un mensaje
- **THEN** la vista se desplaza al final de la lista de mensajes

### Requirement: Distinción de mensajes propios

El chat SHALL distinguir visualmente los mensajes enviados por el propio usuario de los ajenos.

#### Scenario: Mensaje propio
- **WHEN** el usuario recibe su propio mensaje de vuelta desde el servidor
- **THEN** el mensaje se marca visualmente como propio

### Requirement: Nombre desde la identidad autenticada

El chat SHALL mostrar como nombre de usuario el de la identidad autenticada, en un campo de solo lectura, y SHALL no guardar el nombre en el almacenamiento local del navegador.

#### Scenario: Nombre desde la identidad
- **WHEN** un usuario autenticado abre el chat
- **THEN** el campo de nombre muestra el nombre de su identidad y no se puede editar

#### Scenario: Sin persistencia local
- **WHEN** el usuario envía un mensaje
- **THEN** el nombre no se escribe en el almacenamiento local del navegador
