import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/state-views';
import { Spacing } from '@/constants/theme';
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

/** Seeded icon names are Font Awesome-ish; map them onto Ionicons. */
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  baby: 'body-outline',
  carrot: 'nutrition-outline',
  dumbbell: 'barbell-outline',
  'calendar-check': 'calendar-outline',
};

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
        {guides?.map((guide) => {
          const expanded = expandedId === guide.id;
          const hasBody = !!guide.body?.trim();

          return (
            <Pressable
              key={guide.id}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              disabled={!hasBody}
              onPress={() => setExpandedId(expanded ? null : guide.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  opacity: pressed && hasBody ? 0.85 : 1,
                },
              ]}>
              <View style={styles.cardHeader}>
                <View style={[styles.icon, { backgroundColor: theme.background }]}>
                  <Ionicons
                    name={ICONS[guide.icon ?? ''] ?? 'heart-outline'}
                    size={22}
                    color={theme.primary}
                  />
                </View>

                <View style={styles.cardText}>
                  <ThemedText type="smallBold">{guide.title}</ThemedText>
                  {!!guide.subtitle && (
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {guide.subtitle}
                    </ThemedText>
                  )}
                </View>

                {hasBody && (
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.textSecondary}
                  />
                )}
              </View>

              {expanded && !!guide.body && (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {guide.body}
                </ThemedText>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* The seed rows carry no body text, so say so rather than looking broken. */}
      {!loading && !error && !!guides?.length && guides.every((g) => !g.body?.trim()) && (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Guide contents have not been written yet. Add a `body` to each row in
          `maternal_guides` and it will appear here.
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: Spacing.half },
});
