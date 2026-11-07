import { useEffect, useState } from 'react';
import { KeyboardEvents } from 'react-native-keyboard-controller';

import type { RefObject } from 'react';
import type { FlatList, ViewInstance } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Keeps the open form in view while the keyboard is up. The keyboard covers the list rather than
 * resizing it, so a task edited near the bottom would sit behind the keyboard and the controls
 * lifted above it.
 *
 * Returns the keyboard's height (0 while hidden), for the list to add as bottom padding so its last
 * tasks can scroll above the keyboard. Once the keyboard has opened, a form below the visible area
 * is scrolled just into view.
 *
 * The visible area ends `clearance` above the top of `boundaryRef` (the bottom bar). Both views are
 * measured on screen, so the result doesn't depend on window or inset arithmetic.
 */
export function useKeyboardReveal<T>(
  listRef: RefObject<FlatList<T> | null>,
  scrollY: SharedValue<number>,
  formRef: RefObject<ViewInstance | null>,
  boundaryRef: RefObject<ViewInstance | null>,
  clearance: number,
): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // After the keyboard has opened, so the bar has been lifted and the list has its extra padding.
    function reveal() {
      const form = formRef.current;
      const boundary = boundaryRef.current;

      if (form === null || boundary === null) return;

      boundary.measureInWindow((_boundaryX, boundaryTop) => {
        form.measureInWindow((_formX, formTop, _formWidth, formHeight) => {
          const hidden = formTop + formHeight - (boundaryTop - clearance);

          if (hidden <= 0) return;

          listRef.current?.scrollToOffset({ offset: scrollY.value + hidden, animated: true });
        });
      });
    }

    const subscriptions = [
      KeyboardEvents.addListener('keyboardWillShow', (event) => setKeyboardHeight(event.height)),
      KeyboardEvents.addListener('keyboardDidShow', reveal),
      KeyboardEvents.addListener('keyboardWillHide', () => setKeyboardHeight(0)),
    ];

    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, [listRef, scrollY, formRef, boundaryRef, clearance]);

  return keyboardHeight;
}
