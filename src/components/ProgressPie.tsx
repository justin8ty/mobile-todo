import { useEffect } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { settle } from '../theme';

const SIZE = 14;
const CENTER = SIZE / 2;
const RING_WIDTH = 1.5;
const RING_RADIUS = CENTER - RING_WIDTH / 2;

// The wedge sits inside the ring with a gap, as in Things' project pies.
const WEDGE_RADIUS = RING_RADIUS - RING_WIDTH / 2 - 1.25;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A wedge from 12 o'clock, clockwise, covering `fraction` of the circle. */
function wedge(fraction: number): string {
  'worklet';

  const r = WEDGE_RADIUS;

  // An empty path; a zero-size wedge can still render a hairline.
  if (fraction <= 0.001) return `M${CENTER} ${CENTER}`;

  // A single arc can't close on itself, so a full circle is two half arcs.
  if (fraction >= 0.999) {
    return `M${CENTER} ${CENTER - r}A${r} ${r} 0 1 1 ${CENTER} ${CENTER + r}A${r} ${r} 0 1 1 ${CENTER} ${CENTER - r}Z`;
  }

  const angle = fraction * 2 * Math.PI;
  const x = CENTER + r * Math.sin(angle);
  const y = CENTER - r * Math.cos(angle);
  const largeArc = fraction > 0.5 ? 1 : 0;

  return `M${CENTER} ${CENTER}L${CENTER} ${CENTER - r}A${r} ${r} 0 ${largeArc} 1 ${x} ${y}Z`;
}

type Props = {
  /** Share of tasks done, from 0 to 1. */
  progress: number;
  color: string;
};

/** Things-style progress pie: a ring with a wedge that fills as tasks are done. Decorative only. */
export function ProgressPie({ progress, color }: Props) {
  // Starts at the current value so it mounts without animating.
  const shown = useSharedValue(progress);

  useEffect(() => {
    shown.value = withSpring(progress, settle);
  }, [progress, shown]);

  const wedgeProps = useAnimatedProps(() => ({ d: wedge(shown.value) }));

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={RING_RADIUS}
        stroke={color}
        strokeWidth={RING_WIDTH}
        fill="none"
      />
      <AnimatedPath fill={color} animatedProps={wedgeProps} />
    </Svg>
  );
}
