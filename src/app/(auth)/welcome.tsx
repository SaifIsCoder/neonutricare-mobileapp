import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <ThemedText style={[styles.logoMark, { color: theme.onPrimary }]}>N</ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.heading}>
            NeoNutriCare
          </ThemedText>

          <ThemedText style={[styles.tagline, { color: theme.textSecondary }]}>
            Newborn malnutrition risk screening and maternal support, guided by your antenatal
            history.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Button title="Get started" onPress={() => router.push('/register')} />
          <Button
            title="I already have an account"
            variant="secondary"
            onPress={() => router.push('/login')}
          />

          <ThemedText type="small" style={[styles.disclaimer, { color: theme.textSecondary }]}>
            NeoNutriCare provides a screening indication, not a diagnosis. Always consult a
            qualified health provider.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: { fontSize: 48, fontWeight: '700', lineHeight: 56 },
  heading: { textAlign: 'center' },
  tagline: { textAlign: 'center', maxWidth: 320 },
  actions: { gap: Spacing.three },
  disclaimer: { textAlign: 'center', paddingHorizontal: Spacing.two },
});
