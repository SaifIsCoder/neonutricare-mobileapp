import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
