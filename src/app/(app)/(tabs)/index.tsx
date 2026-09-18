import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { ThemedText } from '@/components/themed-text';
import { ListCard, SectionLabel, type Tone } from '@/components/ui/card';
import { IconButton, Screen } from '@/components/ui/screen';
import { ErrorState, SkeletonCard } from '@/components/ui/state-views';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { fetchDashboardStats, type DashboardStats } from '@/lib/predictions';
import { supabase } from '@/lib/supabase';

type Overview = {
  fullName: string | null;
  stats: DashboardStats;
};

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session!.user.id;

  const fetchOverview = useCallback(async (): Promise<Overview> => {
    const [profileResult, stats] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
      fetchDashboardStats(),
    ]);

    if (profileResult.error) throw new Error(profileResult.error.message);
    return { fullName: profileResult.data?.full_name ?? null, stats };
  }, [userId]);

  const { data, error, loading, refreshing, refresh } = useAsyncData(fetchOverview);

  const greetingName = data?.fullName?.trim() || session?.user.email?.split('@')[0] || 'there';
  const stats = data?.stats;

  return (
    <Screen
      title={greetingName}
      onRefresh={refresh}
      refreshing={refreshing}
      header={
        <>
          <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
            <ThemedText type="cardTitle" style={{ color: theme.primaryDark }}>
              {initials(greetingName)}
            </ThemedText>
          </View>

          <View style={styles.greeting}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {timeOfDayGreeting()}
            </ThemedText>
            <ThemedText type="screenTitle" numberOfLines={1}>
              {greetingName}
            </ThemedText>
          </View>

          <IconButton icon="refresh" accessibilityLabel="Refresh overview" onPress={refresh} />
        </>
      }>
      {!!error && <ErrorState message={error} onRetry={refresh} />}

      {loading && !error ? (
        <SkeletonCard lines={2} />
      ) : (
        <View style={styles.metricGrid}>
          <Metric
            value={stats?.total_assessments}
            label="Total assessments"
            tone="teal"
            style={styles.metricHalf}
          />
          <Metric
            value={stats?.low_risk_cases}
            label="Low risk cases"
            tone="green"
            style={styles.metricHalf}
          />
          <Metric
            value={stats?.high_risk_cases}
            label="High risk cases"
            tone="amber"
            style={styles.metricFull}
          />
        </View>
      )}

      <SectionLabel style={styles.sectionLabel}>Quick actions</SectionLabel>

      <View style={styles.actions}>
        <ListCard
          icon="clipboard"
          tone="teal"
          title="Risk prediction"
          subtitle="Run a new malnutrition screening"
          onPress={() => router.push('/predict')}
        />
        <ListCard
          icon="woman"
          tone="blue"
          title="Maternal support"
          subtitle="Guides for pregnancy & nutrition"
          onPress={() => router.push('/maternal')}
        />
        <ListCard
          icon="time"
          tone="green"
          title="Health records"
          subtitle="View prediction history"
          onPress={() => router.push('/records')}
        />
        <ListCard
          icon="leaf"
          tone="amber"
          title="Health tips"
          subtitle="Daily nutrition & care advice"
          onPress={() => router.push('/tips')}
        />
        <ListCard
          icon="chatbubbles"
          tone="teal"
          title="AI health assistant"
          subtitle="Chat with our health assistant"
          onPress={() => router.push('/assistant')}
        />
      </View>
      <Disclaimer />
    </Screen>
  );
}

/** `.metric` — a soft tinted tile with a display numeral over a small caption. */
function Metric({
  value,
  label,
  tone,
  style,
}: {
  value?: number;
  label: string;
  tone: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  const palette = {
    teal: { fill: theme.primaryLight, ink: theme.primaryDark },
    green: { fill: theme.successLight, ink: theme.success },
    amber: { fill: theme.warningLight, ink: theme.warning },
    blue: { fill: theme.infoLight, ink: theme.info },
    muted: { fill: theme.neutralLight, ink: theme.textMuted },
  }[tone];

  return (
    <View style={[styles.metric, { backgroundColor: palette.fill }, style]}>
      <ThemedText type="metric" style={{ color: palette.ink }}>
        {value ?? '—'}
      </ThemedText>
      <ThemedText type="label" style={{ color: theme.textSecondary }} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Up to two initials for the avatar tile, mirroring the mockup's "AK". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0];
  return letters.toUpperCase();
}

const styles = StyleSheet.create({
  avatar: {
    width: Layout.iconButtonSize,
    height: Layout.iconButtonSize,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { flex: 1 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.listGap },
  metric: {
    borderRadius: Radius.lg,
    padding: Spacing.three - 4,
    gap: Spacing.half,
  },
  // Two per row, then one spanning the full width — the mockup's 1fr 1fr grid
  // with `grid-column: span 2` on the third tile.
  metricHalf: { flexGrow: 1, flexBasis: '45%' },
  metricFull: { flexGrow: 1, flexBasis: '100%' },
  sectionLabel: { marginTop: Spacing.one },
  actions: { gap: Layout.listGap },
});
