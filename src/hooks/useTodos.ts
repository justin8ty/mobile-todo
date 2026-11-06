import { useCallback, useEffect, useReducer } from 'react';

import { createTodo, fetchTodos } from '../api/todos';
import { initialState, todosReducer } from '../state/todosReducer';
import * as storage from '../storage/todos';

import type { Action } from '../state/todosReducer';
import type { Todo } from '../types';

export type RemovedTodo = { todo: Todo; index: number };

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong.';
}

async function loadFromApi(): Promise<Action> {
  try {
    return { type: 'loadSucceeded', todos: await fetchTodos(), hasLocalChanges: false };
  } catch (cause) {
    return { type: 'loadFailed', message: messageOf(cause) };
  }
}

export function useTodos() {
  const [state, dispatch] = useReducer(todosReducer, initialState);

  // Startup: stored tasks win; the API is only asked when nothing usable is stored.
  useEffect(() => {
    let active = true;

    async function start() {
      const stored = await storage.load();

      if (!active) return;

      if (stored !== null) {
        dispatch({ type: 'loadSucceeded', ...stored });

        return;
      }

      const action = await loadFromApi();

      if (active) dispatch(action);
    }

    void start();

    return () => {
      active = false;
    };
  }, []);

  // Only `ready` holds tasks worth keeping; saving while loading or failed would wipe storage.
  useEffect(() => {
    if (state.status !== 'ready') return;

    void storage.save({
      todos: state.todos,
      hasLocalChanges: state.hasLocalChanges,
      nextId: state.nextId,
    });
  }, [state]);

  /** Rejects when the title is blank or the request fails; the list is unchanged then. */
  const addTodo = useCallback(async (title: string) => {
    const trimmed = title.trim();

    if (trimmed === '') throw new Error('Task title is empty.');

    const todo = await createTodo(trimmed);

    dispatch({ type: 'added', todo });
  }, []);

  const toggleTodo = useCallback((id: number) => {
    dispatch({ type: 'toggled', id });
  }, []);

  /** Returns what Undo needs to put the task back, or `null` if it isn't in the list. */
  const deleteTodo = useCallback(
    (id: number): RemovedTodo | null => {
      if (state.status !== 'ready') return null;

      const index = state.todos.findIndex((todo) => todo.id === id);

      if (index === -1) return null;

      dispatch({ type: 'deleted', id });

      return { todo: state.todos[index], index };
    },
    [state],
  );

  const restoreTodo = useCallback((removed: RemovedTodo) => {
    dispatch({ type: 'restored', todo: removed.todo, index: removed.index });
  }, []);

  const retry = useCallback(async () => {
    dispatch({ type: 'loadStarted' });
    dispatch(await loadFromApi());
  }, []);

  /** Replaces the list with the server's tasks. Rejects on failure and keeps the current list. */
  const refresh = useCallback(async () => {
    const todos = await fetchTodos();

    dispatch({ type: 'refreshed', todos });
  }, []);

  return { state, addTodo, toggleTodo, deleteTodo, restoreTodo, retry, refresh };
}
