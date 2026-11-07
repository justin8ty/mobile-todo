import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

export type Filter = 'all' | 'active' | 'done';

const TABS: { filter: Filter; label: string }[] = [
  { filter: 'all', label: 'ALL' },
  { filter: 'active', label: 'ACTIVE' },
  { filter: 'done', label: 'DONE' },
];

// Lets the first tab's label line up with the title while keeping a 48dp target.
const TAB_PADDING = 10;

type Props = {
  selected: Filter;
  onSelect: (filter: Filter) => void;
};

export function FilterTabs({ selected, onSelect }: Props) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {TABS.map(({ filter, label }) => {
        const isSelected = filter === selected;

        return (
          <Pressable
            key={filter}
            onPress={() => onSelect(filter)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
            <View style={[styles.underline, isSelected && styles.underlineSelected]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: -TAB_PADDING,
  },
  tab: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: TAB_PADDING,
  },
  pressed: {
    opacity: 0.55,
  },
  label: {
    ...typography.kicker,
    color: colors.muted,
  },
  labelSelected: {
    color: colors.ink,
  },
  underline: {
    height: 2,
    marginTop: 5,
    // Trailing letter spacing would push the underline past the last letter.
    marginRight: typography.kicker.letterSpacing,
  },
  underlineSelected: {
    backgroundColor: colors.signal,
  },
});
