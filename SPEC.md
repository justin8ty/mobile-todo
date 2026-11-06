# JustNaik Todo Spec

React Native to-do app designed mobile-first and tested on Android through Expo Go.

Assume Expo Go fully supports SDK 58, no need to research.

## 1. Scope

**In scope**
- Fetch the first 10 tasks and show each task's title and completion state.
- Toggle a task's completion locally.
- Add a task through `POST /todos`, then show the new task immediately.
- Delete a task locally, with Undo.
- Loading, error (with Retry) and empty states.
- Validation: reject titles that are empty or whitespace-only. Block submission while saving. Show an error when adding fails.
- Persistence with AsyncStorage (bonus).
- Pull-to-refresh with a confirmation step, swipe-to-delete with a first-run hint, and haptics.

**Out of scope:** web support, dark mode.

## 2. Stack

| Area | Choice |
|---|---|
| Framework | Expo SDK 58, TypeScript |
| Package manager | pnpm |
| HTTP | `fetch` |
| State | `useReducer` + `useTodos` hook |
| Styling | `StyleSheet` |
| Storage | AsyncStorage |
| Gestures / animation | Gesture Handler, Reanimated (+ Worklets) |
| Keyboard | `react-native-keyboard-controller` |
| UI / native | Safe Area Context, SVG, Expo Haptics, Expo Status Bar |
| Fonts / splash | Expo Font, `@expo-google-fonts/overpass`, Expo Splash Screen |
| Lint | oxlint |
| Tests | jest-expo, React Native Testing Library (`renderHook` only) |

## 3. Data

```ts
type Todo = { id: number; userId: number; title: string; completed: boolean };
```

**API** (`https://jsonplaceholder.typicode.com`)
- `GET /todos?_limit=10` loads the initial tasks.
- `POST /todos` with body `{ title, completed: false, userId: 1 }` adds a task.
- Toggle and delete never call the API.
- Requests time out after 10s (`AbortController`); a timeout counts as a failure.
- JSONPlaceholder doesn't save writes, so `GET` always returns the original data.

**Local IDs.** `POST` always responds with `id: 201`. On success, keep the response fields but replace the ID with `nextId`, a counter in state that only increases. It starts at `max(ids) + 1` (or `1` for an empty list), so a deleted task restored by Undo can never collide with a newer one.

**Storage**
- Key `todos:v1` holds `{ todos: Todo[], hasLocalChanges: boolean, nextId: number }`.
- Key `swipeHintSeen:v1` holds a boolean.
- Reads and writes go through `storage/todos.ts` (`load`, `save`) and never directly from components.
- `load` returns:
  - `null` when nothing is stored
  - `null` when reading fails, and logs a warning
  - `null` when the stored data is corrupt or the wrong shape, and logs a warning. Wrong shape includes a `nextId` that isn't an integer greater than every stored ID
  - the parsed data otherwise. An empty `todos` array counts as valid data.
- Save whenever the `ready` state changes. A failed save logs a warning and doesn't change the UI.

## 4. State

```ts
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; todos: Todo[]; hasLocalChanges: boolean; nextId: number };
```

| Action | Result |
|---|---|
| `loadStarted` | Becomes `loading` |
| `loadSucceeded { todos, hasLocalChanges, nextId? }` | Becomes `ready`. `nextId` defaults to `max(ids) + 1` |
| `loadFailed { message }` | Becomes `error` |
| `added { todo }` | Sets the ID to `nextId`, increments `nextId`, adds the task to the top. Sets `hasLocalChanges` |
| `toggled { id }` | Flips `completed`. Sets `hasLocalChanges` |
| `deleted { id }` | Removes the task. Sets `hasLocalChanges` |
| `restored { todo, index }` | Puts the task back at its original index, clamped to the list length (Undo). Sets `hasLocalChanges` |
| `refreshed { todos }` | Replaces all tasks, resets `nextId` to `max(ids) + 1`. Clears `hasLocalChanges` |

`added`, `toggled`, `deleted`, `restored` and `refreshed` are ignored unless the status is `ready`.

