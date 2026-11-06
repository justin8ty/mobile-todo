import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, gutter, typography } from '../theme';
import { Checkbox } from './Checkbox';

import type { RefObject } from 'react';
import type { TextInputInstance } from 'react-native';

type Props = {
  inputRef: RefObject<TextInputInstance | null>;
  /** Rejects when the task couldn't be added. */
  onAdd: (title: string) => Promise<void>;
  onAdded: () => void;
  /** `retry` submits whatever the input holds at the time it's called. */
  onAddFailed: (retry: () => void) => void;
  onBlurEmpty: () => void;
};

/** The new-task row at the top of the list. Owns its text and saving state. */
export function DraftRow({ inputRef, onAdd, onAdded, onAddFailed, onBlurEmpty }: Props) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Refs, not state: the return key, Add and RETRY must see the latest values synchronously.
  const titleRef = useRef('');
  const savingRef = useRef(false);

  function changeTitle(text: string) {
    titleRef.current = text;
    setTitle(text);
  }

  async function submit() {
    const submitted = titleRef.current;
    const trimmed = submitted.trim();

    if (trimmed === '' || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);

    try {
      await onAdd(trimmed);

      // The input stays editable while saving; keep anything typed in the meantime.
      if (titleRef.current === submitted) changeTitle('');

      onAdded();
    } catch {
      onAddFailed(() => void submit());
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleBlur() {
    if (titleRef.current.trim() === '') onBlurEmpty();
  }

  const canSubmit = title.trim() !== '';

  return (
    <View style={styles.row}>
      <Checkbox checked={false} />
      <TextInput
        ref={inputRef}
        value={title}
        onChangeText={changeTitle}
        onSubmitEditing={() => void submit()}
        onBlur={handleBlur}
        autoFocus
        placeholder="New task"
        placeholderTextColor={colors.muted}
        returnKeyType="done"
        // Keeps the keyboard open after the return key, ready for the next task.
        submitBehavior="submit"
        cursorColor={colors.brand}
        selectionColor={colors.line}
        accessibilityLabel="New task title"
        style={styles.input}
      />
      {canSubmit && (
        <Pressable
          onPress={() => void submit()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Add"
          accessibilityState={{ busy: saving, disabled: saving }}
          hitSlop={6}
          style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : (
            <Text style={styles.addLabel}>ADD</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 50,
    paddingHorizontal: gutter,
    paddingVertical: 7,
  },
  input: {
    ...typography.row,
    flex: 1,
    minHeight: 36,
    padding: 0,
    color: colors.ink,
  },
  add: {
    height: 36,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.signal,
  },
  addPressed: {
    transform: [{ scale: 0.95 }],
  },
  addLabel: {
    ...typography.action,
    color: colors.ink,
  },
});
