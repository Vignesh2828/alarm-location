import { setAudioModeAsync } from 'expo-audio';

/** Configures the audio session so the alarm plays loudly even if the phone's
 * silent switch is on, and keeps playing while the app is backgrounded. */
export async function prepareAlarmAudioSession() {
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
    shouldPlayInBackground: true,
  });
}

export const alarmSoundAsset = require('@/assets/sounds/alarm.wav');
