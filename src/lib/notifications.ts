import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { LocationAlarm } from '@/types/alarm';

export const ALARM_CATEGORY = 'location-alarm';
export const ALARM_CHANNEL_ID = 'location-alarms';

/** Show the alert banner + play a sound even while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function configureNotifications() {
  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY, [
    {
      identifier: 'stop',
      buttonTitle: 'Stop',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Snooze 5 min',
      options: { opensAppToForeground: false },
    },
  ]);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Location alarms',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 250, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
}

export async function requestNotificationPermissions() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false, allowCriticalAlerts: true },
  });
  return result.granted;
}

export async function getNotificationPermissionStatus() {
  const current = await Notifications.getPermissionsAsync();
  return current.status;
}

/** Fire an immediate local notification for a triggered geofence, used to wake the app / alert the user. */
export async function presentAlarmNotification(alarm: LocationAlarm, eventType: 'enter' | 'exit') {
  const verb = eventType === 'enter' ? 'Arriving at' : 'Leaving';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ ${alarm.label}`,
      body: `${verb} ${alarm.address || 'your alarm location'}. Tap to open the alarm.`,
      sound: 'default',
      categoryIdentifier: ALARM_CATEGORY,
      data: { alarmId: alarm.id, eventType },
      ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : null),
    },
    trigger: null,
  });
}
