import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Header } from '../components/Header';
import { LoadingState } from '../components/LoadingState';
import { TodoRow } from '../components/TodoRow';
import { useTodos } from '../hooks/useTodos';
import { colors } from '../theme';

import type { ReactNode } from 'react';
import type { ListRenderItem } from 'react-native';
import type { Todo } from '../types';

const NO_TODOS: Todo[] = [];

function keyOf(todo: Todo): string {
  return String(todo.id);
}

export function TodoScreen() {
  const { state, retry, toggleTodo } = useTodos();
  const insets = useSafeAreaInsets();
  const onRetry = useCallback(() => void retry(), [retry]);

  const renderTodo: ListRenderItem<Todo> = useCallback(
    ({ item }) => <TodoRow todo={item} onToggle={toggleTodo} />,
    [toggleTodo],
  );

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
});
