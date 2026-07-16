# CambioApp — Sistema Logístico para Financieras de Cambio

Sistema de coordinación logística para una financiera de cambio de divisas en Buenos Aires. Reemplaza la coordinación por WhatsApp con un sistema trazable, con tracking en tiempo real y resumen para el dueño.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL 16 |
| Tiempo real | Socket.IO |
| Auth | JWT + refresh tokens + bcrypt |
| Frontend web | React 18 + TypeScript + Vite + Tailwind |
| PWA | vite-plugin-pwa (manifest + service worker) |
| Mapas | Leaflet + OpenStreetMap |
| App mobile | Android nativo — Kotlin + Jetpack Compose |
| Build mobile | Android Studio |
| GPS background | FusedLocationProviderClient (Foreground Service) |
| ORM / Migraciones | Drizzle ORM + drizzle-kit |
| Validación | Zod |
| Logging | Pino |

## Roles del sistema

| Rol | Plataforma | Función |
|-----|-----------|---------|
| Corredor | No usa el sistema | Cierra ops por WhatsApp y las pasa al administrativo |
| Administrativo | Web | Carga operaciones al sistema |
| Coordinador | Web | Asigna cadetes, monitorea en tiempo real |
| Cadete | App mobile | Ejecuta operaciones en la calle |
| Dueño | Web (solo lectura) | Ve resumen de operaciones y volumen |

## Requisitos

- Node.js 22+
- Docker + Docker Compose
- (Para app mobile) Android Studio + JDK 11+

## Levantar el proyecto en 5 minutos

### 1. Clonar y configurar variables de entorno

```bash
git clone <repo-url> cambioapp
cd cambioapp
cp .env.example .env
```

Las variables por defecto funcionan para desarrollo local. **No cambiar nada si es la primera vez.**

### 2. Instalar dependencias

```bash
npm install
```

### 3. Levantar con Docker Compose

```bash
docker compose up -d
```

Esto levanta:
- PostgreSQL en el puerto 5432
- API en http://localhost:4000
- Web en http://localhost:5173

### 4. Correr seed (las migraciones son automáticas)

El API corre las migraciones pendientes **automáticamente al arrancar**, así que
no hace falta correrlas a mano. Si querés forzarlas igual:

```bash
# (Opcional) Correr migraciones manualmente
npm run db:migrate --workspace=apps/api

# Cargar datos de prueba (6 usuarios)
npm run db:seed --workspace=apps/api
```

### 5. Acceder al sistema

- **Web**: http://localhost:5173
- **API Health**: http://localhost:4000/health

#### Usuarios de prueba (todos con contraseña `CambioApp2024!`)

| Usuario (login) | Nombre | Rol |
|-----------------|--------|-----|
| admin | Admin Principal | administrativo |
| admin2 | Admin Secundario | administrativo |
| coordinador | Coordinador Central | coordinador |
| carlos | Carlos Cadete | cadete |
| martin | Martín Cadete | cadete |
| dueno | Dueño | dueno |

## Levantar cada parte por separado (sin Docker)

### API

```bash
cd apps/api
cp ../../.env.example .env   # o configurar DATABASE_URL manualmente
npm install
npm run db:migrate
npm run dev
```

### Web

```bash
cd apps/web
npm install
npm run dev
```

### App mobile (cadete)

Abrí la carpeta `apps/android` en Android Studio y ejecutá el proyecto desde ahí.

Para apuntar a una API local, cambiá `BASE_URL` en `data/api/ApiService.kt` a la IP de tu máquina.

## Comandos útiles

```bash
# Tests
npm run test

# Lint
npm run lint

# Format
npm run format

# Drizzle Studio (UI para ver la base de datos)
npm run db:studio --workspace=apps/api

# Build producción API
npm run build:api

# Build producción Web
npm run build:web
```

## Troubleshooting común

**`ECONNREFUSED` al conectar a Postgres:**
Verificar que el contenedor de postgres esté corriendo: `docker compose ps`

**Migrations fallan con "relation already exists":**
Las migraciones son idempotentes con Drizzle. Si hay un conflicto, verificar el estado con `npm run db:studio --workspace=apps/api`.

**La app del cadete no actualiza la ubicación en background:**
Verificar que los permisos de ubicación estén concedidos y que no haya optimización de batería activa para la app en Ajustes > Aplicaciones.

**Socket.IO no conecta:**
Verificar que `CORS_ORIGIN` en `.env` coincida con la URL desde donde se accede al web.

## Estructura del proyecto

```
cambioapp/
├── apps/
│   ├── api/          # Backend Express + TypeScript
│   ├── web/          # Frontend React PWA
│   ├── android/      # App nativa Android (Kotlin + Jetpack Compose)
│   └── mobile/       # (legacy) App React Native — reemplazada por apps/android
├── packages/
│   ├── shared-types/      # Tipos TypeScript compartidos
│   └── shared-constants/  # Enums y constantes compartidas
├── docs/             # Documentación técnica
└── docker-compose.yml
```
