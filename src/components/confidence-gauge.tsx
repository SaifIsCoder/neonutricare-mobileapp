import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ConfidenceBand = 'high' | 'moderate' | 'low';

/**
 * Qualitative band for a confidence value, matching the API's
 * `confidence_level` thresholds exactly (prediction-service/main.py).
 *
 * Derived here rather than read from the API response because saved assessments
 * are re-read from Supabase, which stores only the numeric `confidence`. Keeping
 * one formula on the client means the result screen and the record detail screen
 * can never disagree.
 */
export function confidenceBand(value: number | null): ConfidenceBand | null {
  if (value === null) return null;
  if (value >= 0.8) return 'high';
  if (value >= 0.6) return 'moderate';
  return 'low';
}

const BAND_LABEL: Record<ConfidenceBand, string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Low confidence',
};

export type ConfidenceGaugeProps = {
  /** Model confidence in [0, 1]. */
  value: number | null;
  tint: string;
};

/**
 * Horizontal bar rather than a radial dial: no SVG dependency, and it stays
 * legible at small sizes and in both themes.
 */
export function ConfidenceGauge({ value, tint }: ConfidenceGaugeProps) {
  const theme = useTheme();
  const ratio = value === null ? 0 : Math.min(Math.max(value, 0), 1);
  const percent = Math.round(ratio * 1000) / 10;

  const band = confidenceBand(value);
  // A weak prediction must not look like a strong one, so the band carries its
  // own colour instead of inheriting the outcome tint.
  const bandColor =
    band === 'high' ? theme.success : band === 'moderate' ? theme.warning : theme.danger;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Confidence
        </ThemedText>
        <ThemedText style={[styles.value, { color: tint }]}>
          {value === null ? '—' : `${percent}%`}
        </ThemedText>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: tint }]} />
      </View>

      {!!band && (
        <ThemedText type="smallBold" style={{ color: bandColor }}>
          {BAND_LABEL[band]}
        </ThemedText>
      )}

      {band === 'low' && (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          The model only slightly favours this outcome. Treat it as inconclusive and rely on
          clinical judgement.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  value: { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
