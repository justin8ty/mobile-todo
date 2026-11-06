import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { tapHaptic } from '../haptics';
import { colors, gutter, typography } from '../theme';
import { Checkbox } from './Checkbox';

import type { Todo } from '../types';

type Props = { todo: Todo; onToggle: (id: number) => void };

export const TodoRow = memo(function TodoRow({ todo, onToggle }: Props) {
  function toggle() {
    tapHaptic();
    onToggle(todo.id);
  }

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: todo.completed }}
      accessibilityLabel={todo.title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {({ pressed }) => (
        <>
          <Checkbox checked={todo.completed} pressed={pressed} />
          <Text style={[styles.title, todo.completed && styles.completed]}>{todo.title}</Text>
        </>
      )}
    </Pressable>
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
    backgroundColor: colors.bg,
  },
  pressed: {
    backgroundColor: colors.wash,
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
