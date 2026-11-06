import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

type Props = { message: string; onRetry: () => void };

export function ErrorState({ message, onRetry }: Props) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Text style={styles.heading}>Couldn't load tasks</Text>
      <Text style={styles.detail}>{message}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>RETRY</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 64,
  },
  heading: {
    ...typography.heading,
    color: colors.ink,
    textAlign: 'center',
  },
  detail: {
    ...typography.body,
    marginTop: 6,
    color: colors.subtle,
    textAlign: 'center',
  },
  button: {
    minHeight: 48,
    minWidth: 120,
    marginTop: 24,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.signal,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  buttonLabel: {
    ...typography.action,
    color: colors.ink,
  },
});
