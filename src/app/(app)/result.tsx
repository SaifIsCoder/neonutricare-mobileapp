import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { PredictionDetail } from '@/components/prediction-detail';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/state-views';
import { Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useTheme } from '@/hooks/use-theme';
import { fetchPrediction } from '@/lib/predictions';

export default function ResultScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const load = useCallback(() => fetchPrediction(id), [id]);
  const { data: row, error, loading, refresh } = useAsyncData(load);

  return (
    <Screen title="Screening complete" subtitle="Saved to your health records">
      {!!error && <ErrorState message={error} onRetry={refresh} />}
      {loading && !error && <SkeletonCard lines={4} />}

      {!loading && !error && !row && (
        <EmptyState
          icon="help-circle-outline"
          title="Assessment not found"
          body="It may have been deleted. Check your health records."
        />
      )}

      {!!row && (
        <>
          {/* Rows saved before the service was wired up carry this placeholder. */}
          {row.prediction === 'Pending' && (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              This assessment was saved before the prediction service was connected, so it has
              no result. Run a new screening to get one.
            </ThemedText>
          )}

          <PredictionDetail row={row} />
        </>
      )}

      <Button
        title="Done"
        onPress={() => router.replace('/records')}
        style={styles.done}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  done: { marginTop: Spacing.one },
});
