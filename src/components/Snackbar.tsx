import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { colors, typography } from '../theme';

import type { SnackbarMessage } from '../hooks/useSnackbar';

type Props = { message: SnackbarMessage; onAction: () => void };

export function Snackbar({ message, onAction }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(260)}
      exiting={FadeOutDown.duration(160)}
      style={styles.bar}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{message.text}</Text>
      {message.action !== null && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={4}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionLabel}>{message.action.label}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginHorizontal: 12,
    paddingLeft: 18,
    paddingRight: 6,
    borderRadius: 14,
    backgroundColor: colors.ink,
  },
  text: {
    ...typography.body,
    flex: 1,
    paddingVertical: 14,
    color: colors.bg,
  },
  action: {
    minHeight: 48,
    minWidth: 64,
    marginLeft: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    backgroundColor: 'rgba(252, 236, 100, 0.14)',
  },
  actionLabel: {
    ...typography.action,
    color: colors.signal,
  },
});
