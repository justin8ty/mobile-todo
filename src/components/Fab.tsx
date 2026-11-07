import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../theme';

export const FAB_SIZE = 56;

/** `add` opens the new-task form, `confirm` submits it, `saving` waits for the request. */
export type FabMode = 'add' | 'confirm' | 'saving';

type Props = {
  mode: FabMode;
  /** Only applies to `confirm`: there is no title to submit yet. */
  disabled: boolean;
  onPress: () => void;
};

const ICON_IN = FadeIn.duration(140);

export function Fab({ mode, disabled, onPress }: Props) {
  const inactive = mode === 'saving' || disabled;

  return (
    // Not `disabled`: a disabled Pressable lets the touch fall through to the screen, whose
    // tap-outside handler would dismiss the form. Inactive, it still takes the touch and ignores it.
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={LABELS[mode]}
      accessibilityState={{ disabled: inactive, busy: mode === 'saving' }}
      style={({ pressed }) => [
        styles.fab,
        disabled && styles.fabDisabled,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {/* Keyed by mode so each icon fades in as the button changes role. */}
      <Animated.View key={mode} entering={ICON_IN}>
        <FabIcon mode={mode} disabled={disabled} />
      </Animated.View>
    </Pressable>
  );
}

const LABELS: Record<FabMode, string> = {
  add: 'Add task',
  confirm: 'Save task',
  saving: 'Saving task',
};

function FabIcon({ mode, disabled }: { mode: FabMode; disabled: boolean }) {
  switch (mode) {
    case 'add':
      return <Icon d="M12 5v14M5 12h14" color={colors.ink} />;
    case 'confirm':
      return <Icon d="M5 12.5l4.5 4.5L19 7.5" color={disabled ? colors.muted : colors.ink} />;
    case 'saving':
      return <ActivityIndicator size="small" color={colors.ink} />;
  }
}

function Icon({ d, color }: { d: string; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
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
  fabDisabled: {
    backgroundColor: colors.inactive,
    boxShadow: '0 4px 12px rgba(15, 23, 54, 0.10)',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
});
