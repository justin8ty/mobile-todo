import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraftRow } from '../components/DraftRow';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { FAB_SIZE, Fab } from '../components/Fab';
import { Header } from '../components/Header';
import { LoadingState } from '../components/LoadingState';
import { Snackbar } from '../components/Snackbar';
import { TodoRow } from '../components/TodoRow';
import { useSnackbar } from '../hooks/useSnackbar';
import { useTodos } from '../hooks/useTodos';
import { colors, gutter } from '../theme';

import type { ReactNode } from 'react';
import type { ListRenderItem, TextInputInstance } from 'react-native';
import type { Todo } from '../types';

const NO_TODOS: Todo[] = [];

// Gap between the bottom controls and the safe-area edge or keyboard.
const BOTTOM_GAP = 16;

function keyOf(todo: Todo): string {
  return String(todo.id);
}

export function TodoScreen() {
  const { state, retry, refresh, addTodo, toggleTodo, deleteTodo, restoreTodo } = useTodos();
  const snackbar = useSnackbar();
  const insets = useSafeAreaInsets();
  const keyboard = useReanimatedKeyboardAnimation();
  const onRetry = useCallback(() => void retry(), [retry]);

  const listRef = useRef<FlatList<Todo>>(null);
  const draftInputRef = useRef<TextInputInstance>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  // Set while the + button is held, so the input's blur doesn't close the draft first
  // (closing and reopening would make the keyboard bounce).
  const fabHeld = useRef(false);
  const addFailedMessageId = useRef<number | null>(null);
  const undoMessageId = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { show, dismiss } = snackbar;

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

  function openDraft() {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });

    if (draftOpen) draftInputRef.current?.focus();
    else setDraftOpen(true);
  }

  const closeDraftUnlessFabHeld = useCallback(() => {
    if (!fabHeld.current) setDraftOpen(false);
  }, []);

  const onAdded = useCallback(() => {
    if (addFailedMessageId.current !== null) dismiss(addFailedMessageId.current);
  }, [dismiss]);

  const onAddFailed = useCallback(
    (retryAdd: () => void) => {
      addFailedMessageId.current = show("Couldn't add task", {
        label: 'RETRY',
        onPress: retryAdd,
      });
    },
    [show],
  );

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
          ref={listRef}
          data={state.todos}
          keyExtractor={keyOf}
          renderItem={renderTodo}
          ListHeaderComponent={
            draftOpen ? (
              <DraftRow
                inputRef={draftInputRef}
                onAdd={addTodo}
                onAdded={onAdded}
                onAddFailed={onAddFailed}
                onBlurEmpty={closeDraftUnlessFabHeld}
              />
            ) : undefined
          }
          ListEmptyComponent={EmptyState}
          keyboardShouldPersistTaps="handled"
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
    <View style={styles.screen}>
      <Header todos={state.status === 'ready' ? state.todos : NO_TODOS} />
      {body}
      <Animated.View
        style={[styles.bottom, { paddingBottom: insets.bottom + BOTTOM_GAP }, liftStyle]}
      >
        {state.status === 'ready' && (
          <View style={styles.fab}>
            <Fab
              onPress={openDraft}
              onHoldChange={(held) => {
                fabHeld.current = held;
              }}
            />
          </View>
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
