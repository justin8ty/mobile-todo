# JustNaik Todo Spec

React Native to-do app designed mobile-first and tested on Android through Expo Go.

Assume Expo Go fully supports SDK 58, no need to research.

## 1. Scope

**In scope**
- Fetch the first 10 tasks and show each task's title and completion state.
- Toggle a task's completion locally.
- Add a task through `POST /todos`, then show the new task immediately.
- Delete a task locally, with Undo.
- Edit a task's title locally (long-press).
- Filter the list: All / Active / Done.
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
- Toggle, edit and delete never call the API.
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
| `edited { id, title }` | Sets the trimmed title. Ignored if it's blank or unchanged; otherwise sets `hasLocalChanges` |
| `deleted { id }` | Removes the task. Sets `hasLocalChanges` |
| `restored { todo, index }` | Puts the task back at its original index, clamped to the list length (Undo). Sets `hasLocalChanges` |
| `refreshed { todos }` | Replaces all tasks, resets `nextId` to `max(ids) + 1`. Clears `hasLocalChanges` |

`added`, `toggled`, `edited`, `deleted`, `restored` and `refreshed` are ignored unless the status is `ready`.

**Responsibilities**
- `useTodos` owns the reducer and the effects: loading at startup and saving. It exposes `state`, `addTodo(title)` (a promise that rejects on failure), `toggleTodo`, `editTodo(id, title)`, `deleteTodo` (returns the removed task and its index), `restoreTodo`, `retry` and `refresh`.
- `useDraft` owns the one open form: its target (a new task, or the ID of the task being edited), its text and the saving flag. The screen wires it to the draft row, the row being edited and the + button. Only one form is open at a time; opening one closes the other.
- Other UI-only state stays with its owner: the snackbar (`useSnackbar`), the swipe hint (`useSwipeHint`), and the filter and whether a refresh is in progress (the screen).

**Startup**
1. Set `loading`.
2. Call `storage.load()`. If data is found, dispatch `loadSucceeded` with it.
3. If nothing is found, call the API. On success, dispatch `loadSucceeded` with `hasLocalChanges: false`. On failure, dispatch `loadFailed`.
4. Retry on the error screen sets `loading` (spinner shows) and runs the API fetch again.

## 5. Screen & behaviour

One screen. Layout from top to bottom: header, list (with the draft row above the first task), floating + button, snackbar.

**Header.** The title `JustNaik Todo` (one line, no kicker above it) with a yellow badge on the right. The badge shows `N LEFT` (incomplete count across all tasks, whatever the filter), shows `ALL DONE` when every task is complete, and is hidden when the list is empty. Below the title sit the filter tabs.

**States**
| State | UI |
|---|---|
| `loading` | Spinner + "Loading tasks…". + button hidden |
| `error` | "Couldn't load tasks" + error detail + **Retry**. + button hidden |
| `ready`, empty | Empty state ("No tasks" / "Tap + to add one"), rendered through `ListEmptyComponent` so it can be pulled to refresh |
| `ready`, filter matches nothing | "Nothing left to do" (Active) or "Nothing done yet" (Done), same placement |
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

**Add (draft row + tick button)**
- Tapping the + button scrolls the list to the top and opens a draft row there (`ListHeaderComponent`): a hollow checkbox and a `TextInput`. The input gets focus and the keyboard opens.
- While the draft is open, the + button becomes a tick button that submits it. The tick is grey and inert while `title.trim()` is empty. The return key also submits (`returnKeyType="done"`, `submitBehavior="submit"`); with a blank title it does nothing.
- While saving, the button shows a spinner with `accessibilityState={{ busy: true }}`, and further submissions (including the return key) are ignored. The input keeps focus, so the keyboard stays up.
- On success, the task appears at the top, the draft closes and the button returns to +. The next task needs another tap on +.
- On failure, a snackbar shows "Couldn't add task · RETRY". The draft stays open with its text, and the button returns to an active tick. RETRY resubmits the title that failed.
- Tapping or scrolling anywhere else closes the draft and discards its text: a tap in the list (a row tap only closes it, without toggling), on the header, a drag of the list, or Android's back button. Taps on the button and snackbar don't count.
- Dismissing while saving closes the draft, but the request still finishes and the button keeps its spinner until then.
- How dismissal is detected: the input's `onBlur` closes the draft. The list uses `keyboardShouldPersistTaps="never"`, so list taps blur it. The screen's root view claims taps nothing else handles (`onStartShouldSetResponder`). The draft row blurs its input on `keyboardDidHide`, because Android's back button hides the keyboard without blurring. The inert tick still takes its touch rather than being `disabled`, because a disabled `Pressable` lets the tap fall through to the root and close the draft.

