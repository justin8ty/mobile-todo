import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../theme';

const SIZE = 22;

// Length of the check path below, so the dash offset can draw it in from its start.
const CHECK_LENGTH = 13.1;

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = { checked: boolean; pressed?: boolean };

/** Visual only; the row owns the press target and accessibility state. */
export function Checkbox({ checked, pressed = false }: Props) {
  // Starts at the current value so rows mount without animating.
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, {
      duration: checked ? 260 : 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [checked, progress]);

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed ? 0.86 : 1, { damping: 14, stiffness: 400 }) }],
  }));

  const fillStyle = useAnimatedStyle(() => ({ opacity: Math.min(progress.value * 2, 1) }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - progress.value),
    // A fully hidden dash can still leave a round-cap dot behind.
    strokeOpacity: progress.value > 0 ? 1 : 0,
  }));

  return (
    <Animated.View style={[styles.box, boxStyle]}>
      <View style={[StyleSheet.absoluteFill, styles.border]} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.fill, fillStyle]} />
      <Svg width={SIZE} height={SIZE} viewBox="0 0 22 22" style={StyleSheet.absoluteFill}>
        <AnimatedPath
          d="M6.5 11.5l3 3 6-6.5"
          stroke={colors.bg}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_LENGTH}
          fill="none"
          animatedProps={checkProps}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SIZE,
    height: SIZE,
  },
  border: {
    borderRadius: 6,
    borderWidth: 2.2,
    borderColor: colors.line,
  },
  fill: {
    borderRadius: 6,
    backgroundColor: colors.brand,
  },
});
