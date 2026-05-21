export const DEFAULT_AVATAR_EMOJI = '\u{1F393}';

export const AVATAR_EMOJIS = [
  '\u{1F393}',
  '\u{1F4DA}',
  '\u270F\uFE0F',
  '\u{1F9E0}',
  '\u2B50',
  '\u{1F680}',
  '\u{1F3A8}',
  '\u26BD',
  '\u{1F3A7}',
  '\u{1F4BB}',
  '\u{1F52C}',
  '\u{1F33F}',
  '\u2615',
  '\u{1F319}',
  '\u{1F525}',
  '\u{1F4A1}',
];

export function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
}

export function isValidUsername(value) {
  const username = normalizeUsername(value);
  return username.length === 0 || username.length >= 3;
}

export function normalizeProfile(profile = {}) {
  const avatarType = profile.avatarType === 'image' ? 'image' : 'emoji';
  const avatarValue =
    typeof profile.avatarValue === 'string' && profile.avatarValue
      ? profile.avatarValue
      : DEFAULT_AVATAR_EMOJI;

  return {
    id: profile.id ?? null,
    name: typeof profile.name === 'string' ? profile.name : '',
    username: normalizeUsername(profile.username),
    avatarType,
    avatarValue,
  };
}

export function publicName(profile = {}) {
  const normalized = normalizeProfile(profile);
  return normalized.name || normalized.username || 'Student';
}
