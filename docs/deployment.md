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
