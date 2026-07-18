import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { apiClient } from './api.ts';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TASK_NAME = 'cambioapp-location-task';
export const LOCATION_INTERVAL_MS = 20_000;

/**
 * Background task that sends GPS coordinates to the API.
 * Runs every ~20 seconds even with screen off / app minimized.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[Location Task] Error:', error);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const location = locations[0];
  if (!location) return;

  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return;

    await apiClient.post(
      '/locations',
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    // Silently ignore — next tick will retry
  }
});

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  return bgStatus === 'granted';
}

export async function startLocationTracking(): Promise<void> {
  const hasPermissions = await requestLocationPermissions();
  if (!hasPermissions) {
    console.warn('[Location] Background permissions denied');
    return;
  }

  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (isRunning) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: LOCATION_INTERVAL_MS,
    distanceInterval: 10,
    foregroundService: {
      notificationTitle: 'Plaza App',
      notificationBody: 'Compartiendo ubicación con el coordinador',
      notificationColor: '#1D9E75',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

export async function stopLocationTracking(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
