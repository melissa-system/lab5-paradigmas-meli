## Purpose

Define cómo los usuarios inician y cierran sesión en UNA Chat con una red social mediante Auth0, cómo se protege el acceso al chat y al canal en tiempo real, cómo se muestra la identidad y se asigna el remitente, cómo se manejan la cancelación y los errores, y cómo se configura la autenticación sin exponer secretos, en local y en el despliegue.

## Requirements

### Requirement: Inicio de sesión con proveedor social

El sistema SHALL permitir iniciar sesión mediante Auth0 con al menos un proveedor social y, al completarlo, SHALL regresar al usuario a UNA Chat con una sesión autenticada.

#### Scenario: Inicio de sesión exitoso
- **WHEN** un visitante sin sesión pulsa "Iniciar sesión" y completa la autenticación con el proveedor social
- **THEN** el sistema lo devuelve a UNA Chat con la sesión iniciada y le muestra el chat

#### Scenario: Ruta de inicio de sesión
- **WHEN** un visitante solicita `/login`
- **THEN** el sistema lo redirige a la página de inicio de sesión de Auth0 configurada para la aplicación

### Requirement: Acceso al chat requiere autenticación

El sistema SHALL exigir una sesión autenticada para usar el chat. Sin sesión, SHALL pedir al visitante que inicie sesión y SHALL rechazar la conexión al canal de mensajes en tiempo real.

#### Scenario: Visitante sin sesión abre el chat
- **WHEN** un visitante sin sesión solicita `/`
- **THEN** el sistema muestra una pantalla que le pide iniciar sesión y no muestra el chat

#### Scenario: Conexión en tiempo real sin sesión
- **WHEN** un cliente sin sesión intenta conectarse al canal de mensajes
- **THEN** el sistema rechaza la conexión y no recibe ni emite mensajes

#### Scenario: Usuario autenticado abre el chat
- **WHEN** un usuario con sesión válida solicita `/`
- **THEN** el sistema muestra el chat y permite conectarse al canal de mensajes

### Requirement: Identidad visible y cierre de sesión

El sistema SHALL mostrar la identidad del usuario autenticado y SHALL permitirle cerrar sesión.

#### Scenario: Identidad mostrada
- **WHEN** un usuario autenticado ve el chat
- **THEN** el chat muestra su nombre (y su foto si el proveedor la entrega) y un control "Cerrar sesión"

#### Scenario: Consulta de identidad sin datos sensibles
- **WHEN** el navegador consulta la identidad del usuario autenticado
- **THEN** el sistema responde solo nombre, correo y foto, sin tokens ni secretos

#### Scenario: Cerrar sesión
- **WHEN** el usuario pulsa "Cerrar sesión"
- **THEN** el sistema termina la sesión local y en Auth0 y lo devuelve a la pantalla de inicio de sesión de UNA Chat

### Requirement: Remitente tomado de la identidad

El sistema SHALL asignar como nombre del remitente de cada mensaje el nombre de la identidad autenticada, ignorando el nombre enviado por el cliente.

#### Scenario: Cliente intenta suplantar a otro usuario
- **WHEN** un usuario autenticado como "Ana" envía un mensaje con `nombre` igual a "Admin"
- **THEN** el mensaje se publica con el remitente "Ana"

### Requirement: Cancelación y errores de inicio de sesión

Si el usuario cancela el inicio de sesión o se produce un error, el sistema SHALL mostrar un mensaje claro en español y SHALL permitir reintentarlo, sin mostrar detalles técnicos ni texto sin sanear proveniente de la URL.

#### Scenario: Usuario cancela
- **WHEN** el usuario cancela o rechaza el acceso en la pantalla del proveedor
- **THEN** UNA Chat muestra "Cancelaste el inicio de sesión" y un botón "Reintentar" que vuelve a iniciar el flujo

#### Scenario: Error de autenticación
- **WHEN** el retorno de Auth0 trae un error distinto a la cancelación o la respuesta no es válida
- **THEN** UNA Chat muestra "No se pudo iniciar sesión. Intentá de nuevo." y un botón "Reintentar"

#### Scenario: Código de error desconocido o manipulado
- **WHEN** la pantalla de error recibe un código de error que no reconoce o contiene HTML
- **THEN** muestra el mensaje genérico de error y no renderiza el texto recibido

### Requirement: Configuración por variables de entorno sin secretos expuestos

El sistema SHALL leer la configuración de Auth0 y de la sesión desde variables de entorno, SHALL negarse a iniciar con una explicación si falta alguna obligatoria y SHALL no incluir secretos en el repositorio ni en el código enviado al navegador.

#### Scenario: Variable obligatoria ausente
- **WHEN** el servidor arranca sin alguna de `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` o `BASE_URL`
- **THEN** no inicia y muestra qué variable falta

#### Scenario: Secretos fuera del navegador
- **WHEN** se inspeccionan las páginas y respuestas que recibe el navegador
- **THEN** no contienen el client secret ni el secreto de sesión

#### Scenario: Plantilla de configuración
- **WHEN** alguien clona el repositorio
- **THEN** encuentra `.env.example` con todas las variables requeridas y sin valores reales, y `.env` está excluido de git

### Requirement: Mismo flujo en el despliegue

El sistema SHALL poder desplegarse en Vercel y SHALL permitir completar allí el mismo flujo de inicio y cierre de sesión, usando las URLs de retorno, cierre de sesión y orígenes permitidos configurados para ese dominio.

#### Scenario: Inicio de sesión en Vercel
- **WHEN** un visitante abre la URL de Vercel e inicia sesión con el proveedor social
- **THEN** regresa a UNA Chat en Vercel autenticado y ve su identidad

#### Scenario: Cierre de sesión en Vercel
- **WHEN** el usuario cierra sesión en el despliegue de Vercel
- **THEN** vuelve a la pantalla de inicio de sesión del mismo dominio
