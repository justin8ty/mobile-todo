import type { Todo } from '../types';

export type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; todos: Todo[]; hasLocalChanges: boolean; nextId: number };

export type Action =
  | { type: 'loadStarted' }
  | { type: 'loadSucceeded'; todos: Todo[]; hasLocalChanges: boolean; nextId?: number }
  | { type: 'loadFailed'; message: string }
  | { type: 'added'; todo: Todo }
  | { type: 'toggled'; id: number }
  | { type: 'deleted'; id: number }
  | { type: 'restored'; todo: Todo; index: number }
  | { type: 'refreshed'; todos: Todo[] };

export const initialState: State = { status: 'loading' };

/** The smallest ID greater than every ID in `todos`; `1` for an empty list. */
export function nextIdAfter(todos: Todo[]): number {
  return Math.max(0, ...todos.map((todo) => todo.id)) + 1;
}

export function todosReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loadStarted':
      return { status: 'loading' };
    case 'loadSucceeded':
      return {
        status: 'ready',
        todos: action.todos,
        hasLocalChanges: action.hasLocalChanges,
        nextId: action.nextId ?? nextIdAfter(action.todos),
      };
    case 'loadFailed':
      return { status: 'error', message: action.message };
  }

  if (state.status !== 'ready') return state;

  switch (action.type) {
    case 'added':
      // The API answers every POST with the same ID, so local IDs come from `nextId`.
      return {
        status: 'ready',
        todos: [{ ...action.todo, id: state.nextId }, ...state.todos],
        hasLocalChanges: true,
        nextId: state.nextId + 1,
      };
    case 'toggled':
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.id ? { ...todo, completed: !todo.completed } : todo,
        ),
        hasLocalChanges: true,
      };
    case 'deleted':
      return {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== action.id),
        hasLocalChanges: true,
      };
    case 'restored': {
      const index = Math.min(Math.max(action.index, 0), state.todos.length);

      return {
        ...state,
        todos: [...state.todos.slice(0, index), action.todo, ...state.todos.slice(index)],
        hasLocalChanges: true,
      };
    }

    case 'refreshed':
      return {
        status: 'ready',
        todos: action.todos,
        hasLocalChanges: false,
        nextId: nextIdAfter(action.todos),
      };
  }
}
