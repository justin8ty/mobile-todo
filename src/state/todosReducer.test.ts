import { initialState, todosReducer } from './todosReducer';

import type { Action, State } from './todosReducer';
import type { Todo } from '../types';

function todo(id: number, title = `Task ${id}`): Todo {
  return { id, userId: 1, title, completed: false };
}

// What JSONPlaceholder returns for every POST, regardless of how many tasks exist.
function postResponse(title: string): Todo {
  return { id: 201, userId: 1, title, completed: false };
}

function run(...actions: Action[]): State {
  return actions.reduce(todosReducer, initialState);
}

function loaded(todos: Todo[]): Action {
  return { type: 'loadSucceeded', todos, hasLocalChanges: false };
}

function ids(state: State): number[] {
  if (state.status !== 'ready') throw new Error(`Expected ready state, got ${state.status}`);

  return state.todos.map((item) => item.id);
}

test('IDs stay unique across identical POST responses and Undo', () => {
  // Both adds get `id: 201` from the API, and the second would reuse ID 3 if IDs were
  // derived from the current list instead of a counter.
  const state = run(
    loaded([todo(1), todo(2), todo(3)]),
    { type: 'deleted', id: 3 },
    { type: 'added', todo: postResponse('A') },
    { type: 'added', todo: postResponse('B') },
    { type: 'restored', todo: todo(3), index: 2 },
  );

  expect(new Set(ids(state)).size).toBe(5);
});

test('Undo restores the task at its original index', () => {
  const state = run(
    loaded([todo(1), todo(2), todo(3)]),
    { type: 'deleted', id: 2 },
    { type: 'restored', todo: todo(2), index: 1 },
  );

  expect(ids(state)).toEqual([1, 2, 3]);
});

test.each<[string, Action]>([
  ['added', { type: 'added', todo: postResponse('A') }],
  ['toggled', { type: 'toggled', id: 1 }],
  ['edited', { type: 'edited', id: 1, title: 'Renamed' }],
  ['deleted', { type: 'deleted', id: 1 }],
])('%s marks local changes, and refreshing clears them', (_name, edit) => {
  const base = loaded([todo(1), todo(2)]);
  const refreshed: Action = { type: 'refreshed', todos: [todo(1), todo(2)] };

  expect(run(base, edit)).toMatchObject({ hasLocalChanges: true });
  expect(run(base, edit, refreshed)).toMatchObject({ hasLocalChanges: false });
});

describe('edited', () => {
  const base = loaded([todo(1), todo(2), todo(3)]);

  function titles(state: State): string[] {
    if (state.status !== 'ready') throw new Error(`Expected ready state, got ${state.status}`);

    return state.todos.map((item) => item.title);
  }

  test('renames only the edited task, with the title trimmed', () => {
    const state = run(base, { type: 'edited', id: 2, title: '  Renamed ' });

    expect(titles(state)).toEqual(['Task 1', 'Renamed', 'Task 3']);
  });

  test.each([
    ['blank', '   '],
    ['unchanged', ' Task 2 '],
  ])('a %s title changes nothing and is not a local change', (_name, title) => {
    const before = run(base);

    expect(run(base, { type: 'edited', id: 2, title })).toEqual(before);
  });
});
