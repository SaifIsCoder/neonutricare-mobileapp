import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Colour for a screening label. 'Pending' is the mock value written until the
 * FastAPI service exists (TASKS.md Phase 3), so it gets a neutral treatment
 * rather than being coloured as a clinical outcome.
 */
export function useLabelTint(label: string | null | undefined) {
  const theme = useTheme();
  if (label === 'Healthy') return theme.success;
  if (label === 'At Risk') return theme.danger;
  return theme.textSecondary;
}

export function Badge({ label }: { label: string | null | undefined }) {
  const theme = useTheme();
  const tint = useLabelTint(label);

  return (
    <View style={[styles.badge, { borderColor: tint, backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={{ color: tint }}>
        {label ?? 'Unknown'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
