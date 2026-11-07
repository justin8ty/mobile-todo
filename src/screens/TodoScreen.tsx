import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BounceList } from '../components/BounceList';
import { DraftRow } from '../components/DraftRow';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { FAB_SIZE, Fab } from '../components/Fab';
import { FilterTabs } from '../components/FilterTabs';
import { Header } from '../components/Header';
import { LoadingState } from '../components/LoadingState';
import { Snackbar } from '../components/Snackbar';
import { TodoRow } from '../components/TodoRow';
import { useDraft } from '../hooks/useDraft';
import { useSnackbar } from '../hooks/useSnackbar';
import { useKeyboardReveal } from '../hooks/useKeyboardReveal';
import { useSwipeHint } from '../hooks/useSwipeHint';
import { useTodos } from '../hooks/useTodos';
import { colors, fade, gutter, settle } from '../theme';

import type { ReactElement, ReactNode } from 'react';
import type { FlatList, ListRenderItem, ViewInstance } from 'react-native';
import type { FabMode } from '../components/Fab';
import type { Filter } from '../components/FilterTabs';
import type { Todo } from '../types';

const NO_TODOS: Todo[] = [];
const NO_IDS: ReadonlySet<number> = new Set();

// Remaining rows glide into their new place.
const LAYOUT = LinearTransition.springify(settle.duration).dampingRatio(settle.dampingRatio);

const APPEAR = FadeIn.duration(fade.in);
const DISAPPEAR = FadeOut.duration(fade.out);

// Gap between the bottom controls and the safe-area edge or keyboard.
const BOTTOM_GAP = 16;

// How far above the bottom controls the list starts fading into white.
const FADE_HEIGHT = 32;

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
 * IDs in `todos` that weren't in the previous list: tasks just restored, refreshed or added.
 * Only these animate in, not rows mounting at launch or as the list scrolls.
 *
 * A task added from the draft row is left out. The draft closes in the same render the task
 * appears at the top, in the draft's place, so the task is already on screen.
 */
function useInsertedIds(todos: Todo[] | null, draftOpen: boolean): ReadonlySet<number> {
  const previous = useRef({ todos, draftOpen });

  useEffect(() => {
    previous.current = { todos, draftOpen };
  }, [todos, draftOpen]);

  return useMemo(() => {
    const before = previous.current;

    if (todos === null || before.todos === null) return NO_IDS;

    const known = new Set(before.todos.map((todo) => todo.id));
    const inserted = new Set<number>();

    for (const todo of todos) {
      if (!known.has(todo.id)) inserted.add(todo.id);
    }

    if (before.draftOpen && !draftOpen && todos.length > 0) inserted.delete(todos[0].id);

    return inserted;
  }, [todos, draftOpen]);
}

