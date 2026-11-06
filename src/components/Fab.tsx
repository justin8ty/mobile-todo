import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../theme';

export const FAB_SIZE = 56;

type Props = {
  onPress: () => void;
  /** Called with `true` when a press starts and `false` when it ends or is cancelled. */
  onHoldChange: (held: boolean) => void;
};

export function Fab({ onPress, onHoldChange }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => onHoldChange(true)}
      onPressOut={() => onHoldChange(false)}
      accessibilityRole="button"
      accessibilityLabel="Add task"
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path
          d="M12 5v14M5 12h14"
          stroke={colors.ink}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.signal,
    boxShadow: '0 6px 16px rgba(15, 23, 54, 0.16)',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
});
