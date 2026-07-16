# Módulo: Auth

Maneja autenticación y autorización del sistema.

## Flujo
1. `POST /api/auth/login` — valida usuario/contraseña, devuelve access token (15min) + refresh token (7 días)
2. `POST /api/auth/refresh` — intercambia refresh token por nuevo access token (rotation)
3. `POST /api/auth/logout` — revoca el refresh token
4. `GET /api/auth/me` — retorna el usuario autenticado

## Reglas de negocio
- Contraseñas hasheadas con bcrypt (10 salt rounds)
- Refresh tokens almacenados como hash SHA-256 en base de datos
- Rotation: cada uso del refresh token lo revoca y emite uno nuevo
- El middleware `authenticate` verifica el JWT en cada ruta protegida
- El middleware `requireRoles(...roles)` restringe por rol
