import { useId, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Validation message shown under the field; also flips the border to danger. */
  error?: string;
};

/** `.field` — 13px semibold label over a white, 12px-radius input. */
export function TextField({ label, error, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const id = useId();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={styles.wrapper}>
      <ThemedText type="label" nativeID={id} style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>

      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={id}
        placeholderTextColor={theme.textMuted}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            color: theme.text,
          },
          style,
        ]}
        {...rest}
      />

      {!!error && (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.one + 1 },
  input: {
    minHeight: Layout.controlHeight - 4,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: Spacing.two + 3,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
});
