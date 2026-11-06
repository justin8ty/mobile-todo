import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gutter, typography } from '../theme';

import type { Todo } from '../types';

type Props = { todos: Todo[] };

/** `null` hides the badge: there is nothing to count. */
function badgeLabel(todos: Todo[]): string | null {
  if (todos.length === 0) return null;

  const left = todos.filter((todo) => !todo.completed).length;

  return left === 0 ? 'ALL DONE' : `${left} LEFT`;
}

export function Header({ todos }: Props) {
  const insets = useSafeAreaInsets();
  const badge = badgeLabel(todos);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.kicker}>JUSTNAIK</Text>
      <View style={styles.titleLine}>
        <Text style={styles.title} accessibilityRole="header">
          Todo
        </Text>
        {badge !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: gutter,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  kicker: {
    ...typography.kicker,
    color: colors.brand,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    ...typography.title,
    color: colors.ink,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.signal,
  },
  badgeText: {
    ...typography.badge,
    color: colors.ink,
  },
});
