// Design tokens + theming.
//
// Theme is dynamic: users can toggle dark/light mode and pick an accent
// color. A ThemeProvider at the root holds the current selection, persists
// it to AsyncStorage, and exposes it via the useTheme() hook.
//
// Most screens do:
//   const { colors, spacing, radius, typography, shadow } = useTheme();
//   const styles = useMemo(() => makeStyles(...), [...]);
//
// Static things (spacing, radius) don't change with the theme, but we still
// surface them through useTheme() so callers have one import.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Static tokens ───────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

// ── Accent presets ──────────────────────────────────────────────────────────
// Each accent has a primary (full saturation) and a soft variant used for
// backgrounds of accent-tinted elements (pills, badges, icon circles).
// The "soft" variant differs between light and dark mode.

export const ACCENTS = {
  red:    { label: 'Red',    primary: '#FF3E38', softLight: '#FFE4E3', softDark: '#4D1F1D' },
  indigo: { label: 'Indigo', primary: '#5B6CFF', softLight: '#EEF0FF', softDark: '#262C4D' },
  teal:   { label: 'Teal',   primary: '#14B8A6', softLight: '#CCFBF1', softDark: '#0F3F3A' },
  amber:  { label: 'Amber',  primary: '#F59E0B', softLight: '#FEF3C7', softDark: '#4D3A12' },
  rose:   { label: 'Rose',   primary: '#F43F5E', softLight: '#FFE4E6', softDark: '#4D1F2A' },
  green:  { label: 'Green',  primary: '#10B981', softLight: '#D1FAE5', softDark: '#134034' },
  violet: { label: 'Violet', primary: '#8B5CF6', softLight: '#EDE9FE', softDark: '#2E1E4D' },
  slate:  { label: 'Slate',  primary: '#475569', softLight: '#E2E8F0', softDark: '#2A2F3D' },
};

export const ACCENT_KEYS = Object.keys(ACCENTS);

// ── Surface palettes (light/dark) ───────────────────────────────────────────

const LIGHT_SURFACE = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  cardMuted: '#F0F2F7',
  text: '#1A1D29',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  overlay: 'rgba(17, 24, 39, 0.45)',
  shadow: '#000000',
  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
};

const DARK_SURFACE = {
  bg: '#0F1218',
  card: '#1A1F2B',
  cardMuted: '#232838',
  text: '#F3F4F8',
  textMuted: '#9CA3AF',
  textFaint: '#6B7280',
  border: '#2A2F3D',
  borderStrong: '#3A4050',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  success: '#34D399',
  successSoft: '#134034',
  warning: '#FBBF24',
  warningSoft: '#4D3912',
  danger: '#F87171',
  dangerSoft: '#4D1F1D',
};

// ── Subject palettes (mode-aware) ───────────────────────────────────────────

const LIGHT_SUBJECT_PALETTE = [
  { bg: '#EEF0FF', fg: '#4C5BE0' }, // indigo
  { bg: '#E0F2FE', fg: '#0369A1' }, // sky
  { bg: '#DCFCE7', fg: '#15803D' }, // green
  { bg: '#FEF3C7', fg: '#B45309' }, // amber
  { bg: '#FCE7F3', fg: '#BE185D' }, // pink
  { bg: '#EDE9FE', fg: '#6D28D9' }, // violet
  { bg: '#FFE4E6', fg: '#BE123C' }, // rose
  { bg: '#CCFBF1', fg: '#0F766E' }, // teal
];

const DARK_SUBJECT_PALETTE = [
  { bg: '#262C4D', fg: '#A5B2FF' }, // indigo
  { bg: '#103347', fg: '#7DD3FC' }, // sky
  { bg: '#123A2A', fg: '#86EFAC' }, // green
  { bg: '#3D3212', fg: '#FCD34D' }, // amber
  { bg: '#3D1E33', fg: '#F9A8D4' }, // pink
  { bg: '#2B1F4D', fg: '#C4B5FD' }, // violet
  { bg: '#3D1D28', fg: '#FDA4AF' }, // rose
  { bg: '#0F3F3A', fg: '#5EEAD4' }, // teal
];

// Stable hash → palette slot, so a given subject name always gets the same
// color within a mode.
function hashSubject(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

// ── buildTheme ──────────────────────────────────────────────────────────────

export function buildTheme(mode = 'light', accentKey = 'red') {
  const isDark = mode === 'dark';
  const surface = isDark ? DARK_SURFACE : LIGHT_SURFACE;
  const accent = ACCENTS[accentKey] ?? ACCENTS.red;
  const primarySoft = isDark ? accent.softDark : accent.softLight;

  const colors = {
    ...surface,
    primary: accent.primary,
    primarySoft,
    primaryText: '#FFFFFF',
  };

  const typography = {
    title:      { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
    heading:    { fontSize: 20, fontWeight: '600', color: colors.text },
    subheading: { fontSize: 16, fontWeight: '600', color: colors.text },
    body:       { fontSize: 15, color: colors.text },
    bodyMuted:  { fontSize: 14, color: colors.textMuted },
    caption:    { fontSize: 12, color: colors.textFaint, fontWeight: '500' },
    label:      { fontSize: 13, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
  };

  const shadow = {
    card: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.35 : 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    float: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.5 : 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
  };

  // colorForSubject closure — captures current mode so callers don't need
  // to pass it in.
  const subjectPalette = isDark ? DARK_SUBJECT_PALETTE : LIGHT_SUBJECT_PALETTE;
  const fallback = isDark
    ? { bg: DARK_SURFACE.cardMuted, fg: DARK_SURFACE.textMuted }
    : { bg: LIGHT_SURFACE.cardMuted, fg: LIGHT_SURFACE.textMuted };

  function colorForSubject(name) {
    if (!name) return fallback;
    return subjectPalette[hashSubject(name) % subjectPalette.length];
  }

  return {
    mode,
    accent: accentKey,
    isDark,
    colors,
    spacing,
    radius,
    typography,
    shadow,
    colorForSubject,
  };
}

// ── Context + Provider + hook ───────────────────────────────────────────────

const MODE_KEY = '@simpleapp:theme:mode:v1';
const ACCENT_KEY = '@simpleapp:theme:accent:v1';

const DEFAULT_MODE = 'light';
const DEFAULT_ACCENT = 'red';

const ThemeContext = createContext({
  ...buildTheme(DEFAULT_MODE, DEFAULT_ACCENT),
  setMode: () => {},
  setAccent: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [hydrated, setHydrated] = useState(false);

  // Load saved prefs on mount
  useEffect(() => {
    (async () => {
      try {
        const [m, a] = await Promise.all([
          AsyncStorage.getItem(MODE_KEY),
          AsyncStorage.getItem(ACCENT_KEY),
        ]);
        if (m === 'dark' || m === 'light') setMode(m);
        if (a && ACCENTS[a]) setAccent(a);
      } catch (e) {
        console.warn('Failed to load theme prefs:', e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persist changes (skip first render so we don't overwrite stored value
  // with defaults before load finishes).
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(MODE_KEY, mode).catch(() => {});
  }, [mode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(ACCENT_KEY, accent).catch(() => {});
  }, [accent, hydrated]);

  const value = useMemo(() => {
    const theme = buildTheme(mode, accent);
    return { ...theme, setMode, setAccent };
  }, [mode, accent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
