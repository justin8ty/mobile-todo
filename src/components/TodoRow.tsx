import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { tapHaptic, thresholdHaptic } from '../haptics';
import { colors, gutter, typography } from '../theme';
import { Checkbox } from './Checkbox';

import type { AccessibilityActionEvent } from 'react-native';
import type { Todo } from '../types';

// Fraction of the row width a swipe must pass for releasing to delete.
const DELETE_THRESHOLD = 0.35;

const SPRING_BACK = { damping: 20, stiffness: 240 };

// How far the swipe hint slides the row to show a sliver of the delete area.
const HINT_DISTANCE = 48;

const HINT_SLIDE = { duration: 280, easing: Easing.out(Easing.cubic) };

const TRASH_SIZE = 22;

const ACCESSIBILITY_ACTIONS = [{ name: 'delete', label: 'Delete' }];

type Props = {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  /** Called when the user starts swiping this row. */
  onSwipe: () => void;
  /** Changing this to a new number plays the swipe hint; `null` means no hint. */
  hintKey: number | null;
};

export const TodoRow = memo(function TodoRow({
  todo,
  onToggle,
  onDelete,
  onSwipe,
  hintKey,
}: Props) {
  const { width } = useWindowDimensions();
  const offset = useSharedValue(0);
  const armed = useSharedValue(false);
  const threshold = width * DELETE_THRESHOLD;

  // A hint already requested when the row mounts (e.g. restored by Undo) isn't replayed.
  const playedHintKey = useRef(hintKey);

  useEffect(() => {
    if (hintKey === null || hintKey === playedHintKey.current) return;

    playedHintKey.current = hintKey;
    offset.value = withSequence(
      withTiming(-HINT_DISTANCE, HINT_SLIDE),
      withSpring(0, SPRING_BACK),
      withTiming(-HINT_DISTANCE / 2, HINT_SLIDE),
      withSpring(0, SPRING_BACK),
    );
  }, [hintKey, offset]);

  const pan = usePanGesture({
    // Horizontal intent activates; vertical movement first hands the touch to the list.
    activeOffsetX: [-12, 12],
    failOffsetY: [-10, 10],
    onActivate: () => {
      cancelAnimation(offset);
      scheduleOnRN(onSwipe);
    },
    onUpdate: (event) => {
      offset.value = Math.min(event.translationX, 0);

      const pastThreshold = -offset.value > threshold;

      if (pastThreshold !== armed.value) {
        armed.value = pastThreshold;
        scheduleOnRN(thresholdHaptic);
      }
    },
    onDeactivate: (event) => {
      if (armed.value && !event.canceled) {
        offset.value = withTiming(-width, { duration: 180 }, (finished) => {
          if (finished) scheduleOnRN(onDelete, todo.id);
        });

        return;
      }

      armed.value = false;
      offset.value = withSpring(0, SPRING_BACK);
    },
  });

  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  // Hidden at rest so fades and layout moves never flash red behind the row.
  const underlayStyle = useAnimatedStyle(() => ({ opacity: offset.value < 0 ? 1 : 0 }));

  const trashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(armed.value ? 1.18 : 1, SPRING_BACK) }],
  }));

  function toggle() {
    tapHaptic();
    onToggle(todo.id);
  }

  function handleAccessibilityAction(event: AccessibilityActionEvent) {
    if (event.nativeEvent.actionName === 'delete') onDelete(todo.id);
  }

  return (
    <View>
      <Animated.View style={[styles.underlay, underlayStyle]}>
        <Animated.View style={trashStyle}>
          <TrashIcon />
        </Animated.View>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={slideStyle}>
          <Pressable
            onPress={toggle}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: todo.completed }}
            accessibilityLabel={todo.title}
            accessibilityActions={ACCESSIBILITY_ACTIONS}
            onAccessibilityAction={handleAccessibilityAction}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            {({ pressed }) => (
              <>
                <Checkbox checked={todo.completed} pressed={pressed} />
                <Text style={[styles.title, todo.completed && styles.completed]}>
                  {todo.title}
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

function TrashIcon() {
  return (
    <Svg width={TRASH_SIZE} height={TRASH_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5h16M9.5 6.5V4.75c0-.7.55-1.25 1.25-1.25h2.5c.7 0 1.25.55 1.25 1.25V6.5M6.25 6.5l.8 12.1c.06.93.83 1.65 1.76 1.65h6.38c.93 0 1.7-.72 1.76-1.65l.8-12.1M10 10.5v6M14 10.5v6"
        stroke={colors.bg}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  underlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'flex-end',
    justifyContent: 'center',
    // Centres the icon in the sliver the hint reveals.
    paddingRight: (HINT_DISTANCE - TRASH_SIZE) / 2,
    backgroundColor: colors.danger,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    minHeight: 50,
    paddingHorizontal: gutter,
    paddingVertical: 14,
    backgroundColor: colors.bg,
  },
  pressed: {
    backgroundColor: colors.wash,
  },
  title: {
    ...typography.row,
    flex: 1,
    color: colors.ink,
  },
  completed: {
    color: colors.muted,
  },
});
