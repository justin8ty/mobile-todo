import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraftRow } from '../components/DraftRow';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { FAB_SIZE, Fab } from '../components/Fab';
import { FilterPage } from '../components/FilterPage';
import { FILTERS } from '../components/FilterTabs';
import { Header } from '../components/Header';
import { LoadingState } from '../components/LoadingState';
import { Snackbar } from '../components/Snackbar';
import { TodoRow } from '../components/TodoRow';
import { tapHaptic } from '../haptics';
import { useDraft } from '../hooks/useDraft';
import { useSnackbar } from '../hooks/useSnackbar';
import { useSwipeHint } from '../hooks/useSwipeHint';
import { useTodos } from '../hooks/useTodos';
import { colors, gutter } from '../theme';

import type { ReactElement, ReactNode } from 'react';
import type { FlatList, ListRenderItem } from 'react-native';
import type { FabMode } from '../components/Fab';
import type { Filter } from '../components/FilterTabs';
import type { Todo } from '../types';

const NO_TODOS: Todo[] = [];
const NO_IDS: ReadonlySet<number> = new Set();

// Remaining rows (and the + button, when the snackbar appears) glide into their new place.
const LAYOUT = LinearTransition.springify().damping(20).stiffness(220);

const DRAFT_IN = FadeIn.duration(180);
const DRAFT_OUT = FadeOut.duration(120);

// Gap between the bottom controls and the safe-area edge or keyboard.
const BOTTOM_GAP = 16;

function keyOf(todo: Todo): string {
  return String(todo.id);
}

function matchesFilter(todo: Todo, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'active':
      return !todo.completed;
    case 'done':
      return todo.completed;
  }
}

function emptyState(todos: Todo[], filter: Filter): ReactElement {
  if (todos.length === 0) return <EmptyState heading="No tasks" hint="Tap + to add one" />;

  // Only a filter can hide every task, and All hides none.
  return <EmptyState heading={filter === 'done' ? 'Nothing done yet' : 'Nothing left to do'} />;
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
  const { state, retry, refresh, addTodo, toggleTodo, editTodo, deleteTodo, restoreTodo } =
    useTodos();

  const snackbar = useSnackbar();
  const insets = useSafeAreaInsets();
  const keyboard = useReanimatedKeyboardAnimation();
  const onRetry = useCallback(() => void retry(), [retry]);

  const listRef = useRef<FlatList<Todo>>(null);
  const addFailedMessageId = useRef<number | null>(null);
  const undoMessageId = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  // Starts at 0 so the first page appears without sliding in.
  const pageDirection = useSharedValue(0);

  const { show, dismiss } = snackbar;

  const todos = state.status === 'ready' ? state.todos : null;

  const visibleTodos = useMemo(
    () => todos?.filter((todo) => matchesFilter(todo, filter)) ?? NO_TODOS,
    [todos, filter],
  );

  const { hint, onTaskAdded, onSwiped } = useSwipeHint(visibleTodos[0]?.id ?? null);
  // From the full list, so rows shown by switching filters appear without animating in.
  const insertedIds = useInsertedIds(todos);

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

  const draft = useDraft(addTodo, editTodo, onAdded, onAddFailed);
  const { startEdit } = draft;

  let fabMode: FabMode = 'add';

  if (draft.saving) fabMode = 'saving';
  else if (draft.target !== null) fabMode = 'confirm';

  function onFabPress() {
    if (fabMode === 'confirm') {
      draft.submit();

      return;
    }

    // The new task goes to the top of the full list, so show all of it.
    changeFilter('all');
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    draft.startNew();
  }

  function changeFilter(next: Filter) {
    if (next === filter) return;

    // Set before the swap: the leaving page reads it as it unmounts.
    pageDirection.value = Math.sign(FILTERS.indexOf(next) - FILTERS.indexOf(filter));
    setFilter(next);
  }

  function onFilterChange(next: Filter) {
    draft.dismiss();
    changeFilter(next);
  }

  const onEdit = useCallback(
    (id: number, title: string) => {
      if (startEdit(id, title)) tapHaptic();
    },
    [startEdit],
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

  const { editingId, title: draftTitle, changeTitle, submit, dismiss: dismissDraft } = draft;

  const renderTodo: ListRenderItem<Todo> = useCallback(
    ({ item }) => (
      <TodoRow
        todo={item}
        onToggle={toggleTodo}
        onDelete={onDelete}
        onEdit={onEdit}
        onSwipe={onSwiped}
        hintKey={hint?.id === item.id ? hint.key : null}
        animateIn={insertedIds.has(item.id)}
        editor={
          item.id === editingId ? (
            <DraftRow
              title={draftTitle}
              checked={item.completed}
              placeholder="Task title"
              label="Task title"
              onChangeTitle={changeTitle}
              onSubmit={submit}
              onDismiss={dismissDraft}
            />
          ) : null
        }
      />
    ),
    [
      toggleTodo,
      onDelete,
      onEdit,
      onSwiped,
      hint,
      insertedIds,
      editingId,
      draftTitle,
      changeTitle,
      submit,
      dismissDraft,
    ],
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
        <FilterPage key={filter} direction={pageDirection}>
          <Animated.FlatList
            ref={listRef}
            itemLayoutAnimation={LAYOUT}
            data={visibleTodos}
            keyExtractor={keyOf}
            renderItem={renderTodo}
            ListHeaderComponent={
              draft.target?.kind === 'new' ? (
                <Animated.View entering={DRAFT_IN} exiting={DRAFT_OUT}>
                  <DraftRow
                    title={draft.title}
                    checked={false}
                    placeholder="New task"
                    label="New task title"
                    onChangeTitle={changeTitle}
                    onSubmit={submit}
                    onDismiss={dismissDraft}
                  />
                </Animated.View>
              ) : undefined
            }
            ListEmptyComponent={emptyState(state.todos, filter)}
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
        </FilterPage>
      );
      break;
  }

  return (
    <View
      style={styles.screen}
      // Taps nothing else handles, such as on the header, dismiss the form. The list handles
      // its own taps through `keyboardShouldPersistTaps`.
      onStartShouldSetResponder={() => draft.target !== null}
      onResponderRelease={draft.dismiss}
    >
      <Header todos={todos ?? NO_TODOS} filter={filter} onFilterChange={onFilterChange} />
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
