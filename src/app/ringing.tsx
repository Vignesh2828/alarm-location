import { useAudioPlayer } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Vibration, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAlarms } from '@/context/alarms-context';
import { useTheme } from '@/hooks/use-theme';
import { alarmSoundAsset, prepareAlarmAudioSession } from '@/lib/alarm-sound';
import { formatRadius } from '@/lib/format';
import { ALARM_CATEGORY, ALARM_CHANNEL_ID } from '@/lib/notifications';

const VIBRATION_PATTERN = [0, 500, 300, 500];

export default function RingingScreen() {
  const theme = useTheme();
  const { alarmId, eventType } = useLocalSearchParams<{
    alarmId: string;
    eventType?: 'enter' | 'exit';
  }>();
  const { getAlarm } = useAlarms();
  const alarm = alarmId ? getAlarm(alarmId) : undefined;
  const player = useAudioPlayer(alarmSoundAsset);
  const startedRef = useRef(false);

  // expo-audio's AudioPlayer is a native class instance designed to be mutated/controlled
  // directly (play/pause/loop), so this effect necessarily reaches into it — there's no
  // external-system-free way to start a looping alarm sound on mount.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      await prepareAlarmAudioSession();
      // eslint-disable-next-line react-hooks/immutability
      player.loop = true;
      player.play();
      Vibration.vibrate(VIBRATION_PATTERN, true);
    })();

    // Block the Android hardware back button — the alarm must be stopped explicitly.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
      player.pause();
      Vibration.cancel();
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAlarm = () => {
    player.pause();
    Vibration.cancel();
  };

  const handleStop = () => {
    stopAlarm();
    router.back();
  };

  const handleSnooze = async () => {
    stopAlarm();
    if (alarm) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${alarm.label}`,
          body: `Snoozed alarm — ${formatRadius(alarm.radius)} radius reminder.`,
          sound: 'default',
          categoryIdentifier: ALARM_CATEGORY,
          data: { alarmId: alarm.id, eventType: eventType ?? 'enter' },
          ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : null),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5 * 60,
          repeats: false,
        },
      });
    }
    router.back();
  };

  const verb = eventType === 'exit' ? 'Leaving' : 'Arriving at';

  return (
    <ThemedView type="tint" style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <SymbolView
            name={{ ios: 'mappin.circle.fill', android: 'place', web: 'place' }}
            tintColor="#ffffff"
            size={56}
          />
        </View>

        <ThemedText type="small" style={styles.eyebrow}>
          {verb.toUpperCase()}
        </ThemedText>
        <ThemedText type="title" style={styles.title}>
          {alarm?.label ?? 'Location alarm'}
        </ThemedText>
        {!!alarm?.address && (
          <ThemedText type="default" style={styles.address} numberOfLines={2}>
            {alarm.address}
          </ThemedText>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleSnooze}
          style={({ pressed }) => [styles.snoozeButton, { opacity: pressed ? 0.8 : 1 }]}>
          <ThemedText type="smallBold" style={styles.snoozeText}>
            Snooze 5 min
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={handleStop}
          style={({ pressed }) => [
            styles.stopButton,
            { backgroundColor: '#ffffff', opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText type="default" style={[styles.stopText, { color: theme.tint }]}>
            Stop
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  title: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 38,
  },
  address: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  actions: {
    gap: Spacing.three,
  },
  snoozeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  snoozeText: {
    color: '#ffffff',
  },
  stopButton: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  stopText: {
    fontWeight: '700',
    fontSize: 17,
  },
});