export function TodoScreen() {
  const {
    state,
    retry,
    refresh,
    prepareAdd,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    restoreTodo,
  } = useTodos();

  const snackbar = useSnackbar();
  const insets = useSafeAreaInsets();
  const keyboard = useReanimatedKeyboardAnimation();
  const listScrollY = useSharedValue(0);
  const onRetry = useCallback(() => void retry(), [retry]);

  const listRef = useRef<FlatList<Todo>>(null);
  // The open form's row and the bottom bar: a form must stay above the bar and its fade.
  const formRef = useRef<ViewInstance>(null);
  const barRef = useRef<ViewInstance>(null);
  const keyboardHeight = useKeyboardReveal(listRef, listScrollY, formRef, barRef, FADE_HEIGHT);
  const addFailedMessageId = useRef<number | null>(null);
  const undoMessageId = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const { show, dismiss } = snackbar;

  const todos = state.status === 'ready' ? state.todos : null;

  const visibleTodos = useMemo(
    () => todos?.filter((todo) => matchesFilter(todo, filter)) ?? NO_TODOS,
    [todos, filter],
  );

  const { hint, onTaskAdded, onSwiped } = useSwipeHint(visibleTodos[0]?.id ?? null);

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
  const newDraftOpen = draft.target?.kind === 'new';

  // From the full list, so rows shown by switching filters appear without animating in.
  const insertedIds = useInsertedIds(todos, newDraftOpen);

  let fabMode: FabMode = 'add';

  if (draft.saving) fabMode = 'saving';
  else if (draft.target !== null) fabMode = 'confirm';

  function onFabPress() {
    if (fabMode === 'confirm') {
      draft.submit();

      return;
    }

    // The new task goes to the top of the full list, so show all of it.
    setFilter('all');
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    draft.startNew();
    // Connects while the user types, so the tick only waits for the server.
    prepareAdd();
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

  const { editingId, title: draftTitle, changeTitle, submit, dismiss: dismissDraft } = draft;

  const renderTodo: ListRenderItem<Todo> = useCallback(
    ({ item }) => (
      <TodoRow
        todo={item}
        onToggle={toggleTodo}
        onDelete={onDelete}
        onEdit={startEdit}
        onSwipe={onSwiped}
        hintKey={hint?.id === item.id ? hint.key : null}
        animateIn={insertedIds.has(item.id)}
        editor={
          item.id === editingId ? (
            <DraftRow
              ref={formRef}
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
      startEdit,
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

  // Behind the bottom controls: white below their top edge, fading out above it, so tasks slip
  // under the controls rather than run into them. Tall enough to reach the screen's bottom edge,
  // and moved up with the keyboard (a transform is fine here: it takes no touches).
  const fadeHeight = insets.bottom + BOTTOM_GAP + FAB_SIZE + FADE_HEIGHT;
  const fadeStops = `rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.75) ${(FADE_HEIGHT / fadeHeight) * 55}%, ${colors.bg} ${(FADE_HEIGHT / fadeHeight) * 100}%`;

  const fadeLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: insets.bottom - Math.max(insets.bottom, -keyboard.height.value) }],
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
        // Keyed by filter: switching fades the new list in place, with no page slide, since the
        // filter pill already shows the movement.
        <Animated.View key={filter} entering={APPEAR} style={styles.page}>
          <BounceList
            ref={listRef}
            scrollY={listScrollY}
            refreshing={refreshing}
            onRefresh={onPullToRefresh}
            itemLayoutAnimation={LAYOUT}
            data={visibleTodos}
            keyExtractor={keyOf}
            renderItem={renderTodo}
            ListHeaderComponent={
              newDraftOpen ? (
                <Animated.View entering={APPEAR} exiting={DISAPPEAR}>
                  <DraftRow
                    ref={formRef}
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
            // Each filter switch remounts the list; render a full screen at once rather than the
            // default 10, so the rest don't pop in a moment later.
            initialNumToRender={20}
            // iOS-like flings that glide further (Android's default, 0.985, stops short).
            decelerationRate={0.99}
            contentContainerStyle={[
              styles.listContent,
              // Room to scroll the last task clear of the + button and the fade above it.
              // While the keyboard is up it covers the list too, so the last tasks need that much more.
              { paddingBottom: fadeHeight + Math.max(0, keyboardHeight - insets.bottom) },
            ]}
          />
        </Animated.View>
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
      <Header todos={todos ?? NO_TODOS} scrollY={listScrollY} />
      {body}
      {state.status === 'ready' && (
        <Animated.View
          style={[
            styles.fade,
            { height: fadeHeight, backgroundImage: `linear-gradient(to bottom, ${fadeStops})` },
            fadeLiftStyle,
          ]}
        />
      )}
      <Animated.View style={[styles.bottom, liftStyle]}>
        {snackbar.message !== null && (
          <Snackbar
            key={snackbar.message.id}
            message={snackbar.message}
            onAction={snackbar.pressAction}
          />
        )}
        {state.status === 'ready' && (
          // Within thumb reach; the filters step aside while a form is open, leaving the tick.
          <View ref={barRef} style={styles.bar}>
            {state.todos.length > 0 && draft.target === null && (
              <Animated.View entering={APPEAR} exiting={DISAPPEAR} style={styles.filters}>
                <FilterTabs selected={filter} onSelect={setFilter} />
              </Animated.View>
            )}
            <Fab
              mode={fabMode}
              disabled={fabMode === 'confirm' && !draft.canSubmit}
              onPress={onFabPress}
            />
          </View>
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
  page: {
    flex: 1,
  },
  listContent: {
    // Lets `EmptyState` fill the viewport and centre itself.
    flexGrow: 1,
    paddingTop: 4,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    // Space above, for the snackbar when it shows.
    marginTop: 12,
    paddingHorizontal: gutter,
  },
  filters: {
    flex: 1,
  },
  bottom: {
    // Fills the screen and stacks the controls from its bottom edge, so its frame never changes
    // with its content. A leaving snackbar fades where it was, rather than dropping with the top
    // edge of a container that shrinks once the snackbar is gone.
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    // Taps outside the controls reach the list underneath.
    pointerEvents: 'box-none',
  },
});
