import { useEffect, useRef } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';

import { colors, gutter, typography } from '../theme';
import { Checkbox } from './Checkbox';

import type { Ref } from 'react';
import type { TextInputInstance, ViewInstance } from 'react-native';

// Generous for any real task; stops a pasted wall of text becoming one giant row.
const MAX_TITLE_LENGTH = 200;

type Props = {
  /** The row's outer view, for measuring where the form sits on screen. */
  ref?: Ref<ViewInstance>;
  title: string;
  /** The task's completion state; a new task is unchecked. */
  checked: boolean;
  /** Shown when the input is empty. */
  placeholder: string;
  /** Names the input for screen readers. */
  label: string;
  onChangeTitle: (text: string) => void;
  onSubmit: () => void;
  /** Called when the input loses focus: the user tapped or scrolled elsewhere. */
  onDismiss: () => void;
};

/**
 * The open form's row: the new task at the top of the list, or a task being edited in place.
 * It's laid out like `TodoRow`, so an edited title doesn't move when it becomes an input.
 * It's submitted through the tick button or return key.
 */
export function DraftRow({
  ref,
  title,
  checked,
  placeholder,
  label,
  onChangeTitle,
  onSubmit,
  onDismiss,
}: Props) {
  const inputRef = useRef<TextInputInstance>(null);
  const focused = useRef(false);

  // Android's back button hides the keyboard but leaves the input focused; treat it as dismissing.
  useEffect(() => {
    // Ignores a hide still in flight from before this row's keyboard opened.
    let shown = false;

    const showing = Keyboard.addListener('keyboardDidShow', () => {
      shown = true;
    });

    const hiding = Keyboard.addListener('keyboardDidHide', () => {
      if (shown) inputRef.current?.blur();
    });

    return () => {
      showing.remove();
      hiding.remove();
    };
  }, []);

  // An edited title opens with the cursor at its end, ready to append or delete.
  function onFocus() {
    if (focused.current) return;

    focused.current = true;
    inputRef.current?.setSelection(title.length, title.length);
  }

  return (
    <View ref={ref} style={styles.row}>
      <Checkbox checked={checked} />
      <TextInput
        ref={inputRef}
        value={title}
        onChangeText={onChangeTitle}
        maxLength={MAX_TITLE_LENGTH}
        onSubmitEditing={onSubmit}
        onFocus={onFocus}
        onBlur={onDismiss}
        autoFocus
        // Long titles wrap like they do in `TodoRow`; the return key still submits.
        multiline
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="done"
        // Keeps focus after the return key, so submitting doesn't count as dismissing.
        submitBehavior="submit"
        cursorColor={colors.brand}
        selectionColor={colors.line}
        accessibilityLabel={label}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Matches `TodoRow`'s row and title, so text sits in the same place.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    minHeight: 50,
    paddingHorizontal: gutter,
    paddingVertical: 14,
    backgroundColor: colors.bg,
  },
  input: {
    ...typography.row,
    flex: 1,
    padding: 0,
    textAlignVertical: 'top',
    color: colors.ink,
  },
});
