import { useCallback, useRef, useState } from 'react';

/**
 * The new-task form: opened by the + button, submitted by the tick button or the return key, and
 * dismissed by tapping elsewhere. A successful add closes it.
 *
 * Saving outlives the form: dismissing while a task saves closes the form, but the request
 * still finishes and the + button stays busy until then.
 */
export function useDraft(
  addTodo: (title: string) => Promise<void>,
  onAdded: () => void,
  /** `retry` resubmits the title that failed. */
  onAddFailed: (retry: () => void) => void,
) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Refs, not state: the tick button, return key and RETRY must see the latest values synchronously.
  const titleRef = useRef('');
  const savingRef = useRef(false);

  const changeTitle = useCallback((text: string) => {
    titleRef.current = text;
    setTitle(text);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    changeTitle('');
  }, [changeTitle]);

  /** Opens an empty form. Ignored while a task is still saving. */
  const start = useCallback(() => {
    if (savingRef.current) return;

    changeTitle('');
    setOpen(true);
  }, [changeTitle]);

  const save = useCallback(
    async function save(text: string) {
      const trimmed = text.trim();

      if (trimmed === '' || savingRef.current) return;

      savingRef.current = true;
      setSaving(true);

      try {
        await addTodo(trimmed);
        dismiss();
        onAdded();
      } catch {
        // The form, if still open, keeps its text so the user can edit it or tap the tick again.
        onAddFailed(() => void save(trimmed));
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [addTodo, dismiss, onAdded, onAddFailed],
  );

  /** Submits the form's text. Blank titles and submissions while saving are ignored. */
  const submit = useCallback(() => void save(titleRef.current), [save]);

  return {
    open,
    title,
    saving,
    canSubmit: title.trim() !== '' && !saving,
    start,
    changeTitle,
    submit,
    dismiss,
  };
}
