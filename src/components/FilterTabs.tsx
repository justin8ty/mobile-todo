import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, pageTiming, typography } from '../theme';

import type { LayoutChangeEvent, LayoutRectangle } from 'react-native';

export type Filter = 'all' | 'active' | 'done';

/** Tab order, left to right. Pages slide in the direction of this order. */
export const FILTERS: readonly Filter[] = ['all', 'active', 'done'];

// Lets the first tab's label line up with the title while keeping a 48dp target.
const TAB_PADDING = 10;

const INDICATOR_HEIGHT = 2;

// Distance from the tab's bottom edge to the indicator, and from the indicator to the label.
const INDICATOR_INSET = 10;
const INDICATOR_GAP = 5;

// Trailing letter spacing would push the indicator past the last letter.
const LABEL_SPACING = typography.kicker.letterSpacing;

type Props = {
  selected: Filter;
  onSelect: (filter: Filter) => void;
};

export function FilterTabs({ selected, onSelect }: Props) {
  const selectedIndex = FILTERS.indexOf(selected);
  const layouts = useRef<(LayoutRectangle | undefined)[]>([]);
  const placed = useRef(false);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  /** Slides the indicator under tab `index`; the first placement doesn't animate. */
  const moveIndicator = useCallback(
    (index: number) => {
      const layout = layouts.current[index];

      if (layout === undefined) return;

      const x = layout.x + TAB_PADDING;
      const width = layout.width - TAB_PADDING * 2 - LABEL_SPACING;

      if (!placed.current) {
        placed.current = true;
        indicatorX.value = x;
        indicatorWidth.value = width;

        return;
      }

      indicatorX.value = withTiming(x, pageTiming);
      indicatorWidth.value = withTiming(width, pageTiming);
    },
    [indicatorX, indicatorWidth],
  );

  useEffect(() => {
    moveIndicator(selectedIndex);
  }, [selectedIndex, moveIndicator]);

  function onTabLayout(index: number, event: LayoutChangeEvent) {
    layouts.current[index] = event.nativeEvent.layout;

    if (index === selectedIndex) moveIndicator(index);
  }

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {FILTERS.map((filter, index) => {
        const isSelected = filter === selected;

        return (
          <Pressable
            key={filter}
            onPress={() => onSelect(filter)}
            onLayout={(event) => onTabLayout(index, event)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {filter.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
      <Animated.View style={[styles.indicator, indicatorStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: -TAB_PADDING,
  },
  tab: {
    minWidth: 48,
    minHeight: 48,
    // Labels sit on a shared baseline above the indicator, whatever the font scale.
    justifyContent: 'flex-end',
    paddingHorizontal: TAB_PADDING,
    paddingBottom: INDICATOR_INSET + INDICATOR_HEIGHT + INDICATOR_GAP,
  },
  pressed: {
    opacity: 0.55,
  },
  label: {
    ...typography.kicker,
    color: colors.muted,
  },
  labelSelected: {
    color: colors.ink,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: INDICATOR_INSET,
    height: INDICATOR_HEIGHT,
    backgroundColor: colors.signal,
  },
});
