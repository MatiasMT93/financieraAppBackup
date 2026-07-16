# Arquitectura del sistema

## Diagrama de componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTES                               │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │   Web App (PWA)     │    │   App Mobile (Expo)       │   │
│  │   React + Vite      │    │   React Native            │   │
│  │                     │    │                           │   │
│  │  [Coordinador]      │    │  [Cadete]                 │   │
│  │  [Administrativo]   │    │  - Tracking GPS background│   │
│  │  [Dueño]            │    │  - Push notifications     │   │
│  └────────┬────────────┘    └────────────┬──────────────┘   │
│           │  HTTP/REST + WebSocket        │ HTTP/REST        │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
┌───────────┼──────────────────────────────┼──────────────────┐
│           │         API SERVER           │                  │
│  ┌────────▼──────────────────────────────▼────────────────┐ │
│  │              Express + TypeScript                       │ │
│  │                                                        │ │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌───────┐  │ │
│  │  │   auth   │  │operations│  │incidents│  │ owner │  │ │
│  │  └──────────┘  └──────────┘  └─────────┘  └───────┘  │ │
│  │  ┌──────────┐  ┌──────────┐                           │ │
│  │  │locations │  │realtime  │ ← Socket.IO               │ │
│  │  └──────────┘  └──────────┘                           │ │
│  │                                                        │ │
│  │  middleware: authenticate · requireRoles · errorHandler│ │
│  └────────────────────────────┬───────────────────────────┘ │
│                               │                             │
└───────────────────────────────┼─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                    PostgreSQL 16                             │
│                                                             │
│  users  operations  operation_status_history  incidents     │
│  amount_corrections  cadet_locations  refresh_tokens        │
└─────────────────────────────────────────────────────────────┘
```

## Justificación de decisiones técnicas

### ORM: Drizzle ORM

Elegí Drizzle sobre Prisma y node-pg-migrate por:
- **Schema en TypeScript puro**: el schema de la base es código TypeScript, no un DSL separado. El tipado es perfecto.
- **Migraciones explícitas**: `drizzle-kit generate` crea migraciones SQL reales que podés leer, revisar y versionar.
- **Sin capa de abstracción pesada**: las queries son SQL-like y predecibles. No hay "magia" que dificulte el debugging.
- **Rendimiento**: no hay overhead de un cliente generado como en Prisma.

### CSS: Tailwind CSS

Elegí Tailwind sobre CSS Modules por:
- **Consistencia**: las constantes de diseño (colores de rol, border-radius de cards) se configuran en `tailwind.config.js` y se usan desde cualquier componente.
- **Mobile-first responsive**: las clases responsive de Tailwind (`sm:`, `md:`) facilitan el diseño para el coordinador que usa tanto celular como PC.
- **Velocidad de desarrollo**: no hay archivos .module.css separados. Los estilos están co-localizados con el JSX.

### Tiempo real: Socket.IO

- Autenticación de socket con JWT al momento de la conexión handshake.
- Cada usuario se une a salas: `user:{id}` y `role:{rol}`.
- Los eventos de operación se emiten a todos los roles relevantes (coordinador ve todo, cadete ve solo lo suyo).
- El frontend invalida queries de TanStack Query al recibir eventos, evitando estado duplicado.

### GPS Background: expo-location + expo-task-manager

La razón por la que la app del cadete es **nativa y no PWA**:
- iOS no permite GPS en background desde una PWA (ni desde un web worker). La app se suspende cuando el usuario sale del browser.
- Android tiene restricciones similares desde Android 8+.
- Con `expo-task-manager` + `expo-location`, podemos registrar una tarea que el SO ejecuta cada ~20 segundos incluso con la pantalla apagada.

### Autenticación: JWT con refresh tokens

- **Access token** (15 min): enviado en header `Authorization: Bearer`. Vida corta para limitar daño si es interceptado.
- **Refresh token** (7 días): almacenado en base de datos como hash SHA-256. Permite emitir nuevos access tokens sin re-login.
- **Rotation**: cada vez que se usa el refresh token, se revoca y se emite uno nuevo. Si el mismo token se usa dos veces (posible señal de robo), la segunda vez falla.
- **Revocación**: `POST /api/auth/logout` revoca el refresh token. En mobile, se guarda en AsyncStorage (no hay cookies seguras disponibles de la misma manera).

## Cómo agregar un nuevo módulo al backend

1. Crear carpeta `apps/api/src/modules/{nombre}/`
2. Crear los 4 archivos: `schemas.ts`, `repository.ts`, `service.ts`, `routes.ts`
3. Agregar un `README.md` explicando qué dominio cubre
4. Registrar las rutas en `apps/api/src/server.ts`
5. Si el módulo emite eventos de Socket.IO, importar `emitToRole` o `broadcast` desde `realtime/socket.ts`

## Cómo agregar un nuevo rol

1. Agregar el rol al enum `roleEnum` en `apps/api/src/db/schema.ts`
2. Agregar la constante en `packages/shared-constants/src/index.ts` → `ROLES`
3. Agregar el tipo en `packages/shared-types/src/index.ts` → `Role`
4. Crear el feature folder en `apps/web/src/features/{rol}/`
5. Agregar la ruta en `apps/web/src/app/App.tsx` → `RoleRouter`
6. Actualizar el seed en `apps/api/src/db/seed.ts`

## Capas del backend

```
HTTP Request
    ↓
Middleware (authenticate, requireRoles)
    ↓
Routes (validación con Zod)
    ↓
Service (lógica de negocio, reglas)
    ↓
Repository (queries a la base de datos)
    ↓
PostgreSQL
```

**Regla**: el Service **nunca** habla directamente a la base. El Repository **nunca** tiene lógica de negocio. Las Routes **nunca** llaman al Repository directamente.
