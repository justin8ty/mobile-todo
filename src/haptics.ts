import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics are a nicety: a device that can't play one must never break the interaction.
 * Android uses the system haptic constants (no vibrate permission, matches the OS feel);
 * the ones chosen here exist on every Android version.
 */
function play(android: Haptics.AndroidHaptics, ios: () => Promise<void>) {
  const pending = Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(android) : ios();

  pending.catch(() => {});
}

/** Toggling a task. */
export function tapHaptic() {
  play(Haptics.AndroidHaptics.Virtual_Key, () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  );
}

/** A swipe crossing the point where releasing would delete. */
export function thresholdHaptic() {
  play(Haptics.AndroidHaptics.Clock_Tick, () => Haptics.selectionAsync());
}
