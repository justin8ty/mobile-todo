import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

export function LoadingState() {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.label}>Loading tasks…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    // Sit slightly above true centre; the header already weighs down the top.
    paddingBottom: 64,
  },
  label: {
    ...typography.body,
    color: colors.subtle,
  },
});
