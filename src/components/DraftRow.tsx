import { useEffect, useRef } from 'react';
import { Keyboard, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { colors, gutter, typography } from '../theme';
import { Checkbox } from './Checkbox';

import type { TextInputInstance } from 'react-native';

type Props = {
  title: string;
  onChangeTitle: (text: string) => void;
  onSubmit: () => void;
  /** Called when the input loses focus: the user tapped or scrolled elsewhere. */
  onDismiss: () => void;
};

/** The new-task row at the top of the list. It's submitted through the tick button or return key. */
export function DraftRow({ title, onChangeTitle, onSubmit, onDismiss }: Props) {
  const inputRef = useRef<TextInputInstance>(null);

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

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.row}>
      <Checkbox checked={false} />
      <TextInput
        ref={inputRef}
        value={title}
        onChangeText={onChangeTitle}
        onSubmitEditing={onSubmit}
        onBlur={onDismiss}
        autoFocus
        placeholder="New task"
        placeholderTextColor={colors.muted}
        returnKeyType="done"
        // Keeps focus after the return key, so submitting doesn't count as dismissing.
        submitBehavior="submit"
        cursorColor={colors.brand}
        selectionColor={colors.line}
        accessibilityLabel="New task title"
        style={styles.input}
      />
    </Animated.View>
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
});
