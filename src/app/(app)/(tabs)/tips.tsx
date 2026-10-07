import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel, useToneColors, type Tone } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/state-views';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useTheme } from '@/hooks/use-theme';
import type { PredictionRow } from '@/lib/predictions';
import { fetchPersonalizedTips, type PersonalizedTip } from '@/lib/rag-api';
import { supabase } from '@/lib/supabase';
import { clearCachedTips, getCachedTips, setCachedTips } from '@/lib/tips-storage';

type Tip = {
  id: string;
  category: string;
  title: string | null;
  body: string;
};

type TipsData = {
  generalTips: Tip[];
  latestAssessment: PredictionRow | null;
  personalizedTips: PersonalizedTip[];
  personalizedError?: string | null;
};

const TONES: Tone[] = ['green', 'blue', 'amber', 'teal'];

const CATEGORY_STYLE: Record<string, { tone: Tone; icon: keyof typeof Ionicons.glyphMap }> = {
  nutrition: { tone: 'green', icon: 'leaf' },
  hydration: { tone: 'blue', icon: 'water' },
  iron: { tone: 'amber', icon: 'restaurant' },
  blood: { tone: 'amber', icon: 'shield-checkmark' },
  anc: { tone: 'teal', icon: 'calendar' },
  checkup: { tone: 'teal', icon: 'calendar' },
  pressure: { tone: 'amber', icon: 'heart' },
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
  const router = useRouter();

  const load = useCallback(async (): Promise<TipsData> => {
    // 1. Fetch general guidance tips from public.health_tips
    const { data: generalData, error: generalError } = await supabase
      .from('health_tips')
      .select('id, category, title, body')
      .order('sort_order', { ascending: true });

    if (generalError) throw new Error(generalError.message);
    const generalTips = generalData ?? [];

    // 2. Fetch the user's latest completed assessment from public.predictions
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assessmentError) {
      console.warn('[TipsScreen] Error fetching latest assessment:', assessmentError.message);
    }

    const latestAssessment: PredictionRow | null = assessmentData ?? null;

    // 3. If there is a saved assessment, load or generate personalized tips
    let personalizedTips: PersonalizedTip[] = [];
    let personalizedError: string | null = null;

    if (latestAssessment) {
      try {
        const cached = await getCachedTips(latestAssessment.id);
        if (cached && cached.length > 0) {
          personalizedTips = cached;
        } else {
          // On-demand fetch from FastAPI WHO RAG service
          const generated = await fetchPersonalizedTips({
            hemoglobin: latestAssessment.hemoglobin,
            pre_eclampsia: latestAssessment.pre_eclampsia,
            iron_injection: latestAssessment.iron_injection,
            infection: latestAssessment.infection,
            weight_gain: latestAssessment.weight_gain,
            antenatal_visits: latestAssessment.antenatal_visits,
            booked: latestAssessment.booked,
            parity: latestAssessment.parity,
            age: latestAssessment.age,
            prediction: latestAssessment.prediction,
          });

          personalizedTips = generated;
          if (generated.length > 0) {
            await setCachedTips(latestAssessment.id, generated);
          }
        }
      } catch (err) {
        console.warn('[TipsScreen] Error generating personalized tips:', err);
        personalizedError = err instanceof Error ? err.message : 'Could not generate AI tips';
      }
    }

    return {
      generalTips,
      latestAssessment,
      personalizedTips,
      personalizedError,
    };
  }, []);

  const { data, error, loading, refreshing, refresh } = useAsyncData(load);

  const onRefresh = useCallback(async () => {
    if (data?.latestAssessment?.id) {
      await clearCachedTips(data.latestAssessment.id);
    }
    await refresh();
  }, [data, refresh]);

  const assessmentDate = data?.latestAssessment?.created_at
    ? new Date(data.latestAssessment.created_at).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <Screen
      title="Health tips"
      subtitle="Personalized care and WHO guidance"
      onRefresh={onRefresh}
      refreshing={refreshing}>
      {!!error && <ErrorState message={error} onRetry={refresh} />}
      {loading && !error && <SkeletonList count={4} />}

      {!loading && !error && (
        <View style={styles.container}>
          {/* Section: Personalized AI Tips */}
          {data?.latestAssessment ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <SectionLabel>Personalized for you</SectionLabel>
                {assessmentDate && (
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Screening from {assessmentDate}
                  </ThemedText>
                )}
              </View>

              {data.personalizedTips.length > 0 ? (
                <View style={styles.list}>
                  {data.personalizedTips.map((tip) => (
                    <PersonalizedTipCard key={tip.id} tip={tip} />
                  ))}
                </View>
              ) : data.personalizedError ? (
                <Card style={styles.warningCard}>
                  <ThemedText type="cardTitle" style={{ color: theme.warning }}>
                    AI Tips Unavailable
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {data.personalizedError}. Pull down to retry generating your personalized guidance.
                  </ThemedText>
                </Card>
              ) : null}
            </View>
          ) : (
            /* Call to Action for users with no assessment */
            <Card style={styles.ctaCard}>
              <View style={styles.ctaHeader}>
                <View style={[styles.ctaIconBadge, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="sparkles" size={20} color={theme.primaryDark} />
                </View>
                <View style={styles.ctaTextWrap}>
                  <ThemedText type="cardTitle">Get Personalized AI Tips</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Complete a quick health screening to receive WHO-guided tips tailored directly to your pregnancy profile.
                  </ThemedText>
                </View>
              </View>

              <Button
                title="Start risk screening"
                icon="arrow-forward"
                onPress={() => router.push('/predict')}
                style={styles.ctaButton}
              />
            </Card>
          )}

          {/* Section: General Guidance */}
          <View style={styles.section}>
            <SectionLabel>General guidance</SectionLabel>

            {data?.generalTips.length === 0 ? (
              <EmptyState
                icon="bulb-outline"
                title="No tips yet"
                body="General tips are currently unavailable."
              />
            ) : (
              <View style={styles.list}>
                {data?.generalTips.map((tip) => (
                  <GeneralTipCard key={tip.id} tip={tip} secondary={theme.textSecondary} />
                ))}
              </View>
            )}
          </View>

          <Disclaimer />
        </View>
      )}
    </Screen>
  );
}

