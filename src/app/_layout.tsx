import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AlarmsProvider } from '@/context/alarms-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AlarmsProvider>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-alarm" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="ringing"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
        </Stack>
      </AlarmsProvider>
    </ThemeProvider>
  );
}
