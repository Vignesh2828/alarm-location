import AsyncStorage from '@react-native-async-storage/async-storage';

import { LocationAlarm } from '@/types/alarm';

const ALARMS_KEY = 'alarm/location-alarms';

export async function loadAlarms(): Promise<LocationAlarm[]> {
  try {
    const raw = await AsyncStorage.getItem(ALARMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load alarms from storage', error);
    return [];
  }
}

export async function saveAlarms(alarms: LocationAlarm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
  } catch (error) {
    console.warn('Failed to save alarms to storage', error);
  }
}
