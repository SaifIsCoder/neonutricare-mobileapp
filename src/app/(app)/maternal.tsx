import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ListCard, type Tone } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/state-views';
import { Layout, Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Guide = {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  body: string | null;
};

const GUIDE_STYLE: Record<string, { icon: keyof typeof Ionicons.glyphMap; tone: Tone }> = {
  baby: { icon: 'body', tone: 'teal' },
  carrot: { icon: 'nutrition', tone: 'green' },
  dumbbell: { icon: 'barbell', tone: 'blue' },
  'calendar-check': { icon: 'calendar', tone: 'amber' },
};

const FALLBACK_TONES: Tone[] = ['teal', 'green', 'blue', 'amber'];

export default function MaternalScreen() {
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<Guide[]> => {
    const { data, error } = await supabase
      .from('maternal_guides')
      .select('id, title, subtitle, icon, body')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }, []);

  const { data: guides, error, loading, refreshing, refresh } = useAsyncData(load);

  return (
    <Screen
      title="Maternal support"
      subtitle="Guidance through pregnancy and after"
      showBack
      onRefresh={refresh}
      refreshing={refreshing}>
      {!!error && <ErrorState message={error} onRetry={refresh} />}
      {loading && !error && <SkeletonList count={4} />}

      {!loading && !error && guides?.length === 0 && (
        <EmptyState
          icon="heart-outline"
          title="No guides yet"
          body="Seed the maternal_guides table by running supabase/schema.sql §8."
        />
      )}

      <View style={styles.list}>
        {guides?.map((guide, index) => {
          const expanded = expandedId === guide.id;
          const hasBody = !!guide.body?.trim();
          const style = GUIDE_STYLE[guide.icon ?? ''] ?? {
            icon: 'heart' as keyof typeof Ionicons.glyphMap,
            tone: FALLBACK_TONES[index % FALLBACK_TONES.length],
          };

          return (
            <ListCard
              key={guide.id}
              icon={style.icon}
              tone={style.tone}
              title={guide.title}
              subtitle={guide.subtitle ?? undefined}
              onPress={hasBody ? () => setExpandedId(expanded ? null : guide.id) : undefined}
              trailing={
                hasBody ? (
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.textMuted}
                  />
                ) : null
              }>
              {expanded && !!guide.body && (
                <ThemedText
                  type="small"
                  style={[styles.body, { color: theme.textSecondary, borderTopColor: theme.border }]}>
                  {guide.body}
                </ThemedText>
              )}
            </ListCard>
          );
        })}
      </View>

      {/* The seed rows carry no body text, so say so rather than looking broken. */}
      {!loading && !error && !!guides?.length && guides.every((g) => !g.body?.trim()) && (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Guide contents have not been written yet. Add a `body` to each row in `maternal_guides`
          and it will appear here.
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Layout.listGap },
  body: { borderTopWidth: 1, paddingTop: Spacing.two + 2, marginTop: Spacing.one },
});
