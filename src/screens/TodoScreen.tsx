import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { LinearTransition, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraftRow } from '../components/DraftRow';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { FAB_SIZE, Fab } from '../components/Fab';
import { Header } from '../components/Header';
import { LoadingState } from '../components/LoadingState';
import { Snackbar } from '../components/Snackbar';
import { TodoRow } from '../components/TodoRow';
import { useDraft } from '../hooks/useDraft';
import { useSnackbar } from '../hooks/useSnackbar';
import { useSwipeHint } from '../hooks/useSwipeHint';
import { useTodos } from '../hooks/useTodos';
import { colors, gutter } from '../theme';

import type { ReactNode } from 'react';
import type { FlatList, ListRenderItem } from 'react-native';
import type { FabMode } from '../components/Fab';
import type { Todo } from '../types';

const NO_TODOS: Todo[] = [];
const NO_IDS: ReadonlySet<number> = new Set();

// Remaining rows (and the + button, when the snackbar appears) glide into their new place.
const LAYOUT = LinearTransition.springify().damping(20).stiffness(220);

// Gap between the bottom controls and the safe-area edge or keyboard.
const BOTTOM_GAP = 16;

function keyOf(todo: Todo): string {
  return String(todo.id);
}

/**
 * IDs in `todos` that weren't in the previous list: tasks just added, restored or refreshed.
 * Only these animate in, not rows mounting at launch or as the list scrolls.
 */
function useInsertedIds(todos: Todo[] | null): ReadonlySet<number> {
  const previous = useRef<Todo[] | null>(null);

  useEffect(() => {
    previous.current = todos;
  }, [todos]);

  return useMemo(() => {
    const before = previous.current;

    if (todos === null || before === null) return NO_IDS;

    const known = new Set(before.map((todo) => todo.id));
    const inserted = new Set<number>();

    for (const todo of todos) {
      if (!known.has(todo.id)) inserted.add(todo.id);
    }

    return inserted;
  }, [todos]);
}

export function TodoScreen() {
  const { state, retry, refresh, addTodo, toggleTodo, deleteTodo, restoreTodo } = useTodos();
  const snackbar = useSnackbar();
  const insets = useSafeAreaInsets();
  const keyboard = useReanimatedKeyboardAnimation();
  const onRetry = useCallback(() => void retry(), [retry]);

  const listRef = useRef<FlatList<Todo>>(null);
  const addFailedMessageId = useRef<number | null>(null);
  const undoMessageId = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { show, dismiss } = snackbar;

  const firstId = state.status === 'ready' ? (state.todos[0]?.id ?? null) : null;
  const { hint, onTaskAdded, onSwiped } = useSwipeHint(firstId);
  const insertedIds = useInsertedIds(state.status === 'ready' ? state.todos : null);

  async function reload() {
    setRefreshing(true);

    try {
      await refresh();

      // Undo could now put back a task that duplicates one from the server.
      if (undoMessageId.current !== null) dismiss(undoMessageId.current);
    } catch {
      // RETRY reloads straight away: the user already chose to replace their changes.
      show("Couldn't refresh", { label: 'RETRY', onPress: () => void reload() });
    } finally {
      setRefreshing(false);
    }
  }

  function onPullToRefresh() {
    if (state.status !== 'ready') return;

    if (!state.hasLocalChanges) {
      void reload();

      return;
    }

    // Keep the spinner up while the user decides.
    setRefreshing(true);

    const cancel = () => setRefreshing(false);

    Alert.alert(
      'Reload tasks?',
      'This replaces your changes with the original tasks from the server.',
      [
        { text: 'Cancel', style: 'cancel', onPress: cancel },
        { text: 'Reload', style: 'destructive', onPress: () => void reload() },
      ],
      { cancelable: true, onDismiss: cancel },
    );
  }

  const onAdded = useCallback(() => {
    if (addFailedMessageId.current !== null) dismiss(addFailedMessageId.current);

    onTaskAdded();
  }, [dismiss, onTaskAdded]);

  const onAddFailed = useCallback(
    (retryAdd: () => void) => {
      addFailedMessageId.current = show("Couldn't add task", {
        label: 'RETRY',
        onPress: retryAdd,
      });
    },
    [show],
  );

  const draft = useDraft(addTodo, onAdded, onAddFailed);

  let fabMode: FabMode = 'add';

  if (draft.saving) fabMode = 'saving';
  else if (draft.open) fabMode = 'confirm';

  function onFabPress() {
    if (fabMode === 'confirm') {
      draft.submit();

      return;
    }

    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    draft.start();
  }

  const onDelete = useCallback(
    (id: number) => {
      const removed = deleteTodo(id);

      if (removed === null) return;

      // A newer delete replaces this message, so only the latest deletion can be undone.
      undoMessageId.current = show('Task deleted', {
        label: 'UNDO',
        onPress: () => restoreTodo(removed),
      });
    },
    [deleteTodo, restoreTodo, show],
  );

  const renderTodo: ListRenderItem<Todo> = useCallback(
    ({ item }) => (
      <TodoRow
        todo={item}
        onToggle={toggleTodo}
        onDelete={onDelete}
        onSwipe={onSwiped}
        hintKey={hint?.id === item.id ? hint.key : null}
        animateIn={insertedIds.has(item.id)}
      />
    ),
    [toggleTodo, onDelete, onSwiped, hint, insertedIds],
  );

  // Sits above the keyboard when open (its height is negative), else above the safe area.
  // Padding rather than a transform: touches follow layout, not transforms, so the
  // snackbar's action and the + button stay tappable while lifted.
  const liftStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(insets.bottom, -keyboard.height.value) + BOTTOM_GAP,
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
        <Animated.FlatList
          ref={listRef}
          itemLayoutAnimation={LAYOUT}
          data={state.todos}
          keyExtractor={keyOf}
          renderItem={renderTodo}
          ListHeaderComponent={
            draft.open ? (
              <DraftRow
                title={draft.title}
                onChangeTitle={draft.changeTitle}
                onSubmit={draft.submit}
                onDismiss={draft.dismiss}
              />
            ) : undefined
          }
          ListEmptyComponent={EmptyState}
          // While the form is open, a tap anywhere in the list (rows included) only dismisses it.
          keyboardShouldPersistTaps="never"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullToRefresh}
              colors={[colors.brand]}
              tintColor={colors.brand}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            // Room to scroll the last task above the + button.
            { paddingBottom: insets.bottom + BOTTOM_GAP + FAB_SIZE + 16 },
          ]}
        />
      );
      break;
  }

  return (
    <View
      style={styles.screen}
      // Taps nothing else handles, such as on the header, dismiss the form. The list handles
      // its own taps through `keyboardShouldPersistTaps`.
      onStartShouldSetResponder={() => draft.open}
      onResponderRelease={draft.dismiss}
    >
      <Header todos={state.status === 'ready' ? state.todos : NO_TODOS} />
      {body}
      <Animated.View
        style={[styles.bottom, liftStyle]}
      >
        {state.status === 'ready' && (
          <Animated.View style={styles.fab}>
            <Fab
              mode={fabMode}
              disabled={fabMode === 'confirm' && !draft.canSubmit}
              onPress={onFabPress}
            />
          </Animated.View>
        )}
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
  fab: {
    alignSelf: 'flex-end',
    marginRight: gutter,
    marginBottom: 12,
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
