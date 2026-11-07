import { isTodo, isTodoList } from '../types';

import type { Todo } from '../types';

const BASE_URL = 'https://jsonplaceholder.typicode.com';
const TIMEOUT_MS = 10_000;

/** Fetch JSON and check it with `isValid`. Rejects with a user-facing message on any failure. */
async function request<T>(
  path: string,
  init: RequestInit,
  isValid: (body: unknown) => body is T,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response: Response;

    try {
      response = await fetch(`${BASE_URL}${path}`, { ...init, signal: controller.signal });
    } catch (cause) {
      if (controller.signal.aborted) {
        throw new Error('The server took too long to respond.', { cause });
      }

      throw new Error("Couldn't reach the server. Check your connection.", { cause });
    }

    if (!response.ok) {
      throw new Error(`The server responded with an error (${response.status}).`);
    }

    const body: unknown = await response.json().catch(() => undefined);

    if (!isValid(body)) {
      throw new Error('The server sent an unexpected response.');
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchTodos(): Promise<Todo[]> {
  return request('/todos?_limit=10', { method: 'GET' }, isTodoList);
}

/**
 * Opens a connection to the API ahead of `createTodo`, so the add only waits for the server, not
 * for DNS, TCP and TLS too. A bodiless `HEAD` the CDN answers from cache; the connection then stays
 * pooled for the POST. Failures are ignored: the POST simply connects on its own.
 */
export function preconnect(): void {
  fetch(`${BASE_URL}/todos/1`, { method: 'HEAD' }).catch(() => {});
}

/** The response always has `id: 201`; callers must assign their own local ID. */
export function createTodo(title: string): Promise<Todo> {
  return request(
    '/todos',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ title, completed: false, userId: 1 }),
    },
    isTodo,
  );
}
