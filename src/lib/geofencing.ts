import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { presentAlarmNotification } from '@/lib/notifications';
import { loadAlarms } from '@/lib/storage';
import { LocationAlarm } from '@/types/alarm';

export const GEOFENCE_TASK_NAME = 'location-alarm-geofence-task';

type GeofencingTaskData = {
  eventType: Location.LocationGeofencingEventType;
  region: Location.LocationRegion;
};

// Must be registered at module scope so the OS can relaunch the JS engine
// in the background and immediately know which function to invoke.
TaskManager.defineTask<GeofencingTaskData>(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[geofencing] task error', error.message);
    return;
  }
  if (!data) return;

  const { eventType, region } = data;
  const alarmId = region.identifier;
  if (!alarmId) return;

  const alarms = await loadAlarms();
  const alarm = alarms.find((item) => item.id === alarmId);
  if (!alarm || !alarm.enabled) return;

  const isEnter = eventType === Location.GeofencingEventType.Enter;
  const matchesTrigger =
    alarm.trigger === 'both' ||
    (alarm.trigger === 'enter' && isEnter) ||
    (alarm.trigger === 'exit' && !isEnter);
  if (!matchesTrigger) return;

  await presentAlarmNotification(alarm, isEnter ? 'enter' : 'exit');
});

export type LocationPermissionSummary = {
  foreground: Location.PermissionStatus;
  background: Location.PermissionStatus;
};

export async function getLocationPermissionStatus(): Promise<LocationPermissionSummary> {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();
  return { foreground: foreground.status, background: background.status };
}

/** Requests foreground permission first (required), then background (required for the alarm to
 * work while the app isn't open). Returns the final status of both. */
export async function requestLocationPermissions(): Promise<LocationPermissionSummary> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    return { foreground: foreground.status, background: Location.PermissionStatus.UNDETERMINED };
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  return { foreground: foreground.status, background: background.status };
}

/** Re-registers the OS-level geofences to match the currently enabled alarms. Safe to call
 * often — it fully replaces the previous region list. */
export async function syncGeofences(alarms: LocationAlarm[]): Promise<void> {
  const active = alarms.filter((alarm) => alarm.enabled);

  const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);

  if (active.length === 0) {
    if (isRunning) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
    return;
  }

  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) return;

  const regions: Location.LocationRegion[] = active.map((alarm) => ({
    identifier: alarm.id,
    latitude: alarm.latitude,
    longitude: alarm.longitude,
    radius: alarm.radius,
    notifyOnEnter: alarm.trigger === 'enter' || alarm.trigger === 'both',
    notifyOnExit: alarm.trigger === 'exit' || alarm.trigger === 'both',
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
}

export async function stopAllGeofences(): Promise<void> {
  const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
  if (isRunning) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
  }
}

export async function getCurrentLocation() {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) return null;
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export async function searchAddress(query: string) {
  const results = await Location.geocodeAsync(query);
  return results.slice(0, 5);
}

export async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!result) return null;
    return [result.name, result.street, result.city, result.region]
      .filter(Boolean)
      .filter((part, index, all) => all.indexOf(part) === index)
      .join(', ');
  } catch {
    return null;
  }
}
