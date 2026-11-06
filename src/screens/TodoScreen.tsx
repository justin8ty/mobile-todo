import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Header } from '../components/Header';
import { LoadingState } from '../components/LoadingState';
import { Snackbar } from '../components/Snackbar';
import { TodoRow } from '../components/TodoRow';
import { useSnackbar } from '../hooks/useSnackbar';
import { useTodos } from '../hooks/useTodos';
import { colors } from '../theme';

import type { ReactNode } from 'react';
import type { ListRenderItem } from 'react-native';
import type { Todo } from '../types';

const NO_TODOS: Todo[] = [];

// Gap between the bottom controls and the safe-area edge or keyboard.
const BOTTOM_GAP = 16;

function keyOf(todo: Todo): string {
  return String(todo.id);
}

export function TodoScreen() {
  const { state, retry, toggleTodo, deleteTodo, restoreTodo } = useTodos();
  const snackbar = useSnackbar();
  const insets = useSafeAreaInsets();
  const keyboard = useReanimatedKeyboardAnimation();
  const onRetry = useCallback(() => void retry(), [retry]);

  const { show } = snackbar;

  const onDelete = useCallback(
    (id: number) => {
      const removed = deleteTodo(id);

      if (removed === null) return;

      // A newer delete replaces this message, so only the latest deletion can be undone.
      show('Task deleted', {
        label: 'UNDO',
        onPress: () => restoreTodo(removed),
      });
    },
    [deleteTodo, restoreTodo, show],
  );

  const renderTodo: ListRenderItem<Todo> = useCallback(
    ({ item }) => <TodoRow todo={item} onToggle={toggleTodo} onDelete={onDelete} />,
    [toggleTodo, onDelete],
  );

  // Keyboard height is negative while open; the safe-area inset is already below the keyboard.
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.min(0, keyboard.height.value + insets.bottom) }],
  }));

  let body: ReactNode;

  switch (state.status) {
    case 'loading':
      body = <LoadingState />;
      break;
    case 'error':
      body = <ErrorState message={state.message} onRetry={onRetry} />;
      break;
    case 'ready':
      body = (
        <FlatList
          data={state.todos}
          keyExtractor={keyOf}
          renderItem={renderTodo}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        />
      );
      break;
  }

  return (
    <View style={styles.screen}>
      <Header todos={state.status === 'ready' ? state.todos : NO_TODOS} />
      {body}
      <Animated.View
        style={[styles.bottom, { paddingBottom: insets.bottom + BOTTOM_GAP }, liftStyle]}
      >
        {snackbar.message !== null && (
          <Snackbar
            key={snackbar.message.id}
            message={snackbar.message}
            onAction={snackbar.pressAction}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    // Lets `EmptyState` fill the viewport and centre itself.
    flexGrow: 1,
    paddingTop: 4,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Taps between the controls reach the list underneath.
    pointerEvents: 'box-none',
  },
});
