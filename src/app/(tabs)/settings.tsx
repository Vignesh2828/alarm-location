import Constants from 'expo-constants';
import { SymbolView } from 'expo-symbols';
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { alarmSoundAsset, prepareAlarmAudioSession } from '@/lib/alarm-sound';
import { getLocationPermissionStatus, requestLocationPermissions } from '@/lib/geofencing';
import { getNotificationPermissionStatus, requestNotificationPermissions } from '@/lib/notifications';
import { useTheme } from '@/hooks/use-theme';

function statusLabel(status: string) {
  switch (status) {
    case 'granted':
      return 'Granted';
    case 'denied':
      return 'Denied';
    default:
      return 'Not requested';
  }
}

function statusColorKey(status: string): 'success' | 'danger' | 'textSecondary' {
  if (status === 'granted') return 'success';
  if (status === 'denied') return 'danger';
  return 'textSecondary';
}

export default function SettingsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const player = useAudioPlayer(alarmSoundAsset);

  const [foregroundStatus, setForegroundStatus] = useState<string>('undetermined');
  const [backgroundStatus, setBackgroundStatus] = useState<string>('undetermined');
  const [notificationStatus, setNotificationStatus] = useState<string>('undetermined');

  const refreshStatuses = useCallback(async () => {
    const location = await getLocationPermissionStatus();
    setForegroundStatus(location.foreground);
    setBackgroundStatus(location.background);
    const notifications = await getNotificationPermissionStatus();
    setNotificationStatus(notifications);
  }, []);

  useEffect(() => {
    // Fetch-on-mount: there's no external subscription API for permission status,
    // so this one-time read is the correct pattern despite the lint heuristic.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshStatuses();
  }, [refreshStatuses]);

  const handleRequestLocation = async () => {
    await requestLocationPermissions();
    await refreshStatuses();
  };

  const handleRequestNotifications = async () => {
    await requestNotificationPermissions();
    await refreshStatuses();
  };

  const handleTestSound = async () => {
    await prepareAlarmAudioSession();
    // expo-audio's AudioPlayer is a native class instance designed to be mutated directly.
    // eslint-disable-next-line react-hooks/immutability
    player.loop = false;
    player.seekTo(0);
    player.play();
  };

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <View style={styles.titleContainer}>
          <ThemedText type="subtitle">Settings</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Permissions and alarm preferences
          </ThemedText>
        </View>

        <SectionLabel>Permissions</SectionLabel>
        <ThemedView type="backgroundElement" style={styles.card}>
          <PermissionRow
            title="Location (while using app)"
            description="Needed to show your position on the map."
            status={foregroundStatus}
          />
          <Divider />
          <PermissionRow
            title="Location (always)"
            description="Needed so alarms can trigger in the background."
            status={backgroundStatus}
          />
          <Pressable
            onPress={handleRequestLocation}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText type="smallBold" themeColor="onTint">
              {foregroundStatus === 'granted' && backgroundStatus === 'granted'
                ? 'Permissions granted'
                : 'Grant location access'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <PermissionRow
            title="Notifications"
            description="Needed to alert you when an alarm triggers."
            status={notificationStatus}
          />
          <Pressable
            onPress={handleRequestNotifications}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText type="smallBold" themeColor="onTint">
              {notificationStatus === 'granted' ? 'Notifications granted' : 'Grant notifications'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <SectionLabel>Alarm sound</SectionLabel>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText type="default">Preview alarm sound</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Plays once at full volume
              </ThemedText>
            </View>
            <Pressable
              onPress={handleTestSound}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: theme.tintSoft, opacity: pressed ? 0.7 : 1 },
              ]}>
              <SymbolView
                name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
                tintColor={theme.tint}
                size={16}
              />
            </Pressable>
          </View>
        </ThemedView>

        <SectionLabel>About</SectionLabel>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.row}>
            <ThemedText type="default">Version</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {Constants.expoConfig?.version ?? '1.0.0'}
            </ThemedText>
          </View>
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

function PermissionRow({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <ThemedText type="default">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" themeColor={statusColorKey(status)}>
        {statusLabel(status)}
      </ThemedText>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  titleContainer: {
    gap: Spacing.one,
    paddingVertical: Spacing.four,
  },
  sectionLabel: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  actionButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
