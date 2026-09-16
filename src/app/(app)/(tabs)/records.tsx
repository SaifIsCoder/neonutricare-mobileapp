import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { ListCard } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/state-views';
import { Layout } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchPredictions, type PredictionRow } from '@/lib/predictions';

export default function RecordsScreen() {
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
          icon="time-outline"
          title="No assessments yet"
          body="Run a screening and it will appear here with its date and result."
          actionTitle="Start a screening"
          onAction={() => router.push('/predict')}
        />
      )}

      <View style={styles.list}>
        {rows?.map((row, index) => (
          <ListCard
            key={row.id}
            // Newest row carries the highest number, so the label is stable as
            // long as nothing is deleted — the mockup's "Assessment #12".
            title={`Assessment #${rows.length - index}`}
            subtitle={`${formatDate(row.created_at)}${summarise(row)}`}
            trailing={<Badge label={row.prediction} />}
            onPress={() => router.push({ pathname: '/record/[id]', params: { id: row.id } })}
          />
        ))}
      </View>
    </Screen>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function summarise(row: PredictionRow): string {
  const parts: string[] = [];
  if (row.hemoglobin !== null) parts.push(`Hb ${row.hemoglobin}`);
  if (row.antenatal_visits !== null) parts.push(`${row.antenatal_visits} visits`);
  return parts.length ? ` · ${parts.join(' · ')}` : '';
}

const styles = StyleSheet.create({
  list: { gap: Layout.listGap },
});
