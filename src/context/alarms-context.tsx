import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import { syncGeofences } from '@/lib/geofencing';
import { generateId } from '@/lib/id';
import { configureNotifications } from '@/lib/notifications';
import { loadAlarms, saveAlarms } from '@/lib/storage';
import { LocationAlarm, LocationAlarmDraft } from '@/types/alarm';

type AlarmsContextValue = {
  alarms: LocationAlarm[];
  loading: boolean;
  addAlarm: (draft: LocationAlarmDraft) => Promise<LocationAlarm>;
  updateAlarm: (id: string, draft: LocationAlarmDraft) => Promise<void>;
  removeAlarm: (id: string) => Promise<void>;
  setAlarmEnabled: (id: string, enabled: boolean) => Promise<void>;
  getAlarm: (id: string) => LocationAlarm | undefined;
};

const AlarmsContext = createContext<AlarmsContextValue | null>(null);

export function AlarmsProvider({ children }: PropsWithChildren) {
  const [alarms, setAlarms] = useState<LocationAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const alarmsRef = useRef(alarms);
  useEffect(() => {
    alarmsRef.current = alarms;
  }, [alarms]);

  useEffect(() => {
    (async () => {
      const stored = await loadAlarms();
      setAlarms(stored);
      setLoading(false);
      await configureNotifications();
      await syncGeofences(stored);
    })();
  }, []);

  // Re-sync geofences whenever the app returns to the foreground, in case
  // permissions changed while backgrounded.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncGeofences(alarmsRef.current);
      }
    });
    return () => subscription.remove();
  }, []);

  // Tapping the alarm notification (or one of its action buttons) opens the ringing screen.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { alarmId?: string; eventType?: 'enter' | 'exit' }
        | undefined;
      if (!data?.alarmId) return;

      if (response.actionIdentifier === 'stop') {
        return;
      }

      router.push({
        pathname: '/ringing',
        params: { alarmId: data.alarmId, eventType: data.eventType ?? 'enter' },
      });
    });
    return () => subscription.remove();
  }, []);

  // Also react to notifications that arrive while the app is already open.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as
        | { alarmId?: string; eventType?: 'enter' | 'exit' }
        | undefined;
      if (!data?.alarmId) return;
      router.push({
        pathname: '/ringing',
        params: { alarmId: data.alarmId, eventType: data.eventType ?? 'enter' },
      });
    });
    return () => subscription.remove();
  }, []);

  const persist = useCallback(async (next: LocationAlarm[]) => {
    setAlarms(next);
    await saveAlarms(next);
    await syncGeofences(next);
  }, []);

  const addAlarm = useCallback(
    async (draft: LocationAlarmDraft) => {
      const now = Date.now();
      const alarm: LocationAlarm = { ...draft, id: generateId(), createdAt: now, updatedAt: now };
      await persist([...alarmsRef.current, alarm]);
      return alarm;
    },
    [persist]
  );

  const updateAlarm = useCallback(
    async (id: string, draft: LocationAlarmDraft) => {
      const next = alarmsRef.current.map((alarm) =>
        alarm.id === id ? { ...alarm, ...draft, updatedAt: Date.now() } : alarm
      );
      await persist(next);
    },
    [persist]
  );

  const removeAlarm = useCallback(
    async (id: string) => {
      const next = alarmsRef.current.filter((alarm) => alarm.id !== id);
      await persist(next);
    },
    [persist]
  );

  const setAlarmEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const next = alarmsRef.current.map((alarm) =>
        alarm.id === id ? { ...alarm, enabled, updatedAt: Date.now() } : alarm
      );
      await persist(next);
    },
    [persist]
  );

  const getAlarm = useCallback((id: string) => alarmsRef.current.find((a) => a.id === id), []);

  const value = useMemo<AlarmsContextValue>(
    () => ({ alarms, loading, addAlarm, updateAlarm, removeAlarm, setAlarmEnabled, getAlarm }),
    [alarms, loading, addAlarm, updateAlarm, removeAlarm, setAlarmEnabled, getAlarm]
  );

  return <AlarmsContext.Provider value={value}>{children}</AlarmsContext.Provider>;
}

export function useAlarms() {
  const context = useContext(AlarmsContext);
  if (!context) throw new Error('useAlarms must be used within an AlarmsProvider');
  return context;
}