function PersonalizedTipCard({ tip }: { tip: PersonalizedTip }) {
  const theme = useTheme();
  const { tone, icon } = categoryStyle(tip.category);
  const { fill, ink } = useToneColors(tone);

  const isHighPriority = tip.priority === 'high';

  return (
    <Card style={isHighPriority ? [styles.priorityBorder, { borderColor: theme.warning }] : undefined}>
      <View style={styles.cardHeader}>
        <Badge label={tip.category} icon={icon} tint={ink} fill={fill} />
        {isHighPriority && (
          <Badge
            label="Priority"
            icon="alert-circle"
            tint={theme.warning}
            fill={theme.warningLight}
          />
        )}
      </View>

      <ThemedText type="cardTitle">{tip.title}</ThemedText>
      <ThemedText type="default" style={{ color: theme.textSecondary }}>
        {tip.body}
      </ThemedText>

      <View style={styles.evidenceFooter}>
        <Ionicons name="shield-checkmark" size={13} color={theme.textMuted} />
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {tip.evidence_source || 'WHO Maternal Health Guidelines'}
        </ThemedText>
      </View>
    </Card>
  );
}

function GeneralTipCard({ tip, secondary }: { tip: Tip; secondary: string }) {
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
  container: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    gap: Layout.cardGap,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  priorityBorder: {
    borderLeftWidth: 4,
  },
  evidenceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  warningCard: {
    gap: Spacing.one,
  },
  ctaCard: {
    gap: Spacing.three,
  },
  ctaHeader: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  ctaIconBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextWrap: {
    flex: 1,
    gap: 2,
  },
  ctaButton: {
    alignSelf: 'flex-start',
  },
});
