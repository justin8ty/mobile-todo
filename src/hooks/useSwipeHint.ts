import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import * as storage from '../storage/todos';

// Lets the list (or a newly added row) settle before the hint moves it.
const HINT_DELAY_MS = 600;

/** Ask the row with `id` to play the hint; a new `key` means play again. */
export type SwipeHint = { id: number; key: number };

/**
 * Decides when the first row demonstrates swipe-to-delete: once per launch after the list first
 * shows tasks, and once more on the first task the user adds. Never again after the user has swiped
 * a row, and never with reduce motion on.
 *
 * `firstId` is the ID of the task at the top of the list, or `null` when there is none.
 */
export function useSwipeHint(firstId: number | null) {
  const reduceMotion = useReducedMotion();
  // `null` until the stored flag has been read.
  const [seen, setSeen] = useState<boolean | null>(null);
  const [hint, setHint] = useState<SwipeHint | null>(null);

  const enabled = seen === false && !reduceMotion;
  const hasTasks = firstId !== null;

  // Timers read these when they fire, so a hint lands on whichever row is first by then.
  const enabledRef = useRef(enabled);
  const firstIdRef = useRef(firstId);
  const seenRef = useRef(seen);

  useEffect(() => {
    enabledRef.current = enabled;
    firstIdRef.current = firstId;
    seenRef.current = seen;
  });

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastKey = useRef(0);
  const launchHintScheduled = useRef(false);
  const addedHintScheduled = useRef(false);

  useEffect(() => {
    let active = true;

    void storage.loadSwipeHintSeen().then((value) => {
      // A swipe made while the flag was loading already counts.
      if (active) setSeen((current) => current ?? value);
    });

    return () => {
      active = false;
      clearTimeout(timer.current);
    };
  }, []);

  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const id = firstIdRef.current;

      if (!enabledRef.current || id === null) return;

      lastKey.current += 1;
      setHint({ id, key: lastKey.current });
    }, HINT_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!enabled || !hasTasks || launchHintScheduled.current) return;

    launchHintScheduled.current = true;
    schedule();
  }, [enabled, hasTasks, schedule]);

  const onTaskAdded = useCallback(() => {
    if (!enabledRef.current || addedHintScheduled.current) return;

    addedHintScheduled.current = true;
    schedule();
  }, [schedule]);

  /** The user has swiped a row, so they know the gesture: stop hinting for good. */
  const onSwiped = useCallback(() => {
    if (seenRef.current === true) return;

    setSeen(true);
    void storage.saveSwipeHintSeen();
  }, []);

  return { hint, onTaskAdded, onSwiped };
}
