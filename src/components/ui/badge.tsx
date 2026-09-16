import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Colour for a screening label. 'Pending' is the mock value written until the
 * FastAPI service exists (TASKS.md Phase 3), so it gets a neutral treatment
 * rather than being coloured as a clinical outcome.
 *
 * The mockup colours a detected risk amber (`.badge-amber`) rather than red;
 * red stays reserved for failures the user can act on.
 */
export function useLabelTint(label: string | null | undefined) {
  const theme = useTheme();
  if (label === 'Healthy') return theme.success;
  if (label === 'At Risk') return theme.warning;
  return theme.textSecondary;
}

function useLabelFill(label: string | null | undefined) {
  const theme = useTheme();
  if (label === 'Healthy') return theme.successLight;
  if (label === 'At Risk') return theme.warningLight;
  return theme.neutralLight;
}

function labelIcon(label: string | null | undefined): keyof typeof Ionicons.glyphMap {
  if (label === 'Healthy') return 'checkmark-circle';
  if (label === 'At Risk') return 'alert-circle';
  return 'ellipse-outline';
}

export type BadgeProps = {
  label: string | null | undefined;
  /** Overrides the outcome palette — used for tip categories. */
  tint?: string;
  fill?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Outcome badges lead with a glyph; category badges may not. */
  showIcon?: boolean;
  /** Overrides the default `flex-start` alignment. */
  style?: StyleProp<ViewStyle>;
};

/** `.badge` — pill, 12px bold text on a soft tint of its own colour. */
export function Badge({ label, tint, fill, icon, showIcon = true, style }: BadgeProps) {
  const outcomeTint = useLabelTint(label);
  const outcomeFill = useLabelFill(label);

  const ink = tint ?? outcomeTint;
  const background = fill ?? outcomeFill;

  return (
    <View style={[styles.badge, { backgroundColor: background }, style]}>
      {showIcon && <Ionicons name={icon ?? labelIcon(label)} size={12} color={ink} />}
      <ThemedText type="badge" style={{ color: ink }}>
        {label ?? 'Unknown'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 1,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 1,
    borderRadius: Radius.pill,
  },
});
