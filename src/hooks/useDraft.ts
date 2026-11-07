import { useCallback, useRef, useState } from 'react';

/** What the open form writes to: a new task, or the task with `id`. */
export type DraftTarget = { kind: 'new' } | { kind: 'edit'; id: number };

const NEW: DraftTarget = { kind: 'new' };

/**
 * The one open form: a new task (opened by the + button) or a task being edited (opened by
 * long-press). Either is submitted by the tick button or the return key, and dismissed by tapping
 * elsewhere. Opening one closes the other.
 *
 * Adding outlives the form: dismissing while a task saves closes the form, but the request
 * still finishes and the + button stays busy until then. Editing is local, so it saves at once.
 */
export function useDraft(
  addTodo: (title: string) => Promise<void>,
  editTodo: (id: number, title: string) => void,
  onAdded: () => void,
  /** `retry` resubmits the title that failed. */
  onAddFailed: (retry: () => void) => void,
) {
  const [target, setTarget] = useState<DraftTarget | null>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Refs, not state: the tick button, return key and RETRY must see the latest values synchronously.
  const targetRef = useRef<DraftTarget | null>(null);
  const titleRef = useRef('');
  const savingRef = useRef(false);

  const changeTitle = useCallback((text: string) => {
    titleRef.current = text;
    setTitle(text);
  }, []);

  const open = useCallback(
    (next: DraftTarget | null, text: string) => {
      targetRef.current = next;
      setTarget(next);
      changeTitle(text);
    },
    [changeTitle],
  );

  const dismiss = useCallback(() => open(null, ''), [open]);

  /** Opens an empty new-task form. Ignored while a task is still saving. */
  const startNew = useCallback(() => {
    if (savingRef.current) return;

    open(NEW, '');
  }, [open]);

  /**
   * Opens the form on an existing task, holding its current title. Ignored while a task is still
   * saving, since the + button can't act as the tick until then. Returns whether it opened.
   */
  const startEdit = useCallback(
    (id: number, currentTitle: string): boolean => {
      if (savingRef.current) return false;

      open({ kind: 'edit', id }, currentTitle);

      return true;
    },
    [open],
  );

  const add = useCallback(
    async function add(text: string) {
      const trimmed = text.trim();

      if (trimmed === '' || savingRef.current) return;

      savingRef.current = true;
      setSaving(true);

      try {
        await addTodo(trimmed);

        if (targetRef.current?.kind === 'new') dismiss();

        onAdded();
      } catch {
        // The form, if still open, keeps its text so the user can edit it or tap the tick again.
        onAddFailed(() => void add(trimmed));
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [addTodo, dismiss, onAdded, onAddFailed],
  );

  /** Submits the open form. Blank titles and submissions while saving are ignored. */
  const submit = useCallback(() => {
    const current = targetRef.current;
    const text = titleRef.current;

    if (current === null || text.trim() === '') return;

    if (current.kind === 'new') {
      void add(text);

      return;
    }

    editTodo(current.id, text);
    dismiss();
  }, [add, editTodo, dismiss]);

  return {
    target,
    /** The ID of the task being edited, or `null`. */
    editingId: target?.kind === 'edit' ? target.id : null,
    title,
    saving,
    canSubmit: title.trim() !== '' && !saving,
    startNew,
    startEdit,
    changeTitle,
    submit,
    dismiss,
  };
}
