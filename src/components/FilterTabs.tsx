import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, pageTiming, typography } from '../theme';

import type { LayoutChangeEvent } from 'react-native';

export type Filter = 'all' | 'active' | 'done';

/** Segment order, left to right. Pages slide in the direction of this order. */
export const FILTERS: readonly Filter[] = ['all', 'active', 'done'];

const LABELS: Record<Filter, string> = {
  all: 'All',
  active: 'Active',
  done: 'Done',
};

// Inset between the track and the sliding pill.
const TRACK_PADDING = 4;

// With the track's padding, the control matches the + button's 56dp height.
const SEGMENT_HEIGHT = 48;

type Props = {
  selected: Filter;
  onSelect: (filter: Filter) => void;
};

/** A segmented control beside the + button; the selected segment's pill slides with the list's pages. */
export function FilterTabs({ selected, onSelect }: Props) {
  const selectedIndex = FILTERS.indexOf(selected);
  const segmentWidth = useSharedValue(0);
  // Animated position of the pill, in segments.
  const position = useSharedValue(selectedIndex);

  useEffect(() => {
    position.value = withTiming(selectedIndex, pageTiming);
  }, [selectedIndex, position]);

  function onTrackLayout(event: LayoutChangeEvent) {
    segmentWidth.value = (event.nativeEvent.layout.width - TRACK_PADDING * 2) / FILTERS.length;
  }

  const pillStyle = useAnimatedStyle(() => ({
    width: segmentWidth.value,
    transform: [{ translateX: position.value * segmentWidth.value }],
  }));

  return (
    <View style={styles.track} onLayout={onTrackLayout} accessibilityRole="tablist">
      <Animated.View style={[styles.pill, pillStyle]} />
      {FILTERS.map((filter) => {
        const isSelected = filter === selected;

        return (
          <Pressable
            key={filter}
            onPress={() => onSelect(filter)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={styles.segment}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.label,
                  isSelected && styles.labelSelected,
                  pressed && !isSelected && styles.labelPressed,
                ]}
              >
                {LABELS[filter]}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: TRACK_PADDING,
    borderRadius: 16,
    backgroundColor: colors.wash,
    // Floats over the list like the + button.
    boxShadow: '0 6px 16px rgba(15, 23, 54, 0.12)',
  },
  pill: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: 12,
    backgroundColor: colors.bg,
    boxShadow: '0 1px 3px rgba(15, 23, 54, 0.12)',
  },
  segment: {
    flex: 1,
    height: SEGMENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.segment,
    color: colors.subtle,
  },
  labelSelected: {
    color: colors.ink,
  },
  labelPressed: {
    opacity: 0.55,
  },
});
