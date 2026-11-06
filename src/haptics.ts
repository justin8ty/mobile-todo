import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/**
 * Android drives the vibrator directly. expo-haptics can't be used there in Expo Go:
 * `performAndroidHapticsAsync` silently does nothing (https://github.com/expo/expo/issues/49262),
 * and `impactAsync` pulses are too weak to feel on some phones (e.g. Samsung). Pulses
 * of 40ms or less didn't register on a Samsung device and 60ms felt weak.
 */
const ANDROID_PULSE_MS = 100;

/** Haptics are a nicety: a device that can't play one must never break the interaction. */
function play(ios: () => Promise<void>) {
  if (Platform.OS === 'android') {
    Vibration.vibrate(ANDROID_PULSE_MS);

    return;
  }

  ios().catch(() => {});
}

/** Toggling a task. */
export function tapHaptic() {
  play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A swipe crossing the point where releasing would delete. */
export function thresholdHaptic() {
  play(() => Haptics.selectionAsync());
}
