## REMOVED Requirements

### Requirement: Persistencia del nombre de usuario

**Reason**: Con la autenticación social (US-01) el nombre ya no lo escribe el usuario: proviene de su identidad autenticada y el servidor lo asigna para evitar suplantaciones. Guardarlo en el navegador deja de tener sentido.

**Migration**: Reemplazado por el requisito "Nombre desde la identidad autenticada" de esta misma capacidad; ver también `social-auth` ("Remitente tomado de la identidad").

## ADDED Requirements

### Requirement: Nombre desde la identidad autenticada

El chat SHALL mostrar como nombre de usuario el de la identidad autenticada, en un campo de solo lectura, y SHALL no guardar el nombre en el almacenamiento local del navegador.

#### Scenario: Nombre desde la identidad
- **WHEN** un usuario autenticado abre el chat
- **THEN** el campo de nombre muestra el nombre de su identidad y no se puede editar

#### Scenario: Sin persistencia local
- **WHEN** el usuario envía un mensaje
- **THEN** el nombre no se escribe en el almacenamiento local del navegador
