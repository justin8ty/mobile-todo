import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gutter, radius, typography } from '../theme';
import { ProgressPie } from './ProgressPie';

import type { SharedValue } from 'react-native-reanimated';
import type { Todo } from '../types';

// How far the list scrolls under the header before its edge is fully shown.
const EDGE_SCROLL = 16;

// Overpass sets capitals and figures 0.1em above the middle of the line box (ascender 1766,
// descender 766, cap height 1400, per 2000 units). The badge is centred on its own figures, so it
// looks evenly padded, and lined up with the title's capitals rather than its line box.
const BADGE_CAP_LIFT = typography.badge.fontSize * 0.1;
const TITLE_CAP_LIFT = typography.title.fontSize * 0.1;

// The pie matches the cap height, so it reads like a glyph beside the count.
const PIE_SIZE = Math.round(typography.badge.fontSize * 0.7);

const BADGE_PADDING = 6;

type Props = {
  /** Every task, whatever the filter: the badge counts them all. */
  todos: Todo[];
  /** The list's scroll offset; the header shows an edge once tasks pass beneath it. */
  scrollY: SharedValue<number>;
};

type Badge = { label: string; spoken: string; progress: number };

/** `null` hides the badge: there is nothing to count. */
function badgeOf(todos: Todo[]): Badge | null {
  if (todos.length === 0) return null;

  const left = todos.filter((todo) => !todo.completed).length;
  const progress = (todos.length - left) / todos.length;

  if (left === 0) return { label: 'DONE', spoken: 'All tasks done', progress };

  return { label: String(left), spoken: `${left} ${left === 1 ? 'task' : 'tasks'} left`, progress };
}

export function Header({ todos, scrollY }: Props) {
  const insets = useSafeAreaInsets();
  const badge = badgeOf(todos);

  const edgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, EDGE_SCROLL], [0, 1], 'clamp'),
  }));

  return (
    <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
      <View style={styles.titleLine}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          // Narrow phones shrink the title rather than wrapping it under the badge.
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          JustNaik Todo
        </Text>
        {badge !== null && (
          <View style={styles.badge} accessible accessibilityLabel={badge.spoken}>
            <View style={styles.pie}>
              <ProgressPie progress={badge.progress} size={PIE_SIZE} color={colors.ink} />
            </View>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        )}
      </View>
      <Animated.View style={[styles.edge, edgeStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: gutter,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    ...typography.title,
    flexShrink: 1,
    color: colors.ink,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    // Less padding below than above centres the badge on the figures, which sit high.
    paddingTop: BADGE_PADDING,
    paddingBottom: BADGE_PADDING - BADGE_CAP_LIFT * 2,
    // Lifts the badge in the title line's centring, so it centres on the title's capitals.
    marginBottom: TITLE_CAP_LIFT * 2,
    borderRadius: radius.mark,
    backgroundColor: colors.signal,
  },
  // Level with the figures rather than the middle of their line box.
  pie: {
    transform: [{ translateY: -BADGE_CAP_LIFT }],
  },
  badgeText: {
    ...typography.badge,
    color: colors.ink,
  },
  // Appears once tasks scroll beneath the header, marking where the list is cut off.
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
});
