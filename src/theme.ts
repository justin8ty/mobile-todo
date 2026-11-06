import type { TextStyle } from 'react-native';

export const colors = {
  bg: '#FFFFFF',
  ink: '#0F1736',
  brand: '#234197',
  signal: '#FCEC64',
  // Secondary copy (hints, error detail). `muted` is too faint for text that must be read.
  subtle: '#5E6479',
  muted: '#A3A9BB',
  line: '#C3C9DA',
  danger: '#D93A3A',
} as const;

// Horizontal inset shared by the header and rows, so checkboxes line up under the title.
export const gutter = 24;

// Family names registered by `useFonts` from @expo-google-fonts/overpass.
export const fonts = {
  regular: 'Overpass_400Regular',
  semibold: 'Overpass_600SemiBold',
  extrabold: 'Overpass_800ExtraBold',
} as const;

export const typography = {
  kicker: { fontFamily: fonts.extrabold, fontSize: 12, lineHeight: 16, letterSpacing: 12 * 0.14 },
  title: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 46 },
  row: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  badge: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  // State screens (loading, error, empty) and text buttons.
  heading: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  action: { fontFamily: fonts.extrabold, fontSize: 14, lineHeight: 18, letterSpacing: 14 * 0.08 },
} as const satisfies Record<string, TextStyle>;
