import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapPicker, MapPickerHandle } from '@/components/map-picker';
import { RADIUS_STEPS, RadiusSlider } from '@/components/radius-slider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAlarms } from '@/context/alarms-context';
import {
  getCurrentLocation,
  reverseGeocode,
  requestLocationPermissions,
  searchAddress,
} from '@/lib/geofencing';
import { formatTriggerLabel } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { TriggerMode } from '@/types/alarm';

const DEFAULT_COORDINATE = { latitude: 37.7749, longitude: -122.4194 };
const TRIGGER_OPTIONS: TriggerMode[] = ['enter', 'exit', 'both'];

export default function AddAlarmScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getAlarm, addAlarm, updateAlarm, removeAlarm } = useAlarms();
  const editingAlarm = id ? getAlarm(id) : undefined;
  const isEditing = !!editingAlarm;

  const mapRef = useRef<MapPickerHandle>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [label, setLabel] = useState(editingAlarm?.label ?? '');
  const [address, setAddress] = useState(editingAlarm?.address ?? '');
  const [coordinate, setCoordinate] = useState(
    editingAlarm
      ? { latitude: editingAlarm.latitude, longitude: editingAlarm.longitude }
      : DEFAULT_COORDINATE
  );
  const [radius, setRadius] = useState(editingAlarm?.radius ?? RADIUS_STEPS[6]);
  const [trigger, setTrigger] = useState<TriggerMode>(editingAlarm?.trigger ?? 'enter');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  // For a brand-new alarm, try to center on the user's current location right away.
  useEffect(() => {
    if (editingAlarm) return;
    (async () => {
      const current = await getCurrentLocation();
      if (current) {
        setCoordinate(current);
        mapRef.current?.animateToCoordinate(current);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the address field in sync with the pin, without hammering the geocoder while dragging.
  useEffect(() => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      const result = await reverseGeocode(coordinate.latitude, coordinate.longitude);
      if (result) setAddress(result);
    }, 500);
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, [coordinate]);

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      await requestLocationPermissions();
      const current = await getCurrentLocation();
      if (current) {
        setCoordinate(current);
        mapRef.current?.animateToCoordinate(current);
        Haptics.selectionAsync().catch(() => {});
      } else {
        Alert.alert(
          'Location unavailable',
          'Grant location access in Settings to use your current location.'
        );
      }
    } finally {
      setLocating(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchAddress(searchQuery.trim());
      const first = results[0];
      if (first) {
        const next = { latitude: first.latitude, longitude: first.longitude };
        setCoordinate(next);
        mapRef.current?.animateToCoordinate(next);
      } else {
        Alert.alert('No results', 'Try a different search term.');
      }
    } catch {
      Alert.alert('Search failed', 'Could not search for that location.');
    } finally {
      setSearching(false);
    }
  };

  const canSave = useMemo(() => label.trim().length > 0, [label]);

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const draft = {
      label: label.trim(),
      address,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      radius,
      trigger,
      enabled: editingAlarm?.enabled ?? true,
    };
    try {
      if (editingAlarm) {
        await updateAlarm(editingAlarm.id, draft);
      } else {
        await addAlarm(draft);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingAlarm) return;
    Alert.alert('Delete alarm', `Delete "${editingAlarm.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeAlarm(editingAlarm.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="default" themeColor="tint">
              Cancel
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold">{isEditing ? 'Edit alarm' : 'New alarm'}</ThemedText>
          <Pressable onPress={handleSave} disabled={!canSave || saving} hitSlop={8}>
            <ThemedText
              type="smallBold"
              themeColor={canSave ? 'tint' : 'textSecondary'}
              style={saving ? styles.saving : undefined}>
              {saving ? 'Saving…' : 'Save'}
            </ThemedText>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.searchRow}>
              <View style={[styles.searchInputWrap, { backgroundColor: theme.backgroundElement }]}>
                <SymbolView
                  name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                  tintColor={theme.textSecondary}
                  size={16}
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  placeholder="Search for a place or address"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.searchInput, { color: theme.text }]}
                  returnKeyType="search"
                />
                {searching && <ActivityIndicator size="small" color={theme.tint} />}
              </View>
              <Pressable
                onPress={handleUseCurrentLocation}
                disabled={locating}
                style={({ pressed }) => [
                  styles.locateButton,
                  { backgroundColor: theme.tintSoft, opacity: pressed ? 0.8 : 1 },
                ]}>
                {locating ? (
                  <ActivityIndicator size="small" color={theme.tint} />
                ) : (
                  <SymbolView
                    name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }}
                    tintColor={theme.tint}
                    size={18}
                  />
                )}
              </Pressable>
            </View>

            <View style={styles.mapWrap}>
              <MapPicker
                ref={mapRef}
                latitude={coordinate.latitude}
                longitude={coordinate.longitude}
                radius={radius}
                onChange={setCoordinate}
              />
            </View>

            {!!address && (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.address}>
                {address}
              </ThemedText>
            )}

            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                Alarm name
              </ThemedText>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Home bus stop"
                placeholderTextColor={theme.textSecondary}
                style={[styles.labelInput, { color: theme.text }]}
              />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.section}>
              <RadiusSlider value={radius} onChange={setRadius} />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.triggerLabel}>
                Alert me when I
              </ThemedText>
              <View style={styles.triggerRow}>
                {TRIGGER_OPTIONS.map((option) => {
                  const selected = option === trigger;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setTrigger(option)}
                      style={[
                        styles.triggerOption,
                        {
                          backgroundColor: selected ? theme.tint : theme.backgroundSelected,
                        },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        themeColor={selected ? 'onTint' : 'textSecondary'}>
                        {option === 'enter' ? 'Arrive' : option === 'exit' ? 'Leave' : 'Both'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {formatTriggerLabel(trigger)}
              </ThemedText>
            </ThemedView>

            {isEditing && (
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [
                  styles.deleteButton,
                  { backgroundColor: theme.dangerSoft, opacity: pressed ? 0.8 : 1 },
                ]}>
                <ThemedText type="smallBold" themeColor="danger">
                  Delete alarm
                </ThemedText>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  saving: {
    opacity: 0.6,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  locateButton: {
    width: 44,
    height: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrap: {
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
  },
  address: {
    marginTop: -Spacing.two,
  },
  section: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  labelInput: {
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: Spacing.one,
  },
  triggerLabel: {
    marginBottom: -Spacing.one,
  },
  triggerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  triggerOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
});
