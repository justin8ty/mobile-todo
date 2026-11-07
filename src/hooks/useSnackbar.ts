import { useCallback, useEffect, useRef, useState } from 'react';

const VISIBLE_MS = 4000;

export type SnackbarAction = { label: string; onPress: () => void };

export type SnackbarMessage = {
  id: number;
  text: string;
  action: SnackbarAction | null;
  /** Shown while another message was still up, so it takes that one's place rather than arriving. */
  replacing: boolean;
};

/** One message at a time: showing a new one replaces the current one and restarts the timer. */
export function useSnackbar() {
  const [message, setMessage] = useState<SnackbarMessage | null>(null);
  const lastId = useRef(0);

  useEffect(() => {
    if (message === null) return;

    const timer = setTimeout(() => setMessage(null), VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [message]);

  /** Returns the message's ID, for dismissing exactly this message later. */
  const show = useCallback((text: string, action: SnackbarAction | null = null): number => {
    lastId.current += 1;

    const id = lastId.current;

    setMessage((current) => ({ id, text, action, replacing: current !== null }));

    return id;
  }, []);

  /** Hides message `id` if it is still showing; a newer message is left alone. */
  const dismiss = useCallback((id: number) => {
    setMessage((current) => (current?.id === id ? null : current));
  }, []);

  /** Runs the current message's action and hides it. */
  const pressAction = useCallback(() => {
    if (message === null) return;

    setMessage(null);
    message.action?.onPress();
  }, [message]);

  return { message, show, dismiss, pressAction };
}
