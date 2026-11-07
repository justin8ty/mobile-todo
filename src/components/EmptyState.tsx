import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

type Props = {
  heading: string;
  hint?: string;
};

/** Rendered as the list's `ListEmptyComponent`, so pull-to-refresh still works when empty. */
export function EmptyState({ heading, hint }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{heading}</Text>
      {hint !== undefined && <Text style={styles.hint}>{hint}</Text>}
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
