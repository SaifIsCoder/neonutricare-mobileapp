import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Layout, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** `.onb` — a tinted art panel above the value proposition and two actions. */
export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.art, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="fitness" size={64} color={theme.primary} />
        </View>

        <View style={styles.body}>
          <ThemedText type="subtitle">Know the risk early, act with confidence</ThemedText>

          <ThemedText type="default" style={[styles.tagline, { color: theme.textSecondary }]}>
            AI-based newborn malnutrition risk screening plus guided maternal care, in one app.
          </ThemedText>

          <View style={styles.actions}>
            <Button title="Get started" onPress={() => router.push('/register')} />
            <Button
              title="I already have an account"
              variant="outline"
              onPress={() => router.push('/login')}
            />
          </View>

          <ThemedText type="small" style={[styles.disclaimer, { color: theme.textMuted }]}>
            NeoNutriCare provides a screening indication, not a diagnosis. Always consult a
            qualified health provider.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  art: {
    flex: 1,
    margin: Layout.screenPaddingX,
    marginBottom: 0,
    borderRadius: Radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.four - 2,
    paddingBottom: Spacing.four + 6,
    gap: Spacing.two,
  },
  tagline: { marginBottom: Spacing.two },
  actions: { gap: Layout.listGap },
  disclaimer: { textAlign: 'center', marginTop: Spacing.two },
});
