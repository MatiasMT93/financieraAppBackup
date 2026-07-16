# Flujo de Autenticación

## Login

```
Cliente                          API
  │                               │
  │  POST /api/auth/login          │
  │  { nombre, password }         │
  │ ──────────────────────────── ►│
  │                               │  1. Buscar usuario por nombre
  │                               │  2. bcrypt.compare(password, hash)
  │                               │  3. Generar JWT access token (15min)
  │                               │  4. Generar refresh token aleatorio (64 bytes hex)
  │                               │  5. Guardar SHA-256(refreshToken) en DB
  │  { accessToken, refreshToken, user }
  │ ◄────────────────────────────  │
  │                               │
  │  Guarda en:                   │
  │  - Web: localStorage (zustand persist)
  │  - Mobile: AsyncStorage
```

## Request autenticado

```
Cliente                          API
  │                               │
  │  GET /api/operations           │
  │  Authorization: Bearer <jwt>  │
  │ ──────────────────────────── ►│
  │                               │  middleware authenticate():
  │                               │  1. Extraer token del header
  │                               │  2. jwt.verify(token, JWT_SECRET)
  │                               │  3. Adjuntar req.user = { id, nombre, role }
  │                               │
  │                               │  middleware requireRoles('coordinador'):
  │                               │  4. Verificar que req.user.role esté en la lista
  │                               │
  │  { ok: true, data: [...] }    │
  │ ◄────────────────────────────  │
```

## Refresh token

```
Cliente                          API
  │                               │
  │  (access token expirado)      │
  │                               │
  │  POST /api/auth/refresh        │
  │  { refreshToken }             │
  │ ──────────────────────────── ►│
  │                               │  1. SHA-256(refreshToken)
  │                               │  2. Buscar en DB donde token_hash = hash
  │                               │     AND expires_at > NOW()
  │                               │     AND revoked_at IS NULL
  │                               │  3. Si no existe → 401
  │                               │  4. Revocar el token actual (set revoked_at = NOW())
  │                               │  5. Generar nuevo access token
  │                               │  6. Generar nuevo refresh token
  │                               │  7. Guardar nuevo hash en DB
  │  { accessToken, refreshToken }│
  │ ◄────────────────────────────  │
  │                               │
  │  Actualiza tokens guardados   │
```

## Logout

```
Cliente                          API
  │                               │
  │  POST /api/auth/logout         │
  │  { refreshToken }             │
  │ ──────────────────────────── ►│
  │                               │  1. SHA-256(refreshToken)
  │                               │  2. Buscar y revocar en DB
  │  { ok: true }                 │
  │ ◄────────────────────────────  │
  │                               │
  │  Borra tokens del storage     │
  │  Redirige a /login            │
```

## Middleware: authenticate

```typescript
// apps/api/src/middleware/auth.ts
export function authenticate(req, res, next) {
  const token = req.headers.authorization?.slice(7); // quitar "Bearer "
  if (!token) return res.status(401).json({ ok: false, error: 'Token requerido' });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET); // lanza si expirado/inválido
    req.user = payload; // { id, nombre, role }
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
}
```

## Middleware: requireRoles

```typescript
export function requireRoles(...roles: Role[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Sin permisos para esta acción' });
    }
    next();
  };
}
```

## Protección de rutas por rol

| Endpoint | Roles permitidos |
|----------|-----------------|
| `POST /api/operations` | administrativo |
| `PATCH /api/operations/:id` | administrativo |
| `POST /api/operations/:id/cancel` | administrativo |
| `POST /api/operations/:id/assign` | coordinador |
| `POST /api/operations/:id/transition` | cadete, coordinador |
| `POST /api/operations/:id/modify-amount` | cadete |
| `POST /api/incidents` | cadete |
| `POST /api/incidents/:id/resolve` | coordinador |
| `POST /api/locations` | cadete |
| `GET /api/locations/current` | coordinador, administrativo |
| `GET /api/owner/summary` | dueno, coordinador |
| `GET /api/owner/cash-in-street` | dueno, coordinador |

## Ejemplo de request/response

### Login exitoso

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "nombre": "Coordinador Central",
  "password": "CambioApp2024!"
}
```

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "a3f8b2c1...",
    "user": {
      "id": "uuid-aquí",
      "nombre": "Coordinador Central",
      "role": "coordinador"
    }
  }
}
```

### Error de credenciales

**Response 400/401:**
```json
{
  "ok": false,
  "error": "Credenciales inválidas"
}
```

### Sin permisos

**Response 403:**
```json
{
  "ok": false,
  "error": "Sin permisos para esta acción"
}
```

## Seguridad

- Las contraseñas **nunca** aparecen en logs (campo `body.password` redactado por Pino)
- Las contraseñas **nunca** se devuelven en ninguna respuesta de API
- Los refresh tokens se guardan como hash SHA-256, nunca en texto plano
- Los JWTs contienen solo `{ id, nombre, role }` — mínimo necesario
- `JWT_SECRET` y `JWT_REFRESH_SECRET` deben ser strings aleatorios de al menos 64 bytes en producción. Generar con: `openssl rand -hex 64`
