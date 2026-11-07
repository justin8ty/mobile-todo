import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, settle, typography } from '../theme';

import type { LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

export type Filter = 'all' | 'active' | 'done';

/** Segment order, left to right. */
const FILTERS: readonly Filter[] = ['all', 'active', 'done'];

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

/**
 * A segmented control beside the + button; a pill slides to the selected segment.
 *
 * The pill and label colours run on the UI thread from the moment of the tap, rather than after
 * React renders the new list, which takes a noticeable moment.
 */
export function FilterTabs({ selected, onSelect }: Props) {
  const selectedIndex = FILTERS.indexOf(selected);
  const segmentWidth = useSharedValue(0);
  // Animated position of the pill, in segments.
  const position = useSharedValue(selectedIndex);
  // The segment the pill is heading to, so a selection it already started for isn't restarted.
  const target = useRef(selectedIndex);

  function moveTo(index: number) {
    if (index === target.current) return;

    target.current = index;
    position.value = withSpring(index, settle);
  }

  // Selections made elsewhere, such as the + button switching to All.
  useEffect(() => {
    moveTo(selectedIndex);
  });

  function select(index: number) {
    moveTo(index);
    onSelect(FILTERS[index]);
  }

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
      {FILTERS.map((filter, index) => (
        <Segment
          key={filter}
          label={LABELS[filter]}
          index={index}
          selected={index === selectedIndex}
          position={position}
          onPress={select}
        />
      ))}
    </View>
  );
}

type SegmentProps = {
  label: string;
  index: number;
  selected: boolean;
  /** The pill's animated position, in segments. */
  position: SharedValue<number>;
  onPress: (index: number) => void;
};

function Segment({ label, index, selected, position, onPress }: SegmentProps) {
  // Turns `ink` as the pill arrives and `subtle` as it leaves.
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      Math.min(Math.abs(position.value - index), 1),
      [0, 1],
      [colors.ink, colors.subtle],
    ),
  }));

  return (
    <Pressable
      onPress={() => onPress(index)}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      style={styles.segment}
    >
      {({ pressed }) => (
        <Animated.Text style={[styles.label, labelStyle, pressed && !selected && styles.labelPressed]}>
          {label}
        </Animated.Text>
      )}
    </Pressable>
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
  },
  labelPressed: {
    opacity: 0.55,
  },
});
