import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The type scale from `docs/neonutricare_ui_mockup.html`. Sizes are the mockup's
 * values scaled up ~8%: the mockup renders inside a 340px phone frame, while the
 * app renders at a real device's ~390dp width.
 *
 * Manrope (display) carries headings, numerals and button labels; Inter (body)
 * carries everything else.
 */
export type TextType =
  /** Splash wordmark — `.splash h1`. */
  | 'display'
  /** Page heading on a scrolling screen — `.screen h2`. */
  | 'subtitle'
  /** Heading inside a `.topbar`. */
  | 'screenTitle'
  /** Large numeral: `.metric .n`, `.gauge-txt .pct`. */
  | 'metric'
  /** Row / card heading — `.dcard .t`. */
  | 'cardTitle'
  /** Body copy — the mockup's 12.5–13px paragraph. */
  | 'default'
  /** Supporting copy — `.dcard .s`, `.metric .l`. */
  | 'small'
  | 'smallBold'
  /** Field label — `.field label`. */
  | 'label'
  /** Section divider — `.grp-label`. */
  | 'groupLabel'
  /** Button label — `.btn`. */
  | 'button'
  /** Pill text — `.badge`. */
  | 'badge'
  | 'link'
  | 'code'
  /** Legacy alias for `display`. */
  | 'title'
  /** Legacy alias for `link`. */
  | 'linkPrimary';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        styles[type],
        // `link` is the only type whose colour is part of its identity.
        (type === 'link' || type === 'linkPrimary') && !themeColor && { color: theme.primary },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: Fonts.displayHeavy, fontSize: 26, lineHeight: 32 },
  title: { fontFamily: Fonts.displayHeavy, fontSize: 26, lineHeight: 32 },
  subtitle: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 28 },
  screenTitle: { fontFamily: Fonts.display, fontSize: 18, lineHeight: 24 },
  metric: { fontFamily: Fonts.displayHeavy, fontSize: 22, lineHeight: 28 },
  cardTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  default: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 21 },
  small: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19 },
  smallBold: { fontFamily: Fonts.bodyBold, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: Fonts.bodySemiBold, fontSize: 13, lineHeight: 18 },
  groupLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  button: { fontFamily: Fonts.display, fontSize: 15, lineHeight: 20 },
  badge: { fontFamily: Fonts.bodyBold, fontSize: 12, lineHeight: 16 },
  link: { fontFamily: Fonts.bodySemiBold, fontSize: 13, lineHeight: 19 },
  linkPrimary: { fontFamily: Fonts.bodySemiBold, fontSize: 13, lineHeight: 19 },
  code: { fontFamily: Fonts.mono, fontSize: 12, lineHeight: 18 },
});
