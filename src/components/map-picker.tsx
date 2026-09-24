import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Circle,
  MapPressEvent,
  Marker,
  MarkerDragStartEndEvent,
} from 'react-native-maps';

import { useTheme } from '@/hooks/use-theme';

export type MapCoordinate = { latitude: number; longitude: number };

export type MapPickerHandle = {
  animateToCoordinate: (coordinate: MapCoordinate) => void;
};

type MapPickerProps = {
  latitude: number;
  longitude: number;
  radius: number;
  onChange: (coordinate: MapCoordinate) => void;
};

/** Roughly fits the radius circle on screen with some padding around it. */
function regionDelta(radius: number) {
  const degrees = (radius * 2.6) / 111_000;
  return Math.max(0.006, degrees);
}

export const MapPicker = forwardRef<MapPickerHandle, MapPickerProps>(function MapPicker(
  { latitude, longitude, radius, onChange },
  ref
) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const latestCoordinate = useRef<MapCoordinate>({ latitude, longitude });
  useEffect(() => {
    latestCoordinate.current = { latitude, longitude };
  }, [latitude, longitude]);

  useImperativeHandle(ref, () => ({
    animateToCoordinate: (coordinate) => {
      mapRef.current?.animateToRegion(
        {
          ...coordinate,
          latitudeDelta: regionDelta(radius),
          longitudeDelta: regionDelta(radius),
        },
        350
      );
      onChange(coordinate);
    },
  }));

  // Re-fit the map whenever the radius changes a lot, so the circle stays visible.
  useEffect(() => {
    mapRef.current?.animateToRegion(
      {
        ...latestCoordinate.current,
        latitudeDelta: regionDelta(radius),
        longitudeDelta: regionDelta(radius),
      },
      300
    );
  }, [radius]);

  const handlePress = (event: MapPressEvent) => {
    onChange(event.nativeEvent.coordinate);
  };

  const handleDragEnd = (event: MarkerDragStartEndEvent) => {
    onChange(event.nativeEvent.coordinate);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: regionDelta(radius),
          longitudeDelta: regionDelta(radius),
        }}
        onPress={handlePress}>
        <Circle
          center={{ latitude, longitude }}
          radius={radius}
          strokeColor={theme.tint}
          strokeWidth={2}
          fillColor={`${theme.tint}2E`}
        />
        <Marker
          coordinate={{ latitude, longitude }}
          draggable
          onDragEnd={handleDragEnd}
          pinColor={theme.tint}
        />
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
