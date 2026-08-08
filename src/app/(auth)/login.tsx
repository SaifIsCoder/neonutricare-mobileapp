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

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('Enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      // No navigation here: the root guard swaps to (tabs) when the session lands.
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not sign in. Try again.');
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
              <ThemedText type="subtitle">Welcome back</ThemedText>
              <ThemedText style={{ color: theme.textSecondary }}>
                Sign in to continue your screenings.
              </ThemedText>
            </View>

            <View style={styles.form}>
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
              />

              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                editable={!submitting}
                onSubmitEditing={onSubmit}
                returnKeyType="go"
              />

              {!!formError && (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {formError}
                </ThemedText>
              )}

              <Button title="Sign in" onPress={onSubmit} loading={submitting} />
            </View>

            <View style={styles.footer}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                New to NeoNutriCare?
              </ThemedText>
              <Button
                title="Create an account"
                variant="secondary"
                onPress={() => router.replace('/register')}
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
