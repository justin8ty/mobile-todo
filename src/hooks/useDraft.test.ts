import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDraft } from './useDraft';
import { useTodos } from './useTodos';

import type { Todo } from '../types';

const apiTodos: Todo[] = [{ id: 1, userId: 1, title: 'Task 1', completed: false }];

/** JSONPlaceholder stand-in. `failPosts` POSTs fail with a 500 before they start succeeding. */
function serve(failPosts: number) {
  let failuresLeft = failPosts;

  globalThis.fetch = async (_input, init) => {
    if (init?.method !== 'POST') return Response.json(apiTodos);

    if (failuresLeft > 0) {
      failuresLeft -= 1;

      return new Response('', { status: 500 });
    }

    return Response.json({ ...JSON.parse(String(init.body)), id: 201 }, { status: 201 });
  };
}

/** The screen's wiring: the draft submits through the real `useTodos`. */
async function renderScreen() {
  const retries: (() => void)[] = [];

  const hook = await renderHook(() => {
    const todos = useTodos();

    const draft = useDraft(
      todos.addTodo,
      todos.editTodo,
      () => {},
      (retry: () => void) => retries.push(retry),
    );

    return { todos, draft };
  });

  await waitFor(() => expect(hook.result.current.todos.state.status).toBe('ready'));

  return { result: hook.result, retries };
}

function titles(state: ReturnType<typeof useTodos>['state']): string[] {
  return state.status === 'ready' ? state.todos.map((todo) => todo.title) : [];
}

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('submitting again while saving adds the task once, then the form closes', async () => {
  serve(0);

  const { result } = await renderScreen();

  await act(async () => {
    result.current.draft.startNew();
    result.current.draft.changeTitle('  Buy milk ');
  });

  await act(async () => {
    result.current.draft.submit();
    result.current.draft.submit();
  });

  await waitFor(() => expect(result.current.draft.saving).toBe(false));

  expect(titles(result.current.todos.state)).toEqual(['Buy milk', 'Task 1']);
  expect(result.current.draft).toMatchObject({ target: null, title: '' });
});

test('a failed add keeps the form and its text, and RETRY adds that title', async () => {
  serve(1);

  const { result, retries } = await renderScreen();

  await act(async () => {
    result.current.draft.startNew();
    result.current.draft.changeTitle('Buy milk');
  });

  await act(async () => result.current.draft.submit());
  await waitFor(() => expect(retries).toHaveLength(1));

  expect(titles(result.current.todos.state)).toEqual(['Task 1']);
  expect(result.current.draft).toMatchObject({
    target: { kind: 'new' },
    title: 'Buy milk',
    saving: false,
  });

  await act(async () => retries[0]());
  await waitFor(() => expect(result.current.draft.target).toBeNull());

  expect(titles(result.current.todos.state)).toEqual(['Buy milk', 'Task 1']);
});
