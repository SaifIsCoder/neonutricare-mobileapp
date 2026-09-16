import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Grey placeholder blocks shaped like the content that is loading. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const theme = useTheme();

  return (
    <Card style={styles.skeleton}>
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
    </Card>
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

/** Centred icon tile + copy, matching the mockup's "Coming soon" screen. */
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
      <View style={[styles.emptyIcon, { backgroundColor: theme.primaryLight }]}>
        <Ionicons name={icon} size={26} color={theme.primaryDark} />
      </View>

      <ThemedText type="screenTitle" style={styles.centeredText}>
        {title}
      </ThemedText>
      <ThemedText type="small" style={[styles.emptyBody, { color: theme.textSecondary }]}>
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
      style={[
        styles.error,
        { backgroundColor: theme.dangerLight, borderColor: theme.danger },
      ]}>
      <View style={styles.errorHeader}>
        <Ionicons name="alert-circle" size={18} color={theme.danger} />
        <ThemedText type="cardTitle" style={{ color: theme.danger }}>
          Something went wrong
        </ThemedText>
      </View>

      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {message}
      </ThemedText>

      {!!onRetry && <Button title="Try again" variant="outline" onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: Spacing.two },
  bar: { height: 12, borderRadius: Spacing.one },
  list: { gap: Layout.listGap },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.xxl - 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  centeredText: { textAlign: 'center' },
  emptyBody: { textAlign: 'center', maxWidth: 260 },
  action: { alignSelf: 'stretch', marginTop: Spacing.three },
  error: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Layout.cardPadding,
    gap: Spacing.two,
  },
  errorHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
