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
  const createdAt =
    typeof profile.createdAt === 'string' && profile.createdAt
      ? profile.createdAt
      : profile.created_at
        ? String(profile.created_at)
        : null;

  return {
    id: profile.id ?? null,
    name: typeof profile.name === 'string' ? profile.name : '',
    username: normalizeUsername(profile.username),
    avatarType,
    avatarValue,
    createdAt,
  };
}

export function publicName(profile = {}) {
  const normalized = normalizeProfile(profile);
  return normalized.name || normalized.username || 'Student';
}

export function profileCreatedDate(profile = {}) {
  const normalized = normalizeProfile(profile);
  const date = normalized.createdAt ? new Date(normalized.createdAt) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function profileCreatedDateLabel(profile = {}) {
  const date = profileCreatedDate(profile);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function profileStackingDays(profile = {}) {
  const date = profileCreatedDate(profile);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(1, Math.floor((today - start) / 86400000) + 1);
}

export function profileStackingLabel(profile = {}) {
  const name = publicName(profile);
  const days = profileStackingDays(profile);
  return `${name} has been stacking for ${days} ${days === 1 ? 'day' : 'days'} since ${profileCreatedDateLabel(profile)}`;
}
