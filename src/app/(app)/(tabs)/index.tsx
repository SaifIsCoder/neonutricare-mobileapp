import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { ErrorState, SkeletonCard } from '@/components/ui/state-views';
import { Spacing } from '@/constants/theme';
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
      title={`Hello, ${greetingName}`}
      subtitle="Your screening overview"
      onRefresh={refresh}
      refreshing={refreshing}>
      {!!error && <ErrorState message={error} onRetry={refresh} />}

      {loading && !error ? (
        <SkeletonCard lines={2} />
      ) : (
        <View style={styles.statRow}>
          <StatCard label="Total" value={stats?.total_assessments} tint={theme.primary} />
          <StatCard label="Low risk" value={stats?.low_risk_cases} tint={theme.success} />
          <StatCard label="High risk" value={stats?.high_risk_cases} tint={theme.danger} />
        </View>
      )}

      <View style={styles.actions}>
        <ActionCard
          icon="pulse"
          title="New assessment"
          caption="14 questions, about two minutes"
          onPress={() => router.push('/predict')}
        />
        <ActionCard
          icon="document-text"
          title="Health records"
          caption="Review your past screenings"
          onPress={() => router.push('/records')}
        />
        <ActionCard
          icon="heart"
          title="Maternal support"
          caption="Pregnancy, nutrition and checkup guides"
          onPress={() => router.push('/maternal')}
        />
        <ActionCard
          icon="bulb"
          title="Health tips"
          caption="Nutrition and antenatal guidance"
          onPress={() => router.push('/tips')}
        />
        <ActionCard
          icon="chatbubbles"
          title="AI assistant"
          caption="Coming soon"
          onPress={() => router.push('/assistant')}
        />
      </View>

      <Disclaimer />
    </Screen>
  );
}

function StatCard({ label, value, tint }: { label: string; value?: number; tint: string }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <ThemedText style={[styles.statValue, { color: tint }]}>{value ?? '—'}</ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  caption,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={[styles.actionIcon, { backgroundColor: theme.background }]}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <View style={styles.actionText}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {caption}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: Spacing.two },
  statCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.half,
  },
  statValue: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  actions: { gap: Spacing.two },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, gap: Spacing.half },
});
