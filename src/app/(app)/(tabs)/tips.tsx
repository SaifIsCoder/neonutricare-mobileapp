import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card, useToneColors, type Tone } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/state-views';
import { Layout } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Tip = {
  id: string;
  category: string;
  title: string | null;
  body: string;
};

/**
 * The mockup labels each tip with a coloured category pill. Known categories get
 * the glyph and tone it shows; anything else falls back to a stable colour
 * picked from the category name, so a newly seeded category still looks native.
 */
const TONES: Tone[] = ['green', 'blue', 'amber', 'teal'];

const CATEGORY_STYLE: Record<string, { tone: Tone; icon: keyof typeof Ionicons.glyphMap }> = {
  nutrition: { tone: 'green', icon: 'leaf' },
  hydration: { tone: 'blue', icon: 'water' },
  iron: { tone: 'amber', icon: 'restaurant' },
  anc: { tone: 'teal', icon: 'calendar' },
  checkup: { tone: 'teal', icon: 'calendar' },
  exercise: { tone: 'blue', icon: 'barbell' },
  hygiene: { tone: 'teal', icon: 'sparkles' },
};

function categoryStyle(category: string) {
  const key = Object.keys(CATEGORY_STYLE).find((word) => category.toLowerCase().includes(word));
  if (key) return CATEGORY_STYLE[key];

  let hash = 0;
  for (let i = 0; i < category.length; i += 1) hash = (hash + category.charCodeAt(i)) % TONES.length;
  return { tone: TONES[hash], icon: 'bulb' as keyof typeof Ionicons.glyphMap };
}

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

      <View style={styles.list}>
        {tips?.map((tip) => (
          <TipCard key={tip.id} tip={tip} secondary={theme.textSecondary} />
        ))}
      </View>
    </Screen>
  );
}

function TipCard({ tip, secondary }: { tip: Tip; secondary: string }) {
  const { tone, icon } = categoryStyle(tip.category);
  const { fill, ink } = useToneColors(tone);

  return (
    <Card>
      <Badge label={tip.category} icon={icon} tint={ink} fill={fill} />
      {!!tip.title && <ThemedText type="cardTitle">{tip.title}</ThemedText>}
      <ThemedText type="default" style={{ color: secondary }}>
        {tip.body}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: Layout.cardGap },
});