**Edit (long-press)**
- Long-pressing a row (Pressable `onLongPress`) plays a light haptic. When the finger lifts (`onTouchEnd`), that row turns into an input holding its title. The input gets focus, with the cursor at the end. If a scroll or swipe takes over the touch instead (`onTouchCancel`), the form doesn't open. Rows also get an accessibility action named "Edit", which opens the form directly.
- It's the same form as Add: the + button becomes the tick, which is grey while the title is blank; the return key also saves; tapping elsewhere, dragging the list or pressing back cancels and keeps the original title.
- Saving dispatches `edited` and closes the form immediately (no request, no spinner). An unchanged title just closes it.
- While a row is being edited, its swipe and toggle are off.

**Filter**
- Three tabs under the title: `ALL`, `ACTIVE`, `DONE`. The filter is screen state, not persisted; each launch starts on All. The tabs are hidden while there are no tasks.
- The list shows only matching tasks. A task toggled out of the current filter leaves with its exit animation.
- Tapping + switches to All first, so the new task is visible.
- The swipe hint plays on the first visible row. Undo restores by the task's index in the full list.

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
- On the list: `keyboardShouldPersistTaps="never"` and `keyboardDismissMode="on-drag"` (see Add).
- Touch targets at least 48dp, with `hitSlop` on small controls.
- Pressed feedback on everything tappable.
- Accessibility labels: rows use `accessibilityRole="checkbox"` with `accessibilityState={{ checked }}` and the title as the label. The + button is labelled "Add task", the tick "Save task" (`disabled` while blank), and the spinner "Saving task".

## 6. Visual design: "Transit signage"

The look is Things 3's calm, expressed through JustNaik's brand and road-sign typography.

| Token | Value |
|---|---|
| Font | Overpass 400 / 600 / 800, loaded before the splash screen hides |
| `bg` | `#FFFFFF` |
| `ink` | `#0F1736` |
| `brand` | `#234197` (JustNaik blue): checked boxes |
| `signal` | `#FCEC64` (JustNaik yellow): + button, count badge, snackbar action text |
| `muted` | `#A3A9BB`: completed titles |
| `line` | `#C3C9DA`: checkbox border |
| `danger` | `#D93A3A`: swipe-to-delete background |

- **Type sizes:** title 32/800, shrinking to fit one line on narrow phones; rows 16/400; badge 15/800 with tabular numbers; filter tabs 12/800 with 0.14em letter spacing.
- **Rows and checkboxes:** rows at least 50px tall with no dividers; spacing alone separates them. Checkboxes are 22px rounded squares (radius 6) with a 2.2px border.
- **+ button:** 56px, radius 16, yellow, with a navy plus. As the tick it stays yellow with a navy check; while blank, it's grey (`inactive` `#E3E6EE`) with a `muted` check. Icons fade in when the button changes role.
- **Snackbar:** ink background, white text, yellow action.
- **Filter tabs:** the selected tab is `ink` with a 2px `signal` underline, the others `muted`. Each tab has a 48dp touch target; `accessibilityRole="tab"` with `accessibilityState={{ selected }}`.
- **Row being edited:** same layout as the draft row, so the title doesn't shift when it turns into an input.
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
  hooks/useDraft.ts          the one open form (new task or edit): target, text, saving
  hooks/useSnackbar.ts
  hooks/useSwipeHint.ts
  screens/TodoScreen.tsx     picks the state view, wires list, + button, snackbar
  components/
    Header.tsx  TodoRow.tsx  DraftRow.tsx  Checkbox.tsx
    Fab.tsx  Snackbar.tsx  FilterTabs.tsx
    LoadingState.tsx  ErrorState.tsx  EmptyState.tsx
  haptics.ts  theme.ts  types.ts
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
| 11 | Submitting twice while saving adds the task twice, or the draft stays open after success | Hook (`useDraft` + `useTodos`) |
| 12 | A failed add loses the draft's text, or RETRY doesn't add the failed title | Hook (`useDraft` + `useTodos`) |
| 13 | `edited` changes the wrong task, saves a blank or untrimmed title, or flags an unchanged title as a local change | Reducer |

