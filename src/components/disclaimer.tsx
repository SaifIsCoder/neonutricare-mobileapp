import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Required wherever a screening result is shown (CLAUDE.md golden rule 9,
 * PRD.md §1). Keep the wording here so it cannot drift between screens.
 *
 * Styled as a soft teal note rather than a bordered card: it is standing advice,
 * not an error, and the mockup reserves borders for interactive surfaces.
 */
export function Disclaimer() {
  const theme = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.primaryLight }]}>
      <Ionicons name="information-circle" size={16} color={theme.primaryDark} />
      <ThemedText type="small" style={[styles.text, { color: theme.primaryDark }]}>
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
    padding: Layout.cardPadding - 2,
    borderRadius: Radius.lg,
  },
  text: { flex: 1 },
});
