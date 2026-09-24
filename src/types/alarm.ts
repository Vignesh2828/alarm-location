export type TriggerMode = 'enter' | 'exit' | 'both';

export type LocationAlarm = {
  id: string;
  /** User-facing name, e.g. "Home", "Office bus stop". */
  label: string;
  /** Human-readable address / place name shown under the label. */
  address: string;
  latitude: number;
  longitude: number;
  /** Radius of the geofence, in meters. */
  radius: number;
  /** Whether to ring on entering the radius, exiting it, or both. */
  trigger: TriggerMode;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type LocationAlarmDraft = Omit<LocationAlarm, 'id' | 'createdAt' | 'updatedAt'>;

/** Payload passed to the ringing screen when a geofence event fires. */
export type RingingPayload = {
  alarmId: string;
  eventType: 'enter' | 'exit';
};