## 9. Deliverables

- Source code in a GitHub repo.
- README: setup, usage, API limitations.

## 10. Decisions

1. **`useReducer` + `useTodos` hook** (over TanStack Query, Zustand)
   - Benefit: pure, testable transitions; contradictory states (loading + error) can't be represented.
   - Tradeoff: load, error and persistence logic is hand-written.

2. **Local `nextId` counter replaces the server ID**
   - Benefit: no duplicate keys despite `id: 201`; IDs restored by Undo can't collide.
   - Tradeoff: local IDs diverge from the server; one more persisted, validated field.

3. **Storage-first startup; API only when nothing is stored**
   - Benefit: edits survive restarts; relaunch needs no network; an emptied list stays empty.
   - Tradeoff: after first launch, server data only arrives via pull-to-refresh.

4. **Pull-to-refresh replaces local data, confirming only when `hasLocalChanges`** (over Reset button, merging local changes)
   - Benefit: native gesture; data loss is explicit; no confirm when nothing is lost.
   - Tradeoff: a confirm on a casual gesture is unusual; edits can't survive a refresh.

5. **Swipe-only delete with first-run hint, Undo and an accessibility action** (over trash icon, confirm dialog)
   - Benefit: clean rows; mobile convention; accidental deletes are recoverable.
   - Tradeoff: discoverability depends on the hint; custom gesture code.

6. **+ button opens a draft row at the top, Things-style; the same button becomes the tick that submits it, and the draft closes after each add or when the user taps elsewhere** (over permanent input, bottom-docked input, inline Add button, staying open for the next task)
   - Benefit: input never sits under the keyboard; new tasks appear where the user is looking; one button in one place adds a task, and the draft only lives while the user is adding.
   - Tradeoff: the form is hidden until + is tapped; adding several tasks takes a + tap each; a stray tap discards the text; several focus and dismissal edge cases to handle.

7. **Blank title: tick button greyed out and inert, return key does nothing** (over inline error, Alert)
   - Benefit: native convention; the disabled state shows why nothing happens; nothing to dismiss.

8. **One snackbar for Undo, add failure and refresh failure** (over Alert, inline errors)
   - Benefit: non-blocking; Android-native; one component for three cases.
   - Tradeoff: custom component that must track the keyboard (`react-native-keyboard-controller`, since Reanimated's `useAnimatedKeyboard` is deprecated); messages expire after 4s.

9. **Unreadable or corrupt storage falls back to the API** (over an error screen)
   - Benefit: launch never crashes or dead-ends.
   - Tradeoff: local changes in bad data are silently discarded (console warning only).

10. **Swipe hint repeats each launch until the first swipe** (over once ever)
    - Benefit: users who missed it get another chance to learn swipe-to-delete.

11. **Tests cover the reducer and hooks only; React Native Testing Library just for `renderHook`** (over component tests, or moving hook logic into plain functions)
    - Benefit: tests target the data-loss, ID and submission failure modes; the hooks are tested as shipped; no Reanimated or Gesture Handler mocking.
    - Tradeoff: UI rules (blank-title tick state, dismissal by tapping elsewhere) are checked manually.

12. **Edit by long-press, in place, local only** (over an edit icon, an edit screen, `PATCH /todos/:id`)
    - Benefit: rows stay clean; reuses the draft form and tick button; consistent with toggle and delete being local. A `PATCH` could target the wrong server task, because local IDs can match real server IDs (a local task 11 isn't the server's task 11).
    - Tradeoff: long-press is hidden (the "Edit" accessibility action covers screen readers); no extra API handling to show.
    - The form opens on release, not when the long press fires. Opening it mid-touch swaps out the view under the finger; on Fabric, the touch end for an unmounted view never reaches JS, so a stale responder swallows the next tap (the tick, which then closes the form unsaved). The haptic still marks the long press.

13. **Filter tabs under the title, not persisted** (over cycling the badge, a persisted filter)
    - Benefit: visible and one tap; each launch starts on All, so nothing looks missing.
    - Tradeoff: one more row of header chrome; toggled tasks leave filtered views right away.
