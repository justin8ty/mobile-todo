import { StyleSheet } from 'react-native';
import Animated, { withTiming } from 'react-native-reanimated';

import { pageTiming } from '../theme';

import type { ReactNode } from 'react';
import type {
  EntryAnimationsValues,
  ExitAnimationsValues,
  SharedValue,
} from 'react-native-reanimated';

type Props = {
  /**
   * Where the next page comes from: `1` from the right (a tab further right), `-1` from the left,
   * `0` no slide. A shared value rather than a prop: the leaving page reads it as it unmounts,
   * after its props were last rendered.
   */
  direction: SharedValue<number>;
  children: ReactNode;
};

/**
 * One filter's list. Keyed by filter, so changing filters swaps pages: the old one slides out
 * as the new one slides in, like a pager.
 */
export function FilterPage({ direction, children }: Props) {
  const entering = (values: EntryAnimationsValues) => {
    'worklet';

    return {
      initialValues: { transform: [{ translateX: direction.value * values.targetWidth }] },
      animations: { transform: [{ translateX: withTiming(0, pageTiming) }] },
    };
  };

  const exiting = (values: ExitAnimationsValues) => {
    'worklet';

    return {
      initialValues: { transform: [{ translateX: 0 }] },
      animations: {
        transform: [{ translateX: withTiming(-direction.value * values.currentWidth, pageTiming) }],
      },
    };
  };

  return (
    <Animated.View style={styles.page} entering={entering} exiting={exiting}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
});
