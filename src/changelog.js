// Application changelog.
//
// Each entry is rendered chronologically (newest first) in the in-app
// changelog sheet. Add a new entry at the TOP whenever you ship something
// users would like to know about. Keep notes short and human-readable.
//
// Fields:
//   version  -- semver-ish identifier. Used as the cache key for "last seen"
//               so users only get the unread dot when this string changes.
//   date     -- ISO date (YYYY-MM-DD). Shown as a subtitle.
//   title    -- short headline for this release.
//   notes    -- array of bullet strings. Use category prefixes (e.g.
//               "New:", "Fixed:", "Improved:") for scannability.
//
// Bumping the *first* (latest) version lights up the "What's new" badge in
// the header for everyone whose lastSeen marker is older.

export const CHANGELOG = [
  {
    version: '1.1.0',
    date: '2026-04-25',
    title: 'Reliability pass and What\'s new',
    notes: [
      'New: "What\'s new" panel — see recent improvements from the Settings sheet.',
      'Fixed: avoid re-uploading every task on cold boot (saves Supabase quota).',
      'Fixed: signing out no longer overwrites legacy local-only data.',
      'Fixed: legacy local data is now migrated to your account on first sign-in.',
      'Fixed: toggling a single task only writes that one row to the cloud.',
      'Improved: due-date colour and "In N days" copy now agree (one-week window).',
      'Improved: "Resend code" countdown is more reliable; smoother sheet dismiss.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-30',
    title: 'Initial public release',
    notes: [
      'New: tasks with due dates, subjects, and progress tracking.',
      'New: subject manager with rooms, teachers, and custom colours.',
      'New: dark mode and custom theme builder.',
      'New: optional cloud sync via Supabase (email or one-time code).',
    ],
  },
];

export function latestChangelogVersion() {
  return CHANGELOG[0]?.version ?? null;
}
