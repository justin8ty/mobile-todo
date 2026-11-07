import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gutter, radius, shadows, typography } from '../theme';
import { ProgressPie } from './ProgressPie';

import type { SharedValue } from 'react-native-reanimated';
import type { Todo } from '../types';

// How far the list scrolls under the band before its shadow is fully shown.
const SHADOW_SCROLL = 16;

type Props = {
  /** Every task, whatever the filter: the badge counts them all. */
  todos: Todo[];
  /** The list's scroll offset; the band casts a shadow once tasks pass beneath it. */
  scrollY: SharedValue<number>;
};

type Badge = { label: string; progress: number };

/** `null` hides the badge: there is nothing to count. */
function badgeOf(todos: Todo[]): Badge | null {
  if (todos.length === 0) return null;

  const left = todos.filter((todo) => !todo.completed).length;

  return {
    label: left === 0 ? 'ALL DONE' : `${left} LEFT`,
    progress: (todos.length - left) / todos.length,
  };
}

/** A JustNaik-blue band, like a transit sign, holding the title and the count badge. */
export function Header({ todos, scrollY }: Props) {
  const insets = useSafeAreaInsets();
  const badge = badgeOf(todos);

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, SHADOW_SCROLL], [0, 1], 'clamp'),
  }));

  return (
    <View style={styles.header}>
      {/* Sits behind the band, so only the shadow it casts below shows. */}
      <Animated.View style={[styles.shadow, shadowStyle]} />
      <View style={[styles.band, { paddingTop: insets.top + 16 }]}>
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
          <View style={styles.badge}>
            <ProgressPie progress={badge.progress} color={colors.ink} />
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    // Above the list, so the band's shadow falls on the tasks scrolling beneath it.
    zIndex: 1,
  },
  shadow: {
    ...StyleSheet.absoluteFill,
    borderBottomLeftRadius: radius.band,
    borderBottomRightRadius: radius.band,
    backgroundColor: colors.brand,
    boxShadow: shadows.float,
  },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: gutter,
    paddingBottom: 22,
    borderBottomLeftRadius: radius.band,
    borderBottomRightRadius: radius.band,
    backgroundColor: colors.brand,
  },
  title: {
    ...typography.title,
    flexShrink: 1,
    color: colors.onBrand,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.mark,
    backgroundColor: colors.signal,
  },
  badgeText: {
    ...typography.badge,
    color: colors.ink,
  },
});
