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
  // Pressed background for full-width rows.
  wash: '#F3F4F8',
  // Fill for a disabled button that must still read as a button on white.
  inactive: '#E3E6EE',
  // Text on the `brand` header band.
  onBrand: '#FFFFFF',
} as const;

/**
 * Corner radii, by role. Nested shapes follow the outer radius minus the inset between them
 * (the filter track's 16 less its 4px padding gives the pill's 12).
 */
export const radius = {
  /** Small marks: checkboxes, the count badge. */
  mark: 6,
  /** Controls inside a surface: the filter pill, text buttons. */
  control: 12,
  /** Surfaces floating over the list: the + button, filter track, snackbar. */
  float: 16,
  /** The header band's lower corners. */
  band: 24,
} as const;

export const shadows = {
  /** Anything floating over the list, and the header band once the list scrolls beneath it. */
  float: '0 6px 16px rgba(15, 23, 54, 0.14)',
  /** Something resting on a surface, like the filter pill in its track. */
  rest: '0 1px 3px rgba(15, 23, 54, 0.12)',
} as const;

// Horizontal inset shared by the header and rows, so checkboxes line up under the title.
export const gutter = 24;

/**
 * Motion is brief and never overshoots, so it confirms an action without drawing the eye.
 *
 * `settle` is a critically damped spring for things moving into place: rows sliding, a swiped row
 * returning, the list after a pull, the filter pill. Its duration is perceptual; the last pixel or
 * two take about half as long again.
 */
export const settle = { duration: 260, dampingRatio: 1 } as const;

/** Fades for things appearing or leaving in place. Leaving is quicker: it's already been seen. */
export const fade = { in: 180, out: 140 } as const;

// Family names registered by `useFonts` from @expo-google-fonts/overpass.
export const fonts = {
  regular: 'Overpass_400Regular',
  semibold: 'Overpass_600SemiBold',
  extrabold: 'Overpass_800ExtraBold',
} as const;

export const typography = {
  title: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38 },
  row: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  segment: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  badge: {
    fontFamily: fonts.extrabold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  // State screens (loading, error, empty) and text buttons.
  heading: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  action: { fontFamily: fonts.extrabold, fontSize: 14, lineHeight: 18, letterSpacing: 14 * 0.08 },
} as const satisfies Record<string, TextStyle>;
