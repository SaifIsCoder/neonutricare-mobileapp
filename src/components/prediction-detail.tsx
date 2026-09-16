import { StyleSheet, View } from 'react-native';

import { ConfidenceGauge } from '@/components/confidence-gauge';
import { Disclaimer } from '@/components/disclaimer';
import { ThemedText } from '@/components/themed-text';
import { Badge, useLabelTint } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FIELDS } from '@/lib/prediction-form';
import type { PredictionRow } from '@/lib/predictions';

/** Renders a saved assessment. Shared by the result screen and record detail. */
export function PredictionDetail({ row }: { row: PredictionRow }) {
  const theme = useTheme();
  const tint = useLabelTint(row.prediction);

  return (
    <View style={styles.wrapper}>
      {/* `.gauge-wrap` — dial with the outcome pill directly beneath it. */}
      <Card style={styles.gaugeCard}>
        <ConfidenceGauge value={row.confidence} tint={tint} />
        <Badge label={row.prediction} style={styles.outcomeBadge} />
      </Card>

      {!!row.recommendation && (
        <Card>
          <ThemedText type="cardTitle">Personalised recommendations</ThemedText>
          <ThemedText type="default" style={{ color: theme.textSecondary }}>
            {row.recommendation}
          </ThemedText>
        </Card>
      )}

      <Card style={styles.answersCard}>
        {/* Labelled "answers", not "contributing factors": per-feature attribution
            would need the model's own explanation, which the app does not have.
            The mockup's `.factor-row` treatment is reused for the layout. */}
        <ThemedText type="cardTitle" style={styles.answersTitle}>
          Your answers
        </ThemedText>

        {FIELDS.map((field, index) => (
          <View
            key={field.key}
            style={[
              styles.row,
              index < FIELDS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}>
            <ThemedText type="small" style={[styles.rowLabel, { color: theme.textSecondary }]}>
              {field.label}
            </ThemedText>
            <ThemedText type="smallBold" style={styles.rowValue}>
              {formatValue(row, field.key)}
            </ThemedText>
          </View>
        ))}
      </Card>

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
  wrapper: { gap: Layout.cardGap },
  gaugeCard: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  outcomeBadge: { alignSelf: 'center' },
  answersCard: { gap: 0 },
  answersTitle: { marginBottom: Spacing.one },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 1,
  },
  rowLabel: { flex: 1 },
  rowValue: { flexShrink: 0, textAlign: 'right', maxWidth: '50%' },
});
