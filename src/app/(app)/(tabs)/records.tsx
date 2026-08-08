import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/state-views';
import { Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useTheme } from '@/hooks/use-theme';
import { fetchPredictions, type PredictionRow } from '@/lib/predictions';

export default function RecordsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const load = useCallback(() => fetchPredictions(), []);
  const { data: rows, error, loading, refreshing, refresh } = useAsyncData(load);

  const isEmpty = !loading && !error && rows?.length === 0;

  return (
    <Screen
      title="Health records"
      subtitle="Your assessments, newest first"
      onRefresh={refresh}
      refreshing={refreshing}>
      {!!error && <ErrorState message={error} onRetry={refresh} />}
      {loading && !error && <SkeletonList count={3} />}

      {isEmpty && (
        <EmptyState
          icon="document-text-outline"
          title="No assessments yet"
          body="Run a screening and it will appear here with its date and result."
          actionTitle="Start a screening"
          onAction={() => router.push('/predict')}
        />
      )}

      <View style={styles.list}>
        {rows?.map((row) => (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/record/[id]', params: { id: row.id } })}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <View style={styles.cardText}>
              <Badge label={row.prediction} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {formatDate(row.created_at)}
                {summarise(row)}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function summarise(row: PredictionRow): string {
  const parts: string[] = [];
  if (row.hemoglobin !== null) parts.push(`Hb ${row.hemoglobin}`);
  if (row.antenatal_visits !== null) parts.push(`${row.antenatal_visits} visits`);
  return parts.length ? ` · ${parts.join(' · ')}` : '';
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardText: { flex: 1, gap: Spacing.one },
});
