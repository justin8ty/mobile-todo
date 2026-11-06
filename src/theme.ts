import type { TextStyle } from 'react-native';

export const colors = {
  bg: '#FFFFFF',
  ink: '#0F1736',
  brand: '#234197',
  signal: '#FCEC64',
  muted: '#A3A9BB',
  line: '#C3C9DA',
  danger: '#D93A3A',
} as const;

// Family names registered by `useFonts` from @expo-google-fonts/overpass.
export const fonts = {
  regular: 'Overpass_400Regular',
  semibold: 'Overpass_600SemiBold',
  extrabold: 'Overpass_800ExtraBold',
} as const;

export const typography = {
  kicker: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 12 * 0.14 },
  title: { fontFamily: fonts.extrabold, fontSize: 40 },
  row: { fontFamily: fonts.regular, fontSize: 16 },
  badge: { fontFamily: fonts.semibold, fontSize: 13, fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;
