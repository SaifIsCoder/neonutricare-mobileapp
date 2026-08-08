import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Grey placeholder blocks shaped like the content that is loading. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: theme.backgroundSelected,
              // Taper the last line so the block reads as text, not a table.
              width: index === lines - 1 ? '55%' : '100%',
            },
          ]}
        />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} lines={2} />
      ))}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actionTitle,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.centered}>
      <Ionicons name={icon} size={40} color={theme.textSecondary} />
      <ThemedText type="smallBold" style={styles.centeredText}>
        {title}
      </ThemedText>
      <ThemedText type="small" style={[styles.centeredText, { color: theme.textSecondary }]}>
        {body}
      </ThemedText>
      {!!actionTitle && !!onAction && (
        <Button title={actionTitle} onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const theme = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
      <View style={styles.errorHeader}>
        <Ionicons name="alert-circle" size={20} color={theme.danger} />
        <ThemedText type="smallBold" style={{ color: theme.danger }}>
          Something went wrong
        </ThemedText>
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {message}
      </ThemedText>
      {!!onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  bar: { height: 14, borderRadius: Spacing.one },
  list: { gap: Spacing.two },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  centeredText: { textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: Spacing.two },
  errorHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
