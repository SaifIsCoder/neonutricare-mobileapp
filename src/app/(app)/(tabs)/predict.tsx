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
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  FIELDS,
  validate,
  type FormValues,
  type ValidationErrors,
} from '@/lib/prediction-form';
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
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setSubmitError(null);
  }

  async function onSubmit() {
    setSubmitError(null);

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const id = await submitAssessment(values);
      setValues({});
      router.push({ pathname: '/result', params: { id } });
    } catch (err) {
      if (err instanceof PredictionError) {
        setSubmitError(err.message);
        setCanRetry(err.retryable);
      } else {
        setSubmitError(
          err instanceof Error ? err.message : 'Could not save the assessment.',
        );
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
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <ThemedText type="label" style={{ color: theme.textSecondary }}>
            Assessment progress
          </ThemedText>

          <ThemedText type="label" style={{ color: theme.text }}>
            {answered}/{FIELDS.length}
          </ThemedText>
        </View>

        <View
          style={[
            styles.progressTrack,
            { backgroundColor: theme.border },
          ]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: theme.primary,
              },
            ]}
          />
        </View>
      </View>

      {!!submitError && (
        <ErrorState
          message={submitError}
          onRetry={canRetry ? onSubmit : undefined}
        />
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
  progressSection: {
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: Radius.sm,
  },

  form: {
    gap: Layout.fieldGap,
  },

  submit: {
    marginTop: Spacing.two,
  },
});