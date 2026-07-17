# Guía de Deployment

## Variables de entorno de producción

Copiar `.env.example` y configurar:

```bash
# Postgres — usar credenciales reales, no las de dev
POSTGRES_USER=cambioapp_prod
POSTGRES_PASSWORD=<password-largo-aleatorio>
POSTGRES_DB=cambioapp_prod

DATABASE_URL=postgresql://cambioapp_prod:<password>@postgres:5432/cambioapp_prod

# JWT — generar con: openssl rand -hex 64
JWT_SECRET=<64-bytes-hex>
JWT_REFRESH_SECRET=<otro-64-bytes-hex-diferente>

NODE_ENV=production

# URL del frontend en producción
CORS_ORIGIN=https://app.tucambioapp.com.ar

# URL de la API para el frontend
VITE_API_URL=https://api.tucambioapp.com.ar
```

## Primer setup de la base de datos

```bash
# 1. Correr migraciones
npm run db:migrate --workspace=apps/api

# 2. Crear usuarios iniciales (cambiar contraseñas después)
npm run db:seed --workspace=apps/api
```

**Importante**: Cambiar las contraseñas del seed inmediatamente después del primer deploy.

## Deploy con Docker Compose (VPS)

```bash
# En el servidor
git clone <repo> /opt/cambioapp
cd /opt/cambioapp
cp .env.example .env
# editar .env con valores de producción

docker compose up -d --build
npm run db:migrate --workspace=apps/api
```

## Deploy en Cloudflare Pages (frontend) + Railway (backend)

Alternativa sin VPS: el frontend (`apps/web`) se despliega en Cloudflare Pages
y el backend (`apps/api` + Postgres) en Railway. Ambas plataformas permiten
agregar colaboradores sin costo en sus planes gratuitos (a diferencia del plan
Hobby de Vercel, que es de un solo usuario).

**Por qué no todo en Cloudflare:** `apps/api` usa Socket.IO como servidor de
proceso persistente y `pg` con conexión TCP directa a Postgres. Cloudflare
Pages/Workers no soportan eso sin reescribir esa parte (Durable Objects +
Hyperdrive), así que el backend necesita un host Node "tradicional".

### 1. Backend en Railway

1. Entrar a [railway.app](https://railway.app) y loguearse con GitHub,
   autorizando acceso al repo `matiasmt93/financieraappbackup`.
2. **New Project → Deploy from GitHub repo** → elegir el repo y la branch a
   desplegar.
3. Railway detecta automáticamente `railway.json` (en la raíz del repo), que
   ya define el build (`npm ci && npm run build:api`) y el arranque
   (`node apps/api/dist/server.js`) apuntando al workspace `apps/api`. No
   hace falta tocar nada en "Build settings".
4. Agregar la base de datos: **New → Database → Add PostgreSQL** dentro del
   mismo proyecto. Railway crea el plugin con su propia `DATABASE_URL`.
5. En el servicio de la API, ir a **Variables** y configurar:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}   # referencia al plugin de Postgres
   JWT_SECRET=<generar con: openssl rand -hex 64>
   JWT_REFRESH_SECRET=<otro valor distinto, mismo comando>
   NODE_ENV=production
   CORS_ORIGIN=http://localhost:5173   # actualizar en el paso 3 con la URL real de Cloudflare Pages
   APP_VERSION_CODE=11
   APP_DOWNLOAD_URL=
   ```
   `PORT` no hace falta definirlo: Railway lo inyecta solo y el servidor ya
   lee `process.env.PORT`.
6. Deploy. Las migraciones corren solas al arrancar (`runMigrations()` en
   `server.ts`). Para cargar los usuarios de prueba, correr una vez desde la
   pestaña **Shell** del servicio: `npm run db:seed --workspace=apps/api`.
7. Verificar `https://<tu-servicio>.up.railway.app/health` → debe responder
   `{"ok":true,"status":"healthy"}`. Esa URL es tu `VITE_API_URL` para el
   paso siguiente.
8. Para sumar colaboradores: **Project Settings → Members → Invite** (plan
   gratis de Railway permite invitar miembros al proyecto).

### 2. Frontend en Cloudflare Pages

1. En el [dashboard de Cloudflare](https://dash.cloudflare.com) → **Workers
   & Pages → Create → Pages → Connect to Git** → elegir el repo.
2. Build settings (el proyecto es un monorepo con npm workspaces, por eso el
   build corre desde la raíz aunque el output esté en `apps/web`):
   ```
   Root directory:            /
   Build command:             npm ci && npm run build:web
   Build output directory:    apps/web/dist
   ```
3. **Environment variables** (Production y Preview):
   ```
   VITE_API_URL=https://<tu-servicio>.up.railway.app
   ```
   Vite incrusta esta variable en el build, así que hay que redeployar si
   cambia.
4. Deploy. El archivo `apps/web/public/_redirects` ya está preparado para
   que el ruteo de React Router funcione en Cloudflare Pages (SPA fallback).
5. Volver a Railway y actualizar `CORS_ORIGIN` con la URL definitiva de
   Cloudflare Pages (ej: `https://cambioapp.pages.dev`). Si vas a usar un
   dominio propio, agregalo también, separado por coma:
   ```
   CORS_ORIGIN=https://cambioapp.pages.dev,https://app.tucambioapp.com.ar
   ```
   (`CORS_ORIGIN` acepta una lista separada por comas — útil también porque
   cada branch de un colaborador genera una URL de preview distinta en
   Cloudflare Pages; si necesitan que esos previews hablen con la API, hay
   que sumar esas URLs a la lista).
6. Para sumar colaboradores: **Cloudflare dashboard → Manage Account →
   Members → Invite** (el plan gratis permite agregar miembros a la cuenta/
   proyecto).

### Notas

- El repo original en Vercel sigue corriendo sin cambios; este flujo es
  independiente y usa este repo (`financieraAppBackup`) como origen para
  Railway y Cloudflare Pages.
- La app Android (`apps/android`) apunta a la API por `BASE_URL` en
  `data/api/ApiService.kt` — actualizarla a la URL de Railway si corresponde.

## Build del APK Android con EAS Build

```bash
cd apps/mobile

# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Login con cuenta Expo
eas login

# 3. Configurar el proyecto (solo la primera vez)
eas build:configure

# 4. Build APK para distribución interna
eas build --platform android --profile preview

# 5. Build APK de producción
eas build --platform android --profile production
```

El APK se descarga desde el dashboard de Expo: https://expo.dev

## Build y subir a TestFlight (iOS)

```bash
cd apps/mobile

# 1. Configurar Apple Developer account en eas.json
# Agregar: "submit": { "production": { "ios": { "appleId": "...", "ascAppId": "..." } } }

# 2. Build IPA
eas build --platform ios --profile production

# 3. Submit a App Store Connect (TestFlight)
eas submit --platform ios
```

## Checklist de producción

- [ ] Variables de entorno configuradas (JWT secrets, DB password, CORS_ORIGIN)
- [ ] Migraciones corridas
- [ ] Contraseñas del seed cambiadas
- [ ] HTTPS configurado (Nginx + Certbot recomendado)
- [ ] Backup de PostgreSQL configurado (pg_dump diario)
- [ ] `NODE_ENV=production` en el servidor
- [ ] Logs centralizados (opcional: Datadog, Logtail)

## Nginx (proxy inverso recomendado)

```nginx
server {
    listen 443 ssl;
    server_name api.tucambioapp.com.ar;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";  # necesario para WebSocket/Socket.IO
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name app.tucambioapp.com.ar;

    root /opt/cambioapp/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # SPA routing
    }
}
```
