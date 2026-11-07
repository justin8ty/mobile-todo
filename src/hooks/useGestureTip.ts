import { useEffect, useState } from 'react';

import * as storage from '../storage/todos';
import { HINT_DELAY_MS } from './useSwipeHint';

/**
 * Shows a one-time tip naming the row gestures (swipe to delete, hold to edit) the first time the
 * list shows tasks, timed with the launch swipe hint. Never again once shown.
 *
 * Unlike the swipe hint, reduce motion doesn't skip it: for those users it's the only cue.
 * `show` must be stable, or each render restarts the delay.
 */
export function useGestureTip(hasTasks: boolean, show: () => void) {
  // `null` until the stored flag has been read.
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    void storage.loadGestureTipSeen().then((value) => {
      if (active) setSeen(value);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (seen !== false || !hasTasks) return;

    const timer = setTimeout(() => {
      setSeen(true);
      void storage.saveGestureTipSeen();
      show();
    }, HINT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [seen, hasTasks, show]);
}
