import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureDetector, ScrollView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { thresholdHaptic } from '../haptics';
import { colors, settle } from '../theme';

import type { Ref } from 'react';
import type {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
} from 'react-native';
import type { FlatListPropsWithLayout } from 'react-native-reanimated';

// Where the list rests while refreshing, showing the spinner above it.
const REFRESH_HOLD = 64;

// How far the list must be pulled down (after resistance) for releasing to refresh.
const REFRESH_THRESHOLD = 80;

/**
 * iOS's rubber band: the further past the edge, the less the list follows the finger.
 * `dimension` is the viewport height, which bounds how far it can ever go.
 */
function rubberBand(distance: number, dimension: number): number {
  'worklet';

  if (dimension <= 0) return 0;

  const resisted = (1 - 1 / ((Math.abs(distance) * 0.55) / dimension + 1)) * dimension;

  return Math.sign(distance) * resisted;
}

type Props<T> = Omit<
  FlatListPropsWithLayout<T>,
  | 'refreshControl'
  | 'renderScrollComponent'
  | 'overScrollMode'
  | 'onScroll'
  | 'onLayout'
  | 'onContentSizeChange'
> & {
  ref?: Ref<FlatList>;
  /** Shows the spinner and holds the list below it. */
  refreshing: boolean;
  /** Called when the list is pulled down past the threshold and released. */
  onRefresh: () => void;
};

/**
 * `Animated.FlatList` with an iOS-style bounce: dragged past either end, the list follows the finger
 * with growing resistance and springs back on release. Pulling down far enough at the top
 * refreshes, with the spinner shown above the list (Android's `RefreshControl` claims that edge,
 * so it's replaced).
 *
 * A vertical pan runs alongside the native scroll and only moves the list while it's at an edge.
 */
export function BounceList<T>({ ref, refreshing, onRefresh, ...listProps }: Props<T>) {
  const scrollY = useSharedValue(0);
  const maxScroll = useSharedValue(0);
  const viewportHeight = useSharedValue(0);

  // Finger travel past the edge: positive past the top, negative past the bottom.
  const pull = useSharedValue(0);
  const lastTranslation = useSharedValue(0);
  const dragging = useSharedValue(false);
  const armed = useSharedValue(false);
  const isRefreshing = useSharedValue(refreshing);
  // The list's vertical offset: where it rests plus the rubber-banded pull.
  const offset = useSharedValue(refreshing ? REFRESH_HOLD : 0);

  useEffect(() => {
    isRefreshing.value = refreshing;

    if (!dragging.value) offset.value = withSpring(refreshing ? REFRESH_HOLD : 0, settle);
  }, [refreshing, isRefreshing, dragging, offset]);

  const pan = usePanGesture({
    // Vertical drags only; horizontal ones are a row's swipe-to-delete.
    activeOffsetY: [-10, 10],
    failOffsetX: [-12, 12],
    onActivate: (event) => {
      dragging.value = true;
      lastTranslation.value = event.translationY;
    },
    onUpdate: (event) => {
      const delta = event.translationY - lastTranslation.value;

      lastTranslation.value = event.translationY;

      const atTop = scrollY.value <= 0.5;
      const atBottom = scrollY.value >= maxScroll.value - 0.5;
      let next = pull.value;

      if (next > 0 || (next === 0 && atTop && delta > 0)) next = Math.max(0, next + delta);
      else if (next < 0 || (next === 0 && atBottom && delta < 0)) next = Math.min(0, next + delta);

      pull.value = next;

      const rest = isRefreshing.value ? REFRESH_HOLD : 0;
      const stretched = rubberBand(next, viewportHeight.value);

      offset.value = rest + stretched;

      const pastThreshold = !isRefreshing.value && stretched >= REFRESH_THRESHOLD;

      if (pastThreshold !== armed.value) {
        armed.value = pastThreshold;

        if (pastThreshold) scheduleOnRN(thresholdHaptic);
      }
    },
    onDeactivate: () => {
      const refresh = armed.value;

      dragging.value = false;
      armed.value = false;
      pull.value = 0;
      offset.value = withSpring(refresh || isRefreshing.value ? REFRESH_HOLD : 0, settle);

      if (refresh) scheduleOnRN(onRefresh);
    },
  });

  // Runs alongside the pan, so scrolling and bouncing hand over without lifting the finger.
  function renderScrollComponent(props: ScrollViewProps) {
    return <ScrollView {...props} simultaneousWith={pan} />;
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    scrollY.value = contentOffset.y;
    maxScroll.value = Math.max(0, contentSize.height - layoutMeasurement.height);
  }

  function onLayout(event: LayoutChangeEvent) {
    viewportHeight.value = event.nativeEvent.layout.height;
  }

  function onContentSizeChange(_width: number, height: number) {
    maxScroll.value = Math.max(0, height - viewportHeight.value);
  }

  const listStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, REFRESH_HOLD], [0, 1], 'clamp'),
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.spinner, spinnerStyle]}>
        {/* Always spinning; its opacity follows the pull, so it fades in as the list moves down. */}
        <ActivityIndicator color={colors.brand} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.list, listStyle]} onLayout={onLayout}>
          <Animated.FlatList
            {...listProps}
            ref={ref}
            renderScrollComponent={renderScrollComponent}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onContentSizeChange={onContentSizeChange}
            // The bounce replaces Android's overscroll stretch.
            overScrollMode="never"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // A list pulled up past its end must not slide over the header.
    overflow: 'hidden',
  },
  spinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: REFRESH_HOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
});
