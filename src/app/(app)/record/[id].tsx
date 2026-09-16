import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { PredictionDetail } from '@/components/prediction-detail';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/state-views';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchPrediction } from '@/lib/predictions';

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const load = useCallback(() => fetchPrediction(id), [id]);
  const { data: row, error, loading, refreshing, refresh } = useAsyncData(load);

  const created = row?.created_at ? new Date(row.created_at) : null;

  return (
    <Screen
      title="Assessment"
      subtitle={
        created
          ? `${created.toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })} · ${created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : undefined
      }
      showBack
      onRefresh={refresh}
      refreshing={refreshing}>
      {!!error && <ErrorState message={error} onRetry={refresh} />}
      {loading && !error && <SkeletonCard lines={4} />}

      {!loading && !error && !row && (
        <EmptyState
          icon="help-circle"
          title="Assessment not found"
          body="This record no longer exists, or belongs to another account."
        />
      )}

      {!!row && <PredictionDetail row={row} />}
    </Screen>
  );
}
