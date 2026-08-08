import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Required wherever a screening result is shown (CLAUDE.md golden rule 9,
 * PRD.md §1). Keep the wording here so it cannot drift between screens.
 */
export function Disclaimer() {
  const theme = useTheme();

  return (
    <View
      style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Ionicons name="information-circle" size={20} color={theme.textSecondary} />
      <ThemedText type="small" style={[styles.text, { color: theme.textSecondary }]}>
        This is a screening indication, not a diagnosis. Always consult a qualified health provider.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
});
