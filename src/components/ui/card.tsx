import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The mockup's accent tints (`--teal-light`, `--blue-light`, …). Each pairs a
 * soft fill with a saturated glyph colour and is used to categorise a row.
 */
export type Tone = 'teal' | 'blue' | 'green' | 'amber' | 'muted';

export function useToneColors(tone: Tone) {
  const theme = useTheme();

  switch (tone) {
    case 'blue':
      return { fill: theme.infoLight, ink: theme.info };
    case 'green':
      return { fill: theme.successLight, ink: theme.success };
    case 'amber':
      return { fill: theme.warningLight, ink: theme.warning };
    case 'muted':
      return { fill: theme.neutralLight, ink: theme.textMuted };
    case 'teal':
    default:
      return { fill: theme.primaryLight, ink: theme.primaryDark };
  }
}

/** `.card` — white surface, hairline border, 16px radius. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

/** `.grp-label` — the uppercase divider above a group of rows. */
export function SectionLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();

  return (
    <ThemedText type="groupLabel" style={[{ color: theme.textMuted }, style]}>
      {children}
    </ThemedText>
  );
}

/** `.dcard .ic` — the tinted rounded square that leads a list row. */
export function IconTile({
  icon,
  tone = 'teal',
  size = 40,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  size?: number;
}) {
  const { fill, ink } = useToneColors(tone);

  return (
    <View
      style={[
        styles.iconTile,
        { width: size, height: size, borderRadius: Radius.md, backgroundColor: fill },
      ]}>
      <Ionicons name={icon} size={Math.round(size * 0.45)} color={ink} />
    </View>
  );
}

export type ListCardProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Replaces the trailing chevron — a badge, a caret, nothing. */
  trailing?: ReactNode;
  /** Dimmed treatment for unavailable rows, as on the mockup's "Coming soon". */
  muted?: boolean;
  /** Expanded body rendered under the row. */
  children?: ReactNode;
};

/**
 * `.dcard` — the icon + title + caption + chevron row that carries navigation
 * on the dashboard, maternal support and profile screens.
 */
export function ListCard({
  icon,
  tone = 'teal',
  title,
  subtitle,
  onPress,
  trailing,
  muted = false,
  children,
}: ListCardProps) {
  const theme = useTheme();

  const body = (pressed: boolean) => (
    <View
      style={[
        styles.listCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: muted ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}>
      <View style={styles.listCardRow}>
        {!!icon && <IconTile icon={icon} tone={muted ? 'muted' : tone} />}

        <View style={styles.listCardText}>
          <ThemedText type="cardTitle">{title}</ThemedText>
          {!!subtitle && (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {subtitle}
            </ThemedText>
          )}
        </View>

        {trailing ??
          (onPress && !muted ? (
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          ) : null)}
      </View>

      {children}
    </View>
  );

  if (!onPress) return body(false);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Layout.cardPadding,
    gap: Spacing.two,
  },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  listCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 13,
    gap: Spacing.two,
  },
  listCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 4 },
  listCardText: { flex: 1, gap: 1 },
});
