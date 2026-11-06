import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../theme';

const SIZE = 22;

type Props = { checked: boolean };

/** Visual only; the row owns the press target and accessibility state. */
export function Checkbox({ checked }: Props) {
  return (
    <View style={[styles.box, checked && styles.checked]}>
      {checked && (
        <Svg width={SIZE} height={SIZE} viewBox="0 0 22 22" style={StyleSheet.absoluteFill}>
          <Path
            d="M6.5 11.5l3 3 6-6.5"
            stroke={colors.bg}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SIZE,
    height: SIZE,
    borderRadius: 6,
    borderWidth: 2.2,
    borderColor: colors.line,
  },
  checked: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
});
