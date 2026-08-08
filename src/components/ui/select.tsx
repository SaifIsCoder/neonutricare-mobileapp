import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Choice } from '@/lib/prediction-form';

export type SelectProps = {
  label: string;
  /** The selected option's code, or undefined when nothing is chosen. */
  value: string | undefined;
  choices: readonly Choice[];
  onChange: (code: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

/**
 * Dropdown built on a Modal sheet rather than a native picker: the options are
 * always two short labels, and this keeps one look across iOS, Android and web
 * without another dependency.
 */
export function Select({
  label,
  value,
  choices,
  onChange,
  placeholder = 'Select…',
  error,
  disabled,
}: SelectProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const selected = choices.find((choice) => choice.code === value);

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">{label}</ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error ? theme.danger : theme.border,
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}>
        <ThemedText
          style={[styles.triggerText, !selected && { color: theme.textSecondary }]}
          numberOfLines={1}>
          {selected?.label ?? placeholder}
        </ThemedText>
        <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>

      {!!error && (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          accessibilityLabel="Close"
          onPress={() => setOpen(false)}>
          {/* Swallow taps on the sheet itself so they don't close the modal. */}
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => {}}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              {label}
            </ThemedText>

            <ScrollView bounces={false}>
              {choices.map((choice) => {
                const isSelected = choice.code === value;
                return (
                  <Pressable
                    key={choice.code}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(choice.code);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: isSelected
                          ? theme.backgroundSelected
                          : pressed
                            ? theme.backgroundElement
                            : 'transparent',
                      },
                    ]}>
                    <ThemedText style={styles.optionText}>{choice.label}</ThemedText>
                    {isSelected && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.one },
  trigger: {
    minHeight: 52,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  triggerText: { flex: 1, fontSize: 16 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    maxHeight: '60%',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  sheetTitle: { paddingHorizontal: Spacing.two },
  option: {
    minHeight: 52,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  optionText: { flex: 1, fontSize: 16 },
});
