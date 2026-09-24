import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRadius, formatTriggerShort } from '@/lib/format';
import { LocationAlarm } from '@/types/alarm';

type AlarmCardProps = {
  alarm: LocationAlarm;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
};

export function AlarmCard({ alarm, onPress, onToggle }: AlarmCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={styles.info}>
        <ThemedText
          type="default"
          style={styles.label}
          numberOfLines={1}
          themeColor={alarm.enabled ? 'text' : 'textSecondary'}>
          {alarm.label}
        </ThemedText>
        {!!alarm.address && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.address}>
            {alarm.address}
          </ThemedText>
        )}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: theme.tintSoft }]}>
            <ThemedText type="small" themeColor="tint" style={styles.badgeText}>
              {formatRadius(alarm.radius)}
            </ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.badgeText}>
              {formatTriggerShort(alarm.trigger)}
            </ThemedText>
          </View>
        </View>
      </View>

      <Switch
        value={alarm.enabled}
        onValueChange={onToggle}
        trackColor={{ false: theme.backgroundSelected, true: theme.tint }}
        thumbColor={theme.onTint}
        ios_backgroundColor={theme.backgroundSelected}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.one,
  },
  label: {
    fontWeight: '600',
  },
  address: {
    marginTop: -2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  badge: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  badgeText: {
    lineHeight: 16,
  },
});
