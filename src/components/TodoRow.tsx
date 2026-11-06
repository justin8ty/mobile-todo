import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, gutter, typography } from '../theme';
import { Checkbox } from './Checkbox';

import type { Todo } from '../types';

type Props = { todo: Todo };

export const TodoRow = memo(function TodoRow({ todo }: Props) {
  return (
    <View style={styles.row}>
      <Checkbox checked={todo.completed} />
      <Text style={[styles.title, todo.completed && styles.completed]}>{todo.title}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    minHeight: 50,
    paddingHorizontal: gutter,
    paddingVertical: 14,
  },
  title: {
    ...typography.row,
    flex: 1,
    color: colors.ink,
  },
  completed: {
    color: colors.muted,
  },
});
