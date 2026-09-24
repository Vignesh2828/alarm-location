import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlarmCard } from '@/components/alarm-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAlarms } from '@/context/alarms-context';
import { useTheme } from '@/hooks/use-theme';
import { LocationAlarm } from '@/types/alarm';

export default function HomeScreen() {
  const theme = useTheme();
  const { alarms, loading, setAlarmEnabled } = useAlarms();

  const openAlarm = (alarm?: LocationAlarm) => {
    router.push(alarm ? { pathname: '/add-alarm', params: { id: alarm.id } } : '/add-alarm');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle">Alarms</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Get notified when you arrive or leave
            </ThemedText>
          </View>
          <Pressable
            onPress={() => openAlarm()}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
            ]}
            hitSlop={8}>
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              tintColor={theme.onTint}
              size={20}
            />
          </Pressable>
        </View>

        {!loading && alarms.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.tintSoft }]}>
              <SymbolView
                name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' }}
                tintColor={theme.tint}
                size={32}
              />
            </View>
            <ThemedText type="default" style={styles.emptyTitle}>
              No alarms yet
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
              Add a location alarm to get notified when you arrive at, or leave, a place — like your
              bus stop or drop-off point.
            </ThemedText>
            <Pressable
              onPress={() => openAlarm()}
              style={({ pressed }) => [
                styles.emptyCta,
                { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
              ]}>
              <ThemedText type="smallBold" themeColor="onTint">
                Add your first alarm
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={alarms}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <AlarmCard
                alarm={item}
                onPress={() => openAlarm(item)}
                onToggle={(enabled) => setAlarmEnabled(item.id, enabled)}
              />
            )}
          />
        )}

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
    gap: Spacing.two,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontWeight: '600',
  },
  emptyBody: {
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyCta: {
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
});
