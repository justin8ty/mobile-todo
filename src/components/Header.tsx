import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gutter, typography } from '../theme';
import { FilterTabs } from './FilterTabs';

import type { Todo } from '../types';
import type { Filter } from './FilterTabs';

type Props = {
  /** Every task, whatever the filter: the badge counts them all. */
  todos: Todo[];
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
};

/** `null` hides the badge: there is nothing to count. */
function badgeLabel(todos: Todo[]): string | null {
  if (todos.length === 0) return null;

  const left = todos.filter((todo) => !todo.completed).length;

  return left === 0 ? 'ALL DONE' : `${left} LEFT`;
}

export function Header({ todos, filter, onFilterChange }: Props) {
  const insets = useSafeAreaInsets();
  const badge = badgeLabel(todos);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
      <View style={styles.titleLine}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          // Narrow phones shrink the title rather than wrapping it under the badge.
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          JustNaik Todo
        </Text>
        {badge !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {todos.length > 0 && <FilterTabs selected={filter} onSelect={onFilterChange} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: gutter,
    // The filter tabs' 48dp targets already leave room below them.
    paddingBottom: 4,
    backgroundColor: colors.bg,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    ...typography.title,
    flexShrink: 1,
    color: colors.ink,
  },
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.signal,
  },
  badgeText: {
    ...typography.badge,
    color: colors.ink,
  },
});
