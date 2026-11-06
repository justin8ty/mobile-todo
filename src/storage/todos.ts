import AsyncStorage from '@react-native-async-storage/async-storage';

import { isTodoList } from '../types';

import type { Todo } from '../types';

const TODOS_KEY = 'todos:v1';
const SWIPE_HINT_SEEN_KEY = 'swipeHintSeen:v1';

export type StoredTodos = { todos: Todo[]; hasLocalChanges: boolean; nextId: number };

function isStoredTodos(value: unknown): value is StoredTodos {
  return (
    typeof value === 'object' &&
    value !== null &&
    'todos' in value &&
    isTodoList(value.todos) &&
    'hasLocalChanges' in value &&
    typeof value.hasLocalChanges === 'boolean' &&
    'nextId' in value &&
    typeof value.nextId === 'number' &&
    Number.isInteger(value.nextId) &&
    // `nextId` must exceed every stored ID, or new tasks could collide with existing ones.
    Math.max(0, ...value.todos.map((todo) => todo.id)) < value.nextId
  );
}

/** Returns `null` when nothing usable is stored, so the caller falls back to the API. */
export async function load(): Promise<StoredTodos | null> {
  let raw: string | null;

  try {
    raw = await AsyncStorage.getItem(TODOS_KEY);
  } catch (error) {
    console.warn('Failed to read stored tasks', error);

    return null;
  }

  if (raw === null) return null;

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn('Stored tasks are not valid JSON', error);

    return null;
  }

  if (!isStoredTodos(parsed)) {
    console.warn('Stored tasks have an unexpected format');

    return null;
  }

  return parsed;
}

/** Never rejects: a failed save only logs, because the in-memory list is still correct. */
export async function save(data: StoredTodos): Promise<void> {
  try {
    await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save tasks', error);
  }
}

/** Defaults to `false` on read failure: replaying the hint is harmless. */
export async function loadSwipeHintSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SWIPE_HINT_SEEN_KEY)) === 'true';
  } catch (error) {
    console.warn('Failed to read swipe hint flag', error);

    return false;
  }
}

export async function saveSwipeHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SWIPE_HINT_SEEN_KEY, 'true');
  } catch (error) {
    console.warn('Failed to save swipe hint flag', error);
  }
}
