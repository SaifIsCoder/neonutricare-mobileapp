import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

/** Supabase enforces a 6-character minimum by default. */
const MIN_PASSWORD_LENGTH = 6;

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Enter your full name.';
    // Deliberately permissive: any address the backend accepts is fine here.
    if (!email.trim()) next.email = 'Enter your email.';
    else if (!email.includes('@')) next.email = 'That does not look like an email address.';
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await signUp(fullName, email, password);
      // No navigation here: the root guard swaps to (tabs) when the session lands.
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the account. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <View style={styles.header}>
              <ThemedText type="subtitle">Create account</ThemedText>
              <ThemedText style={{ color: theme.textSecondary }}>
                Your screenings stay private to you.
              </ThemedText>
            </View>

            <View style={styles.form}>
              <TextField
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Amina Yusuf"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                editable={!submitting}
                error={errors.fullName}
              />

              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!submitting}
                error={errors.email}
              />

              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!submitting}
                error={errors.password}
                onSubmitEditing={onSubmit}
                returnKeyType="go"
              />

              {!!formError && (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {formError}
                </ThemedText>
              )}

              <Button title="Create account" onPress={onSubmit} loading={submitting} />

              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                NeoNutriCare provides a screening indication, not a diagnosis. Always consult a
                qualified health provider.
              </ThemedText>
            </View>

            <View style={styles.footer}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Already registered?
              </ThemedText>
              <Button
                title="Sign in instead"
                variant="secondary"
                onPress={() => router.replace('/login')}
                disabled={submitting}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.five,
  },
  header: { gap: Spacing.two, paddingTop: Spacing.four },
  form: { gap: Spacing.three },
  footer: { marginTop: 'auto', gap: Spacing.two, alignItems: 'stretch' },
});
