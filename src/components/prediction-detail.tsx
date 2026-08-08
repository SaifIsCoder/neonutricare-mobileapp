import { StyleSheet, View } from 'react-native';

import { ConfidenceGauge } from '@/components/confidence-gauge';
import { Disclaimer } from '@/components/disclaimer';
import { ThemedText } from '@/components/themed-text';
import { Badge, useLabelTint } from '@/components/ui/badge';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FIELDS } from '@/lib/prediction-form';
import type { PredictionRow } from '@/lib/predictions';

/** Renders a saved assessment. Shared by the result screen and record detail. */
export function PredictionDetail({ row }: { row: PredictionRow }) {
  const theme = useTheme();
  const tint = useLabelTint(row.prediction);

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <Badge label={row.prediction} />
        <ConfidenceGauge value={row.confidence} tint={tint} />
      </View>

      {!!row.recommendation && (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText type="smallBold">Recommendation</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {row.recommendation}
          </ThemedText>
        </View>
      )}

      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        {/* Labelled "answers", not "contributing factors": per-feature attribution
            would need the model's own explanation, which the app does not have. */}
        <ThemedText type="smallBold">Your answers</ThemedText>
        {FIELDS.map((field) => (
          <View key={field.key} style={styles.row}>
            <ThemedText type="small" style={[styles.rowLabel, { color: theme.textSecondary }]}>
              {field.label}
            </ThemedText>
            <ThemedText type="small" style={styles.rowValue}>
              {formatValue(row, field.key)}
            </ThemedText>
          </View>
        ))}
      </View>

      <Disclaimer />
    </View>
  );
}

function formatValue(row: PredictionRow, key: keyof PredictionRow | string): string {
  const value = (row as Record<string, unknown>)[key];
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') {
    if (key === 'booked') return value ? 'Booked' : 'Un-booked';
    return value ? 'Yes' : 'No';
  }
  if (key === 'hemoglobin') return `${value} g/dL`;
  return String(value);
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.three },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  rowLabel: { flex: 1 },
  rowValue: { flexShrink: 0, textAlign: 'right', maxWidth: '50%' },
});
