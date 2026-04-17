// Design tokens — the one place to change how the app looks.
// Clean & modern: soft background, white cards, indigo accent, generous spacing.

export const colors = {
  // Surfaces
  bg: '#F5F6FA',
  card: '#FFFFFF',
  cardMuted: '#F0F2F7',

  // Text
  text: '#1A1D29',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',

  // Borders
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  // Brand
  primary: '#ff3e38',
  primarySoft: '#EEF0FF',
  primaryText: '#FFFFFF',

  // Status
  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',

  // Utility
  overlay: 'rgba(17, 24, 39, 0.45)',
  shadow: '#000000',
};

// A rotating palette for subject badges. Users don't pick these — we hash the
// subject name to one of these so the same subject always looks the same.
export const subjectPalette = [
  { bg: '#EEF0FF', fg: '#4C5BE0' }, // indigo
  { bg: '#E0F2FE', fg: '#0369A1' }, // sky
  { bg: '#DCFCE7', fg: '#15803D' }, // green
  { bg: '#FEF3C7', fg: '#B45309' }, // amber
  { bg: '#FCE7F3', fg: '#BE185D' }, // pink
  { bg: '#EDE9FE', fg: '#6D28D9' }, // violet
  { bg: '#FFE4E6', fg: '#BE123C' }, // rose
  { bg: '#CCFBF1', fg: '#0F766E' }, // teal
];

export function colorForSubject(name) {
  if (!name) return { bg: colors.cardMuted, fg: colors.textMuted };
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return subjectPalette[hash % subjectPalette.length];
}

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

export const typography = {
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '600', color: colors.text },
  subheading: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  bodyMuted: { fontSize: 14, color: colors.textMuted },
  caption: { fontSize: 12, color: colors.textFaint, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
};

export const shadow = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  float: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};
