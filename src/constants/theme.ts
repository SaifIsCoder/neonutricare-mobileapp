/**
 * Design tokens for NeoNutriCare.
 *
 * The values below are lifted from the visual spec in
 * `docs/neonutricare_ui_mockup.html` (`:root`) — a mint-tinted surface, a teal
 * brand, and four soft accent tints used to colour category icons and badges.
 * The mockup is light-only; the dark palette re-derives the same relationships
 * against a deep teal-black so the app keeps working in either scheme.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Page ground — the mint-white behind every screen. */
    background: '#F5FAF9',
    /** Raised surface: cards, inputs, the tab bar. */
    card: '#FFFFFF',
    /** Alias kept so pre-existing call sites keep reading the card surface. */
    backgroundElement: '#FFFFFF',
    /** Pressed / selected row fill. */
    backgroundSelected: '#E1F0EE',
    border: '#E3EDEA',

    text: '#1C2B29',
    textSecondary: '#5D6E6B',
    /** Group labels, chevrons, placeholder glyphs. */
    textMuted: '#98A6A3',

    primary: '#0B6E6E',
    primaryDark: '#084F4F',
    primaryLight: '#E1F0EE',
    onPrimary: '#FFFFFF',

    info: '#2D6CA6',
    infoLight: '#E7F0F8',
    success: '#3F9C6D',
    successLight: '#E7F6ED',
    /** The mockup styles "risk detected" amber rather than red. */
    warning: '#D9822B',
    warningLight: '#FBEEE1',
    /** Reserved for validation and failure states, which the mockup never shows. */
    danger: '#C0392B',
    dangerLight: '#FBE9E7',

    /** Neutral tint for disabled / "coming soon" affordances. */
    neutralLight: '#F1F0EC',
  },
  dark: {
    background: '#0E1A19',
    card: '#152625',
    backgroundElement: '#152625',
    backgroundSelected: '#1D3634',
    border: '#233B39',

    text: '#EAF3F1',
    textSecondary: '#9FB3B0',
    textMuted: '#7A8F8C',

    primary: '#3FA9A2',
    primaryDark: '#2C7F7A',
    primaryLight: '#173330',
    onPrimary: '#05201F',

    info: '#6FA8D8',
    infoLight: '#16283A',
    success: '#5FBF8C',
    successLight: '#142B22',
    warning: '#E9A45C',
    warningLight: '#33251A',
    danger: '#E4695C',
    dangerLight: '#33191A',

    neutralLight: '#1E2B29',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Manrope is the display face (headings, numerals, button labels) and Inter the
 * body face, matching `--font-d` / `--font-b` in the mockup. Weights are picked
 * by family name rather than `fontWeight` — Android synthesises a fake bold when
 * both are set on a custom font.
 */
export const Fonts = {
  display: 'Manrope_700Bold',
  displayHeavy: 'Manrope_800ExtraBold',
  displayMedium: 'Manrope_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono:
    Platform.select({
      ios: 'ui-monospace',
      web: 'var(--font-mono)',
      default: 'monospace',
    }) ?? 'monospace',
} as const;

/** Corner radii, straight from the mockup's component rules. */
export const Radius = {
  /** `.iconbtn` */
  sm: 10,
  /** `.field input`, `.dcard .ic` */
  md: 12,
  /** `.btn`, `.metric` */
  lg: 14,
  /** `.card`, `.dcard` */
  xl: 16,
  /** avatars, `.onb-art` */
  xxl: 22,
  /** `.badge` */
  pill: 100,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Page-level rhythm from `.scroll`, `.topbar` and the card rules. */
export const Layout = {
  screenPaddingX: 18,
  screenPaddingTop: 20,
  screenPaddingBottom: 40,
  /** `.card` / `.dcard` inner padding. */
  cardPadding: 16,
  /** Gap between stacked cards. */
  cardGap: 12,
  /** Gap in a dense list (`.dcard` stack). */
  listGap: 10,
  /** Vertical gap between form fields. */
  fieldGap: 14,
  /** `.btn` height — the mockup's 13px padding plus a comfortable touch target. */
  controlHeight: 50,
  /** `.iconbtn` */
  iconButtonSize: 36,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 560;
