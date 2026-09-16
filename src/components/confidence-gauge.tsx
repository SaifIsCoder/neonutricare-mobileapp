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

const SIZE = 150;
const THICKNESS = 12;

/**
 * Radial arc drawn from two clipped half-rings.
 *
 * A rounded View with only its top and right borders coloured renders a 180°
 * arc; rotating it moves that arc's end to the target angle, and clipping to
 * one half of the circle hides the other 180°. Two of them cover a full turn.
 * This avoids pulling in a native SVG dependency, which would force an Android
 * rebuild of the dev client.
 */
function Arc({ progress, color, track }: { progress: number; color: string; track: string }) {
  const degrees = progress * 360;
  const firstHalf = Math.min(degrees, 180);
  const showSecondHalf = degrees > 180;

  const ring = {
    position: 'absolute' as const,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: THICKNESS,
    borderTopColor: color,
    borderRightColor: color,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  };

  return (
    <View style={styles.arc}>
      <View
        style={[
          styles.track,
          { borderColor: track, borderWidth: THICKNESS, borderRadius: SIZE / 2 },
        ]}
      />

      {/* 0°–180°, clipped to the right half of the circle. */}
      <View style={[styles.half, { left: SIZE / 2 }]}>
        <View style={[ring, { left: -SIZE / 2, transform: [{ rotate: `${firstHalf - 135}deg` }] }]} />
      </View>

      {/* 180°–360°, clipped to the left half. */}
      {showSecondHalf && (
        <View style={[styles.half, { left: 0 }]}>
          <View style={[ring, { left: 0, transform: [{ rotate: `${degrees - 135}deg` }] }]} />
        </View>
      )}
    </View>
  );
}

export type ConfidenceGaugeProps = {
  /** Model confidence in [0, 1]. */
  value: number | null;
  tint: string;
};

/** `.gauge-wrap` — the 150px dial with the percentage stacked inside it. */
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
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Model confidence"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={styles.gauge}>
        <Arc progress={ratio} color={tint} track={theme.border} />

        <View style={styles.gaugeText}>
          <ThemedText type="metric" style={[styles.percent, { color: theme.primaryDark }]}>
            {value === null ? '—' : `${percent}%`}
          </ThemedText>
          <ThemedText type="groupLabel" style={{ color: theme.textSecondary }}>
            Confidence
          </ThemedText>
        </View>
      </View>

      {!!band && (
        <ThemedText type="smallBold" style={{ color: bandColor }}>
          {BAND_LABEL[band]}
        </ThemedText>
      )}

      {band === 'low' && (
        <ThemedText type="small" style={[styles.note, { color: theme.textSecondary }]}>
          The model only slightly favours this outcome. Treat it as inconclusive and rely on
          clinical judgement.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  gauge: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  arc: { position: 'absolute', width: SIZE, height: SIZE },
  track: { position: 'absolute', width: SIZE, height: SIZE },
  half: { position: 'absolute', top: 0, width: SIZE / 2, height: SIZE, overflow: 'hidden' },
  gaugeText: { alignItems: 'center', gap: Spacing.half },
  percent: { fontSize: 30, lineHeight: 36 },
  note: { textAlign: 'center', paddingHorizontal: Spacing.three },
});