**Responsibilities**
- `useTodos` owns the reducer and the effects: loading at startup and saving. It exposes `state`, `addTodo(title)` (a promise that rejects on failure), `toggleTodo`, `deleteTodo` (returns the removed task and its index), `restoreTodo`, `retry` and `refresh`.
- Each component keeps its own UI-only state: the draft row's text and saving flag, the snackbar, and whether a refresh is in progress.

**Startup**
1. Set `loading`.
2. Call `storage.load()`. If data is found, dispatch `loadSucceeded` with it.
3. If nothing is found, call the API. On success, dispatch `loadSucceeded` with `hasLocalChanges: false`. On failure, dispatch `loadFailed`.
4. Retry on the error screen sets `loading` (spinner shows) and runs the API fetch again.

## 5. Screen & behaviour

One screen. Layout from top to bottom: header, list (with the draft row above the first task), floating + button, snackbar.

**Header.** A `JUSTNAIK` kicker line, the title `Todo`, and a yellow badge. The badge shows `N LEFT` (incomplete count), shows `ALL DONE` when every task is complete, and is hidden when the list is empty.

**States**
| State | UI |
|---|---|
| `loading` | Spinner + "Loading tasks…". + button hidden |
| `error` | "Couldn't load tasks" + error detail + **Retry**. + button hidden |
| `ready`, empty | Empty state ("No tasks" / "Tap + to add one"), rendered through `ListEmptyComponent` so it can be pulled to refresh |
| `ready`, tasks | Reanimated `Animated.FlatList` of rows |

**Toggle**
- Tapping anywhere on a row toggles the task.
- The checkbox animates: it shrinks slightly while pressed, the fill fades in and the checkmark draws in. A light haptic plays.
- Completed titles are dimmed. Tasks don't move when toggled.

**Delete (swipe)**
- Swipe a row left to reveal a red area with a trash icon.
- Releasing past about 35% of the row width deletes the task. A haptic plays when the drag crosses that threshold. Releasing before it springs the row back.
- Built with a custom Gesture Handler `Pan` gesture and a Reanimated shared value. It must not interfere with vertical scrolling (use `activeOffsetX` and `failOffsetY`).
- Each row has an accessibility action named "Delete" so screen-reader users can delete without swiping.
- After a delete, a snackbar shows "Task deleted · UNDO" for 4 seconds. UNDO restores the task at its original index. Only one deletion can be undone at a time, and a newer delete replaces the pending one.

**Swipe hint**
- The first row slides left 48px to show a sliver of red, springs back, then repeats once at about half the distance.
- On each app launch, it plays about 600ms after the list first shows tasks, and once more on the first task the user adds.
- Once the user swipes any row, `swipeHintSeen:v1` is set and it never plays again.
- It's skipped when the phone's reduce-motion setting is on.

**Add (draft row)**
- Tapping the + button scrolls the list to the top and opens a draft row there (`ListHeaderComponent`). The input gets focus and the keyboard opens.
- The draft row contains a hollow checkbox, a `TextInput` and an **Add** button. The button only appears when `title.trim()` isn't empty. The return key also submits (`returnKeyType="done"`); with a blank title it does nothing.
- While saving, the Add button shows a spinner, is `disabled` with `accessibilityState={{ busy: true }}`, and further submissions (including the return key) are ignored. The input stays editable, because disabling it closes the keyboard on Android.
- On success, the task appears at the top. The input clears, keeps focus, and the draft stays open for the next task.
- On failure, a snackbar shows "Couldn't add task · RETRY" and the text stays in the input. RETRY submits the input's current text, trimmed; if that is blank, it does nothing.
- If the input loses focus while empty, the draft row closes. Tapping + while the draft is open focuses the input. The + button sets a flag in `onPressIn` so the input's blur doesn't close the draft first (which would make the keyboard bounce).

**Pull-to-refresh** (list and empty state)
- If `hasLocalChanges` is true, an Alert asks first: "Reload tasks?" / "This replaces your changes with the original tasks from the server." with Cancel and Reload. Cancel stops the spinner and changes nothing.
- Reload calls `GET`. On success, dispatch `refreshed` and cancel any pending Undo (its task could duplicate one from the server). On failure, keep the current list and show the snackbar "Couldn't refresh · RETRY". RETRY reloads immediately, without asking again.

