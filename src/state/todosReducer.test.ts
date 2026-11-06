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

function readyTodos(state: State): Todo[] {
  if (state.status !== 'ready') throw new Error(`Expected ready state, got ${state.status}`);

  return state.todos;
}

function ids(state: State): number[] {
  return readyTodos(state).map((item) => item.id);
}

describe('IDs', () => {
  test('tasks added from identical POST responses get distinct IDs above the loaded ones', () => {
    const state = run(
      loaded([todo(1), todo(2), todo(3)]),
      { type: 'added', todo: postResponse('A') },
      { type: 'added', todo: postResponse('B') },
    );

    expect(ids(state)).toEqual([5, 4, 1, 2, 3]);
  });

  test('a deleted task restored by Undo never shares an ID with a task added after it', () => {
    const state = run(
      loaded([todo(1), todo(2), todo(3)]),
      { type: 'deleted', id: 3 },
      { type: 'added', todo: postResponse('A') },
      { type: 'restored', todo: todo(3), index: 2 },
    );

    expect(ids(state).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  test('an empty list starts IDs at 1', () => {
    const state = run(loaded([]), { type: 'added', todo: postResponse('A') });

    expect(ids(state)).toEqual([1]);
  });
});

describe('Undo', () => {
  test('restores the task at its original index', () => {
    const state = run(
      loaded([todo(1), todo(2), todo(3)]),
      { type: 'deleted', id: 2 },
      { type: 'restored', todo: todo(2), index: 1 },
    );

    expect(ids(state)).toEqual([1, 2, 3]);
  });

  test('clamps the index to the end when the list has since shrunk', () => {
    const state = run(
      loaded([todo(1), todo(2), todo(3)]),
      { type: 'deleted', id: 2 },
      { type: 'deleted', id: 3 },
      { type: 'restored', todo: todo(3), index: 2 },
    );

    expect(ids(state)).toEqual([1, 3]);
  });
});

describe('hasLocalChanges', () => {
  const base = loaded([todo(1), todo(2)]);

  test('is false after loading from the API', () => {
    expect(run(base)).toMatchObject({ hasLocalChanges: false });
  });

  test.each<[string, Action]>([
    ['added', { type: 'added', todo: postResponse('A') }],
    ['toggled', { type: 'toggled', id: 1 }],
    ['deleted', { type: 'deleted', id: 1 }],
    ['restored', { type: 'restored', todo: todo(3), index: 0 }],
  ])('is set by %s', (_name, action) => {
    expect(run(base, action)).toMatchObject({ hasLocalChanges: true });
  });

  test('is cleared by refreshed, which also resets the ID counter', () => {
    const state = run(
      base,
      { type: 'added', todo: postResponse('A') },
      { type: 'added', todo: postResponse('B') },
      { type: 'refreshed', todos: [todo(1), todo(2)] },
    );

    expect(state).toEqual({ status: 'ready', todos: [todo(1), todo(2)], hasLocalChanges: false, nextId: 3 });
  });

  test('is kept from storage on load', () => {
    const state = run({ type: 'loadSucceeded', todos: [], hasLocalChanges: true, nextId: 7 });

    expect(state).toEqual({ status: 'ready', todos: [], hasLocalChanges: true, nextId: 7 });
  });
});

test.each<Action>([
  { type: 'added', todo: postResponse('A') },
  { type: 'toggled', id: 1 },
  { type: 'deleted', id: 1 },
  { type: 'restored', todo: todo(1), index: 0 },
  { type: 'refreshed', todos: [todo(1)] },
])('$type is ignored unless ready', (action) => {
  const errored = run({ type: 'loadFailed', message: 'Offline' });

  expect(todosReducer(initialState, action)).toBe(initialState);
  expect(todosReducer(errored, action)).toBe(errored);
});
