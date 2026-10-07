import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/state-views';
import { TextField } from '@/components/ui/text-field';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FIELDS, validate, type FormValues, type ValidationErrors } from '@/lib/prediction-form';
import { PredictionError, submitAssessment } from '@/lib/predictions';

export default function PredictScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Retrying the same answers only helps for transient failures. */
  const [canRetry, setCanRetry] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function setField(key: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear the field's error as soon as the user edits it.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    // A validation rejection from the service is stale once the answers change.
    setSubmitError(null);
  }

  async function onSubmit() {
    setSubmitError(null);

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      // Predicts, then saves (CLAUDE.md golden rule 3), and returns the row id.
      const id = await submitAssessment(values);
      setValues({});
      router.push({ pathname: '/result', params: { id } });
    } catch (err) {
      if (err instanceof PredictionError) {
        setSubmitError(err.message);
        setCanRetry(err.retryable);
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Could not save the assessment.');
        setCanRetry(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const answered = FIELDS.filter((field) => !!values[field.key]).length;
  const progress = answered / FIELDS.length;

  return (
    <Screen
      title="Risk prediction"
      subtitle={`All ${FIELDS.length} answers below feed the trained model directly.`}>
      {/* Completion meter — the mockup has no equivalent, so it is drawn with
          the same track/fill treatment as the result screen's factor bars. */}
      <View style={styles.progress}>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: theme.primary },
            ]}
          />
        </View>
        <ThemedText type="label" style={{ color: theme.textSecondary }}>
          {answered}/{FIELDS.length}
        </ThemedText>
      </View>

      {!!submitError && (
        <ErrorState message={submitError} onRetry={canRetry ? onSubmit : undefined} />
      )}

      <View style={styles.form}>
        {FIELDS.map((field) =>
          field.kind === 'select' ? (
            <Select
              key={field.key}
              label={field.label}
              choices={field.choices}
              value={values[field.key]}
              onChange={(code) => setField(field.key, code)}
              error={errors[field.key]}
              disabled={submitting}
            />
          ) : (
            <TextField
              key={field.key}
              label={field.label}
              placeholder={field.hint}
              value={values[field.key] ?? ''}
              onChangeText={(text) => setField(field.key, text)}
              keyboardType={field.decimal ? 'decimal-pad' : 'number-pad'}
              inputMode={field.decimal ? 'decimal' : 'numeric'}
              editable={!submitting}
              error={errors[field.key]}
            />
          ),
        )}
      </View>

      <Button
        title="Predict risk"
        icon="sparkles"
        onPress={onSubmit}
        loading={submitting}
        style={styles.submit}
      />

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  form: { gap: Layout.fieldGap },
  submit: { marginTop: Spacing.one },
});
