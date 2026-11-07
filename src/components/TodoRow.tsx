import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { tapHaptic, thresholdHaptic } from '../haptics';
import { colors, fade, gutter, settle, typography } from '../theme';
import { Checkbox } from './Checkbox';

import type { ReactElement } from 'react';
import type { AccessibilityActionEvent } from 'react-native';
import type { Todo } from '../types';

// Fraction of the row width a swipe must pass for releasing to delete.
const DELETE_THRESHOLD = 0.35;

// How far the swipe hint slides the row to show a sliver of the delete area.
const HINT_DISTANCE = 48;

const HINT_SLIDE = { duration: 240, easing: Easing.out(Easing.cubic) };

// How long the hint holds the sliver open, so it registers before the row settles back.
const HINT_HOLD_MS = 180;

// Pause before the hint's second nudge, for anyone who missed the first.
const HINT_REPEAT_MS = 450;

// A released swipe carries the row the rest of the way off screen.
const SWIPE_OUT = { duration: 200, easing: Easing.out(Easing.quad) };

const TRASH_SIZE = 22;

// The trash icon grows slightly once releasing would delete.
const TRASH_ARMED_SCALE = 1.12;

const TRASH_TIMING = { duration: 140, easing: Easing.out(Easing.quad) };

const ENTERING = FadeIn.duration(fade.in);
const EXITING = FadeOut.duration(fade.out);

const ACCESSIBILITY_ACTIONS = [
  { name: 'edit', label: 'Edit' },
  { name: 'delete', label: 'Delete' },
];

type Props = {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  /** Asks to edit the task (long-press or the "Edit" accessibility action). */
  onEdit: (id: number, title: string) => void;
  /** Called when the user starts swiping this row. */
  onSwipe: () => void;
  /** Changing this to a new number plays the swipe hint; `null` means no hint. */
  hintKey: number | null;
  /** Read on mount: whether the row fades in (a new task) or just appears (launch, scrolling). */
  animateIn: boolean;
  /** The form that replaces the title while this task is edited; `null` otherwise. */
  editor: ReactElement | null;
};

export const TodoRow = memo(function TodoRow({
  todo,
  onToggle,
  onDelete,
  onEdit,
  onSwipe,
  hintKey,
  animateIn,
  editor,
}: Props) {
  const editing = editor !== null;
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
      withDelay(HINT_HOLD_MS, withSpring(0, settle)),
      withDelay(HINT_REPEAT_MS, withTiming(-HINT_DISTANCE, HINT_SLIDE)),
      withDelay(HINT_HOLD_MS, withSpring(0, settle)),
    );
  }, [hintKey, offset]);

  const pan = usePanGesture({
    // Horizontal intent activates; vertical movement first hands the touch to the list.
    activeOffsetX: [-12, 12],
    failOffsetY: [-10, 10],
    enabled: !editing,
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
        offset.value = withTiming(-width, SWIPE_OUT, (finished) => {
          if (finished) scheduleOnRN(onDelete, todo.id);
        });

        return;
      }

      armed.value = false;
      offset.value = withSpring(0, settle);
    },
  });

  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  // Hidden at rest so fades and layout moves never flash red behind the row.
  const underlayStyle = useAnimatedStyle(() => ({ opacity: offset.value < 0 ? 1 : 0 }));

  const trashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(armed.value ? TRASH_ARMED_SCALE : 1, TRASH_TIMING) }],
  }));

  function toggle() {
    tapHaptic();
    onToggle(todo.id);
  }

  function edit() {
    onEdit(todo.id, todo.title);
  }

  // A long press only opens the form once the finger lifts. Swapping the title for the input
  // mid-touch would unmount the view under the finger, so React Native never sees the touch end
  // and keeps a stale responder that swallows the next tap (such as on the tick button).
  const longPressed = useRef(false);

  function onLongPress() {
    longPressed.current = true;
    tapHaptic();
  }

  function onTouchEnd() {
    if (!longPressed.current) return;

    longPressed.current = false;
    edit();
  }

  // A scroll or swipe that takes over after the long press cancels it.
  function onTouchCancel() {
    longPressed.current = false;
  }

  function handleAccessibilityAction(event: AccessibilityActionEvent) {
    switch (event.nativeEvent.actionName) {
      case 'edit':
        edit();
        break;
      case 'delete':
        onDelete(todo.id);
        break;
    }
  }

  return (
    <Animated.View entering={animateIn ? ENTERING : undefined} exiting={EXITING}>
      <Animated.View style={[styles.underlay, underlayStyle]}>
        <Animated.View style={trashStyle}>
          <TrashIcon />
        </Animated.View>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={slideStyle}>
          {/* While editing, the form replaces the row, so tapping can't toggle the task. */}
          {editing ? (
            editor
          ) : (
            <Pressable
              onPress={toggle}
              onLongPress={onLongPress}
              onTouchEnd={onTouchEnd}
              onTouchCancel={onTouchCancel}
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
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
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
