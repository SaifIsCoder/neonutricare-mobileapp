import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** `.iconbtn` — 36px white square with a hairline border. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Ionicons name={icon} size={15} color={theme.primaryDark} />
    </Pressable>
  );
}

export type ScreenProps = {
  title: string;
  /** Lead paragraph under the top bar, as on the mockup's prediction form. */
  subtitle?: string;
  children: ReactNode;
  /** Shows the mockup's back `.iconbtn` to the left of the title. */
  showBack?: boolean;
  /** Trailing top-bar slot — the mockup's notification bell. */
  trailing?: ReactNode;
  /** Replaces the whole top bar (the dashboard's avatar + greeting row). */
  header?: ReactNode;
  /** Supplying this enables pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: ViewStyle;
};

/**
 * Page shell from the mockup: a fixed `.topbar` over a scrolling `.scroll`
 * body, both constrained to one centred column.
 */
export function Screen({
  title,
  subtitle,
  children,
  showBack = false,
  trailing,
  header,
  onRefresh,
  refreshing = false,
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.column}>
          <View style={styles.topbar}>
            {header ?? (
              <>
                {showBack && router.canGoBack() && (
                  <IconButton
                    icon="arrow-back"
                    accessibilityLabel="Go back"
                    onPress={() => router.back()}
                  />
                )}
                <ThemedText type="screenTitle" style={styles.topbarTitle} numberOfLines={1}>
                  {title}
                </ThemedText>
                {trailing}
              </>
            )}
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              ) : undefined
            }>
            {!!subtitle && (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {subtitle}
              </ThemedText>
            )}

            {children}
          </ScrollView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingHorizontal: Layout.screenPaddingX,
    paddingTop: Spacing.two + 2,
    paddingBottom: Spacing.two,
  },
  topbarTitle: { flex: 1 },
  iconButton: {
    width: Layout.iconButtonSize,
    height: Layout.iconButtonSize,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Layout.screenPaddingX,
    paddingTop: Spacing.two,
    paddingBottom: Layout.screenPaddingBottom,
    gap: Layout.cardGap,
  },
});