**Snackbar**
- One shared component, showing one message at a time; a new message replaces the current one.
- It appears at the bottom, above the safe-area inset or the keyboard when open (keyboard height from `react-native-keyboard-controller`), and pushes the + button up while visible.
- It hides automatically after 4 seconds and has an optional action button.
- It's announced to screen readers (`accessibilityLiveRegion="polite"`).

**Mobile details**
- `SafeAreaProvider`, with insets applied to the + button and snackbar (Android draws edge-to-edge).
- On the list: `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="on-drag"`.
- Touch targets at least 48dp, with `hitSlop` on small controls.
- Pressed feedback on everything tappable.
- Accessibility labels: rows use `accessibilityRole="checkbox"` with `accessibilityState={{ checked }}` and the title as the label. The + button is labelled "Add task".

## 6. Visual design: "Transit signage"

The look is Things 3's calm, expressed through JustNaik's brand and road-sign typography.

| Token | Value |
|---|---|
| Font | Overpass 400 / 600 / 800, loaded before the splash screen hides |
| `bg` | `#FFFFFF` |
| `ink` | `#0F1736` |
| `brand` | `#234197` (JustNaik blue): checked boxes, kicker |
| `signal` | `#FCEC64` (JustNaik yellow): + button, count badge, snackbar action text |
| `muted` | `#A3A9BB`: completed titles |
| `line` | `#C3C9DA`: checkbox border |
| `danger` | `#D93A3A`: swipe-to-delete background |

- **Type sizes:** kicker 12/800 with 0.14em letter spacing; title 40/800; rows 16/400; badge 13/600 with tabular numbers.
- **Rows and checkboxes:** rows at least 50px tall with no dividers; spacing alone separates them. Checkboxes are 22px rounded squares (radius 6) with a 2.2px border.
- **+ button:** 56px, radius 16, yellow, with a navy plus.
- **Snackbar:** ink background, white text, yellow action.
- **Motion:** spring-based. Rows animate in and out with Reanimated `entering` and `exiting`; remaining rows slide into place via `Animated.FlatList`'s `itemLayoutAnimation`. Everything respects reduce-motion.
- **Light theme only** (`userInterfaceStyle: "light"`), with a dark status bar.

## 7. Structure

```
App.tsx                      providers (SafeArea, GestureHandler, Keyboard), fonts, splash
src/
  api/todos.ts               fetchTodos, createTodo
  storage/todos.ts           load, save (+ swipe-hint flag)
  state/todosReducer.ts      State, Action, reducer (pure)
  hooks/useTodos.ts          reducer + load/save effects + async actions
  hooks/useSnackbar.ts
  screens/TodoScreen.tsx     picks the state view, wires list, + button, snackbar
  components/
    Header.tsx  TodoRow.tsx  DraftRow.tsx  Checkbox.tsx
    Fab.tsx  Snackbar.tsx  LoadingState.tsx  ErrorState.tsx  EmptyState.tsx
  theme.ts  types.ts
```

## 8. Tests

One test per failure mode. Hook tests use `renderHook` with the real reducer and storage module; only `fetch` and AsyncStorage (in-memory mock) are faked. Assert on resulting state and stored data, not on mock calls.

| # | Failure mode | Level |
|---|---|---|
| 1 | Duplicate IDs from `id: 201` responses, or from ID reuse after delete + Undo | Reducer |
| 2 | Undo restores at the wrong index | Reducer |
| 3 | `hasLocalChanges` wrong, so refresh skips or needlessly shows the confirm | Reducer |
| 4 | Stored data exists but the API is fetched and overwrites it | Hook |
| 5 | Stored `[]` treated as missing; deleted tasks return after restart | Hook |
| 6 | Corrupt or wrong-shape storage crashes launch instead of falling back to the API | Hook |
| 7 | Non-2xx response or timeout doesn't reach `error` | Hook |
| 8 | Retry after an error never recovers | Hook |
| 9 | Failed add changes the list or doesn't reject | Hook |
| 10 | Save during loading overwrites storage with an empty list | Hook |

## 9. Deliverables

- Source code in a GitHub repo.
- README: setup, usage, API limitations.
