import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Supplying this enables pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

/** Scrolling page shell: safe area, centred max-width column, standard header. */
export function Screen({ title, subtitle, children, onRefresh, refreshing = false }: ScreenProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
          }>
          <View style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            {!!subtitle && (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {subtitle}
              </ThemedText>
            )}
          </View>

          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  header: { gap: Spacing.one },
});
