# API Reference

Base URL: `http://localhost:4000/api`

Todas las respuestas exitosas tienen la forma `{ ok: true, data: <payload> }`.
Todos los errores tienen la forma `{ ok: false, error: "<mensaje>" }`.

---

## Auth

### POST /auth/login

Autentica un usuario.

**Roles**: Público (sin auth)

**Body:**
```json
{ "nombre": "string", "password": "string" }
```

**Respuesta 200:**
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "a3f8b2...",
    "user": { "id": "uuid", "nombre": "string", "role": "coordinador" }
  }
}
```

**Errores:** 400 (datos inválidos), 401 (credenciales incorrectas)

---

### POST /auth/refresh

Intercambia un refresh token por un nuevo access token (con rotation).

**Roles**: Público

**Body:** `{ "refreshToken": "string" }`

**Respuesta 200:** `{ "ok": true, "data": { "accessToken": "...", "refreshToken": "..." } }`

**Errores:** 401 (token inválido o expirado)

---

### POST /auth/logout

Revoca el refresh token.

**Roles**: Público

**Body:** `{ "refreshToken": "string" }`

**Respuesta 200:** `{ "ok": true, "data": null }`

---

### GET /auth/me

Retorna el usuario autenticado.

**Roles**: Cualquiera autenticado

**Respuesta 200:** `{ "ok": true, "data": { "id": "uuid", "nombre": "string", "role": "string" } }`

---

## Operations

### GET /operations

Lista operaciones con filtros opcionales.

**Roles**: Todos los autenticados

**Query params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `status` | string | Filtrar por estado |
| `cadeteId` | uuid | Filtrar por cadete |
| `date` | YYYY-MM-DD | Filtrar por fecha de creación |

**Respuesta 200:** `{ "ok": true, "data": Operation[] }`

---

### POST /operations

Crea una nueva operación en estado `pendiente`.

**Roles**: `administrativo`

**Body:**
```json
{
  "tipo": "entrega | retiro",
  "moneda": "ARS | USD | EUR | BRL",
  "monto": 450000,
  "direccion": "Av. Corrientes 1234, CABA",
  "contacto": "Juan García",
  "telefono": "+54 11 4444-5555",  // opcional
  "notas": "Piso 3, Of. 301"        // opcional
}
```

**Respuesta 201:** `{ "ok": true, "data": Operation }`

**Errores:** 400 (datos inválidos), 403 (no es administrativo)

---

### PATCH /operations/:id

Edita una operación. Solo permitido si el estado es `pendiente` o `asignada`.

**Roles**: `administrativo`

**Body:** Igual que POST pero todos los campos son opcionales.

**Errores:** 400 (datos inválidos o estado no permite edición), 404 (no encontrada)

---

### POST /operations/:id/cancel

Cancela una operación. Solo si estado es `pendiente` o `asignada`.

**Roles**: `administrativo`

**Respuesta 200:** `{ "ok": true, "data": Operation }`

**Errores:** 400 (estado no permite cancelación)

---

### POST /operations/:id/assign

Asigna un cadete a una operación `pendiente`. El estado pasa a `asignada`.

**Roles**: `coordinador`

**Body:** `{ "cadeteId": "uuid" }`

**Errores:** 400 (operación no está en estado `pendiente`), 403

---

### POST /operations/:id/transition

Cambia el estado de una operación. Valida que la transición sea legal.

**Roles**: `cadete`, `coordinador`

**Body:** `{ "newStatus": "en_camino | en_destino | volviendo | cerrada | incidencia" }`

**Reglas:**
- El cadete solo puede transicionar operaciones asignadas a él.
- Las transiciones deben seguir la máquina de estados definida en `shared-constants`.

**Errores:** 400 (transición inválida), 403

---

### POST /operations/:id/modify-amount

Modifica el monto de una operación activa. Registra la corrección en `amount_corrections`.

**Roles**: `cadete`

**Body:** `{ "monto": 500000 }`

**Errores:** 400 (operación cerrada/cancelada), 403 (no es la operación del cadete)

---

## Incidents

### GET /incidents

Lista incidencias activas y resueltas.

**Roles**: `coordinador`, `administrativo`, `dueno`

**Respuesta 200:**
```json
{
  "ok": true,
  "data": {
    "active": Incident[],
    "resolved": Incident[]
  }
}
```

---

### POST /incidents

Reporta una incidencia. El estado de la operación pasa a `incidencia`.

**Roles**: `cadete`

**Body:** `{ "operationId": "uuid", "descripcion": "string (mín. 10 chars)" }`

**Errores:** 403 (no es la operación del cadete)

---

### POST /incidents/:id/resolve

Marca una incidencia como resuelta.

**Roles**: `coordinador`

**Respuesta 200:** `{ "ok": true, "data": Incident }`

---

## Locations

### POST /locations

El cadete envía su ubicación actual.

**Roles**: `cadete`

**Body:** `{ "latitude": number, "longitude": number, "accuracy": number }`

**Respuesta 200:** `{ "ok": true, "data": null }`

---

### GET /locations/current

Última ubicación conocida de cada cadete activo.

**Roles**: `coordinador`, `administrativo`

**Respuesta 200:** `{ "ok": true, "data": CadetLocation[] }`

---

## Owner

### GET /owner/summary?period=today|week|month

Resumen del negocio por período.

**Roles**: `dueno`, `coordinador`

**Query:** `period=today` (default), `period=week`, `period=month`

**Respuesta 200:**
```json
{
  "ok": true,
  "data": {
    "period": "today",
    "totalOperations": 26,
    "byCurrency": [
      {
        "currency": "USD",
        "totalMoved": 30500,
        "comprado": 18500,
        "vendido": 12000,
        "opComprado": 12,
        "opVendido": 8,
        "totalOps": 20
      }
    ]
  }
}
```

---

### GET /owner/cash-in-street

Dinero actualmente en calle (en operaciones activas), por moneda.

**Roles**: `dueno`, `coordinador`

**Respuesta 200:**
```json
{
  "ok": true,
  "data": [
    { "currency": "ARS", "total": 1200000, "operationCount": 3 },
    { "currency": "USD", "total": 8500, "operationCount": 2 }
  ]
}
```

---

## Tipos de datos

### Operation
```typescript
{
  id: string;          // UUID
  tipo: 'entrega' | 'retiro';
  moneda: 'ARS' | 'USD' | 'EUR' | 'BRL';
  monto: number;
  direccion: string;
  contacto: string;
  telefono: string | null;
  notas: string | null;
  status: OperationStatus;
  administrativoId: string;
  cadeteId: string | null;
  coordinadorId: string | null;
  createdAt: string;   // ISO 8601
  updatedAt: string;
  administrativo: { id: string; nombre: string };
  cadete: { id: string; nombre: string } | null;
}
```

### OperationStatus
`'pendiente' | 'asignada' | 'en_camino' | 'en_destino' | 'volviendo' | 'cerrada' | 'cancelada' | 'incidencia'`

### Incident
```typescript
{
  id: string;
  operationId: string;
  cadeteId: string;
  descripcion: string;
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  cadete: { id: string; nombre: string };
  operation: { id: string; direccion: string; monto: number; moneda: string };
}
```
