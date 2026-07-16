# Módulo: Operations

Maneja el ciclo de vida completo de las operaciones de entrega y retiro.

## Reglas de negocio
- Solo `administrativo` puede crear operaciones
- Solo `coordinador` puede asignar cadetes
- Editable/cancelable solo en estado `pendiente` o `asignada`
- Una vez en `en_camino` o posterior: bloqueada para edición y cancelación
- Las transiciones de estado siguen una máquina de estados estricta (ver `VALID_TRANSITIONS` en shared-constants)
- El cadete solo puede cambiar el estado de operaciones asignadas a él (verificado en backend)
- Modificación de monto registra auditoría en `amount_corrections`
