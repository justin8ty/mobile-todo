import { useEffect } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { settle } from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * A wedge from 12 o'clock, clockwise, covering `fraction` of a circle of radius `r` centred on
 * (`c`, `c`).
 */
function wedge(fraction: number, c: number, r: number): string {
  'worklet';

  // An empty path; a zero-size wedge can still render a hairline.
  if (fraction <= 0.001) return `M${c} ${c}`;

  // A single arc can't close on itself, so a full circle is two half arcs.
  if (fraction >= 0.999) {
    return `M${c} ${c - r}A${r} ${r} 0 1 1 ${c} ${c + r}A${r} ${r} 0 1 1 ${c} ${c - r}Z`;
  }

  const angle = fraction * 2 * Math.PI;
  const x = c + r * Math.sin(angle);
  const y = c - r * Math.cos(angle);
  const largeArc = fraction > 0.5 ? 1 : 0;

  return `M${c} ${c}L${c} ${c - r}A${r} ${r} 0 ${largeArc} 1 ${x} ${y}Z`;
}

type Props = {
  /** Share of tasks done, from 0 to 1. */
  progress: number;
  /** Diameter; the ring and gap scale with it. */
  size: number;
  color: string;
};

/** Things-style progress pie: a ring with a wedge that fills as tasks are done. Decorative only. */
export function ProgressPie({ progress, size, color }: Props) {
  const center = size / 2;
  const ringWidth = size / 10;
  const ringRadius = center - ringWidth / 2;
  // The wedge sits inside the ring with a gap, as in Things' project pies.
  const wedgeRadius = ringRadius - ringWidth / 2 - size / 12;

  // Starts at the current value so it mounts without animating.
  const shown = useSharedValue(progress);

  useEffect(() => {
    shown.value = withSpring(progress, settle);
  }, [progress, shown]);

  const wedgeProps = useAnimatedProps(() => ({ d: wedge(shown.value, center, wedgeRadius) }));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={center}
        cy={center}
        r={ringRadius}
        stroke={color}
        strokeWidth={ringWidth}
        fill="none"
      />
      <AnimatedPath fill={color} animatedProps={wedgeProps} />
    </Svg>
  );
}
