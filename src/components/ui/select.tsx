import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
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
 *
 * The trigger matches `.field select` in the mockup; the sheet re-uses the same
 * card surface, radii and border so it reads as part of the same system.
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
      <ThemedText type="label" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>

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
            backgroundColor: theme.card,
            borderColor: error ? theme.danger : open ? theme.primary : theme.border,
            borderWidth: error || open ? 1.5 : 1,
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}>
        <ThemedText
          style={[styles.triggerText, { color: selected ? theme.text : theme.textMuted }]}
          numberOfLines={1}>
          {selected?.label ?? placeholder}
        </ThemedText>
        <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
      </Pressable>

      {!!error && (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          accessibilityLabel="Close"
          onPress={() => setOpen(false)}>
          {/* Swallow taps on the sheet itself so they don't close the modal. */}
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {}}>
            <View style={[styles.grabber, { backgroundColor: theme.border }]} />

            <ThemedText type="screenTitle" style={styles.sheetTitle}>
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
                          ? theme.primaryLight
                          : pressed
                            ? theme.backgroundSelected
                            : 'transparent',
                      },
                    ]}>
                    <ThemedText
                      type={isSelected ? 'smallBold' : 'default'}
                      style={styles.optionText}>
                      {choice.label}
                    </ThemedText>
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
  wrapper: { gap: Spacing.one + 1 },
  trigger: {
    minHeight: Layout.controlHeight - 4,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: Spacing.two + 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  triggerText: { flex: 1, fontSize: 14 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14, 36, 34, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    maxHeight: '60%',
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderWidth: 1,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    paddingHorizontal: Layout.cardPadding,
    gap: Spacing.two,
  },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: Spacing.one },
  sheetTitle: { paddingHorizontal: Spacing.two, marginBottom: Spacing.one },
  option: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  optionText: { flex: 1 },
});
