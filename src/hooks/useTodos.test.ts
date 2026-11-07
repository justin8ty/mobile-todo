import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import * as storage from '../storage/todos';
import { useTodos } from './useTodos';

import type { Todo } from '../types';

type Handler = (url: string, init: RequestInit) => Promise<Response>;

function todo(id: number, title = `Task ${id}`): Todo {
  return { id, userId: 1, title, completed: false };
}

const apiTodos = [todo(1), todo(2), todo(3)];

function json(body: Todo | Todo[], status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Stands in for JSONPlaceholder: GET returns `apiTodos`, POST echoes the body with `id: 201`. */
const jsonPlaceholder: Handler = async (_url, init) => {
  if (init.method === 'POST') {
    const sent = JSON.parse(String(init.body));

    return json({ ...sent, id: 201 }, 201);
  }

  return json(apiTodos);
};

const serverError: Handler = async () => new Response('', { status: 500 });

const offline: Handler = async () => {
  throw new TypeError('Network request failed');
};

/** Never answers; rejects only when the client aborts. */
const hanging: Handler = (_url, init) =>
  new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
  });

function serve(...handlers: Handler[]) {
  globalThis.fetch = async (input, init) => {
    const handler = handlers.length > 1 ? handlers.shift() : handlers[0];

    if (handler === undefined) throw new Error('No fetch handler');

    return handler(String(input), init ?? {});
  };
}

async function seed(raw: string) {
  await AsyncStorage.setItem('todos:v1', raw);
}

async function renderUntilSettled() {
  const hook = await renderHook(() => useTodos());

  await waitFor(() => expect(hook.result.current.state.status).not.toBe('loading'));

  // Let any stray request or save that a buggy implementation started finish before asserting.
  await act(async () => {});

  return hook;
}

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('startup', () => {
  test('stored tasks are shown and kept instead of the API tasks', async () => {
    const stored = { todos: [todo(7, 'Stored')], hasLocalChanges: true, nextId: 9 };

    await seed(JSON.stringify(stored));
    serve(jsonPlaceholder);

    const { result } = await renderUntilSettled();

    expect(result.current.state).toEqual({ status: 'ready', ...stored });
    expect(await storage.load()).toEqual(stored);
  });

  test('a stored empty list stays empty after restart', async () => {
    const stored = { todos: [], hasLocalChanges: true, nextId: 4 };

    await seed(JSON.stringify(stored));
    serve(jsonPlaceholder);

    const { result } = await renderUntilSettled();

    expect(result.current.state).toEqual({ status: 'ready', ...stored });
  });

  test.each([
    ['invalid JSON', '{"todos": ['],
    ['a nextId that collides', JSON.stringify({ todos: [todo(3)], hasLocalChanges: true, nextId: 3 })],
  ])('storage with %s falls back to the API and is replaced', async (_name, raw) => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await seed(raw);
    serve(jsonPlaceholder);

    const { result } = await renderUntilSettled();
    const expected = { todos: apiTodos, hasLocalChanges: false, nextId: 4 };

    expect(result.current.state).toEqual({ status: 'ready', ...expected });
    expect(await storage.load()).toEqual(expected);
  });

  test('a non-2xx response ends in the error state', async () => {
    serve(serverError);

    const { result } = await renderUntilSettled();

    expect(result.current.state.status).toBe('error');
  });

  test('a request with no answer times out into the error state', async () => {
    jest.useFakeTimers();
    serve(hanging);

    const { result } = await renderHook(() => useTodos());

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
    });

    expect(result.current.state.status).toBe('error');
  });

  test('a failed first launch leaves storage empty so the next launch fetches again', async () => {
    serve(serverError);

    await renderUntilSettled();

    expect(await AsyncStorage.getItem('todos:v1')).toBeNull();
  });
});

test('retry after a failed load recovers', async () => {
  serve(offline, jsonPlaceholder);

  const { result } = await renderUntilSettled();

  expect(result.current.state.status).toBe('error');

  await act(() => result.current.retry());

  expect(result.current.state).toMatchObject({ status: 'ready', todos: apiTodos });
});

test.each([
  ['a blank title', '   ', jsonPlaceholder],
  ['a server error', 'New task', serverError],
])('adding with %s rejects and leaves the list and storage untouched', async (_name, title, handler) => {
  serve(jsonPlaceholder);

  const { result } = await renderUntilSettled();
  const before = result.current.state;

  serve(handler);

  await expect(act(() => result.current.addTodo(title))).rejects.toThrow();
  expect(result.current.state).toBe(before);
  expect(await storage.load()).toEqual({ todos: apiTodos, hasLocalChanges: false, nextId: 4 });
});
