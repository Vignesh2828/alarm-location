import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRadius } from '@/lib/format';

export const RADIUS_STEPS = [
  100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000, 15000,
  20000,
];

const THUMB_SIZE = 26;

type RadiusSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export function RadiusSlider({ value, onChange }: RadiusSliderProps) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const closestIndex = useMemo(() => {
    let bestIndex = 0;
    let bestDiff = Infinity;
    RADIUS_STEPS.forEach((step, index) => {
      const diff = Math.abs(step - value);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = index;
      }
    });
    return bestIndex;
  }, [value]);

  const lastIndexRef = useRef(closestIndex);

  const updateFromLocationX = useCallback((locationX: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    const fraction = Math.min(1, Math.max(0, locationX / width));
    const index = Math.round(fraction * (RADIUS_STEPS.length - 1));
    if (index !== lastIndexRef.current) {
      lastIndexRef.current = index;
      Haptics.selectionAsync().catch(() => {});
      onChangeRef.current(RADIUS_STEPS[index]);
    }
  }, []);

  // PanResponder.create only *invokes* the handlers on real touch events (never during
  // render); the handlers close over updateFromLocationX, which reads refs internally.
  const panResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateFromLocationX(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateFromLocationX(event.nativeEvent.locationX),
      }),
    [updateFromLocationX]
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    trackWidthRef.current = event.nativeEvent.layout.width;
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const fraction = closestIndex / (RADIUS_STEPS.length - 1);
  const thumbLeft = Math.max(
    0,
    Math.min(trackWidth - THUMB_SIZE, fraction * trackWidth - THUMB_SIZE / 2)
  );

  return (
    <View>
      <View style={styles.headerRow}>
        <ThemedText type="small" themeColor="textSecondary">
          Alert radius
        </ThemedText>
        <ThemedText type="smallBold" themeColor="tint">
          {formatRadius(RADIUS_STEPS[closestIndex])}
        </ThemedText>
      </View>

      <View
        style={[styles.track, { backgroundColor: theme.backgroundElement }]}
        onLayout={handleLayout}
        hitSlop={{ top: 14, bottom: 14 }}
        {...panResponder.panHandlers}>
        <View
          style={[
            styles.fill,
            { width: Math.max(THUMB_SIZE / 2, fraction * trackWidth), backgroundColor: theme.tint },
          ]}
        />
        {trackWidth > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              { left: thumbLeft, backgroundColor: theme.onTint, borderColor: theme.tint },
            ]}
          />
        )}
      </View>

      <View style={styles.scaleLabels}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatRadius(RADIUS_STEPS[0])}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatRadius(RADIUS_STEPS[RADIUS_STEPS.length - 1])}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  track: {
    height: 8,
    borderRadius: 4,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    top: -9,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
});
