## Context

Ver `proposal.md - Why`. El chat existente (Node.js + Express + Socket.IO) centraliza la transformación del mensaje en `libs/unalib.js`. El servidor recibe un JSON string, lo pasa por `validateMessage` y reemite el resultado a todos los clientes; el cliente lo renderiza en `index.html`. Las specs de `chat-message-validation` describen el comportamiento esperado; este documento cubre el cómo.

## Goals / Non-Goals

**Goals:**
- Neutralizar la inyección de scripts en el punto de validación central (`validateMessage`).
- Permitir solo URLs de imagen/video válidas y seguras.
- Mantener el diseño de módulo único sin dependencias externas nuevas.

**Non-Goals:**
- No se reemplaza Socket.IO ni Express.
- No se agrega autenticación, rate limiting ni sanitización basada en DOM en el servidor.
- No se soportan proveedores de video distintos de archivos directos y YouTube.

## Decisions

- **Sanitización en el servidor (defensa principal).** `validateMessage` es el único punto por el que pasa todo mensaje antes de reemitirse, por lo que concentrar la validación ahí cubre todos los clientes. Alternativa considerada: sanear solo en el cliente; se descarta porque un cliente no confiable puede saltársela.
- **Enfoque de lista blanca para URLs.** Las URLs de medio solo se aceptan si cumplen protocolo http/https + extensión válida (regex anclada) + ausencia de payloads. Alternativa considerada: lista negra de extensiones peligrosas; se descarta por ser evadible.
- **Escape HTML como estrategia base para texto.** Todo campo de texto libre se escapa (`& < > " ' /`) y además se detectan patrones de inyección conocidos para neutralizarlos. Alternativa: eliminar etiquetas con expresiones regulares complejas; se descarta por fragilidad ante ofuscación.
- **Tags de medio construidos solo con datos validados/escapados.** `getImageTag`/`getVideoTag`/`getEmbeddedCode` escapan la URL o codifican el ID de YouTube.
- **Defensa en profundidad en el cliente.** `index.html` valida el color como hex `#RRGGBB`, inserta el nombre con `.text()` y agrega el mensaje como nodo, evitando reconstruir HTML por concatenación.
- **Verificación con pruebas BDD (Mocha).** Cada escenario de la spec se mapea a un `describe`/`it` con estructura Given/When/Then.

## Risks / Trade-offs

- [Falsos positivos al detectar patrones como `on*=`] → Los campos de texto libre se escapan igualmente, por lo que el peor caso es mostrar texto escapado, nunca ejecución.
- [Regex de detección no cubre ofuscaciones futuras] → Se complementa con escape HTML de base, que neutraliza cualquier etiqueta no prevista.
- [Bloquear URLs legítimas con query strings] → Las regex permiten `?query` acotado y sin caracteres peligrosos.
- [Sanitizar rompe formatos enriquecidos] → Aceptado: la spec prioriza seguridad sobre formato.
