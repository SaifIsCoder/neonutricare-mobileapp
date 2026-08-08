import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/state-views';
import { Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Tip = {
  id: string;
  category: string;
  title: string | null;
  body: string;
};

export default function TipsScreen() {
  const theme = useTheme();

  const load = useCallback(async (): Promise<Tip[]> => {
    // is_active is enforced by the RLS policy, so no filter is needed here.
    const { data, error } = await supabase
      .from('health_tips')
      .select('id, category, title, body')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }, []);

  const { data: tips, error, loading, refreshing, refresh } = useAsyncData(load);

  // Group by category so each heading appears once (PRD.md §5 screen 9).
  const groups = new Map<string, Tip[]>();
  for (const tip of tips ?? []) {
    const existing = groups.get(tip.category);
    if (existing) existing.push(tip);
    else groups.set(tip.category, [tip]);
  }

  return (
    <Screen
      title="Health tips"
      subtitle="Nutrition and antenatal guidance"
      onRefresh={refresh}
      refreshing={refreshing}>
      {!!error && <ErrorState message={error} onRetry={refresh} />}
      {loading && !error && <SkeletonList count={4} />}

      {!loading && !error && tips?.length === 0 && (
        <EmptyState
          icon="bulb-outline"
          title="No tips yet"
          body="Seed the health_tips table by running supabase/schema.sql §8."
        />
      )}

      {[...groups.entries()].map(([category, items]) => (
        <View key={category} style={styles.group}>
          <ThemedText type="small" style={[styles.category, { color: theme.primary }]}>
            {category.toUpperCase()}
          </ThemedText>

          {items.map((tip) => (
            <View
              key={tip.id}
              style={[
                styles.card,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              {!!tip.title && <ThemedText type="smallBold">{tip.title}</ThemedText>}
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {tip.body}
              </ThemedText>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  category: { fontSize: 12, letterSpacing: 0.6 },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
});
