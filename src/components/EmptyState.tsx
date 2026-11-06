import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

/** Rendered as the list's `ListEmptyComponent`, so pull-to-refresh still works when empty. */
export function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>No tasks</Text>
      <Text style={styles.hint}>Tap + to add one</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 64,
  },
  heading: {
    ...typography.heading,
    color: colors.ink,
  },
  hint: {
    ...typography.body,
    marginTop: 6,
    color: colors.subtle,
  },
});
