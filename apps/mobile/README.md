# CambioApp — App del Cadete

App nativa Android/iOS para cadetes. Built with Expo SDK 51.

## Setup

```bash
cd apps/mobile
npm install
```

## Desarrollo local

```bash
# Instalar expo-cli globalmente si no la tenés
npm install -g expo-cli

# Levantar en modo desarrollo
npm start

# Android
npm run android

# iOS
npm run ios
```

## Build con EAS

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# APK para distribución interna (Android)
npm run build:android

# IPA para TestFlight (iOS)
npm run build:ios
```

## Variables de entorno

Crear `.env.local`:
```
EXPO_PUBLIC_API_URL=http://localhost:4000
```

Para producción, cambiar la URL a la del servidor real.

## Permisos

### Android
- `ACCESS_FINE_LOCATION` — ubicación precisa
- `ACCESS_BACKGROUND_LOCATION` — tracking con app minimizada
- `FOREGROUND_SERVICE` — servicio en primer plano para tracking

### iOS
- `NSLocationAlwaysAndWhenInUseUsageDescription` — ubicación siempre
- `UIBackgroundModes: location` — tracking en background
