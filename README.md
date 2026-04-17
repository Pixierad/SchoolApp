# School App — Task Tracker

A clean, modern Expo (React Native) app for tracking schoolwork. Create tasks, tag them by subject, set due dates, and check them off as you go.

## Features

- **Tasks**: title, subject, due date, done/not done. Tap a task to edit; tap the checkbox to toggle done.
- **Subjects**: manage your own list of classes. Each subject gets a consistent color badge.
- **Filters**: quickly switch between All, Today, Upcoming, Overdue, and Done — each with a live count.
- **Progress**: header card shows completion percentage.
- **Smart date labels**: "Today", "Tomorrow", "In 3 days", "Mon, Apr 21", with color coding for overdue / today / soon.
- **Persistence**: everything saves locally to device storage (AsyncStorage). Survives app restarts.
- **No account, no backend**: fully offline.

## Get started

```bash
cd D:\SchoolApp
npm install
npm start
```

Then from Expo Dev Tools:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web
- Or scan the QR code with Expo Go on your phone

### If you see version mismatch warnings

Run this once to align dependency versions to your installed Expo SDK:

```bash
npx expo install --fix
```

## Project structure

```
SchoolApp/
├── App.js                          Main app: header, filters, list, FAB, modals
├── app.json                        Expo config
├── package.json
├── babel.config.js
├── assets/                         (add icon.png, splash-icon.png, etc.)
└── src/
    ├── theme.js                    Colors, spacing, typography, shadows
    ├── storage.js                  AsyncStorage helpers for tasks + subjects
    ├── utils/
    │   └── dates.js                Date formatting and relative labels
    └── components/
        ├── TaskCard.js             Single task row with checkbox + badges
        ├── TaskForm.js             Add/edit task bottom sheet (with date picker)
        ├── SubjectManager.js       Add/remove subjects bottom sheet
        ├── FilterTabs.js           Horizontal filter chips with counts
        └── EmptyState.js           Friendly empty-list placeholder
```

## Data model

Everything lives in AsyncStorage under two keys.

**Task**
```js
{
  id: string,          // unique
  title: string,       // required
  subject: string|null,
  dueDate: string|null, // "YYYY-MM-DD"
  done: boolean,
  createdAt: number    // epoch ms
}
```

**Subjects**: a simple array of strings, e.g. `["Math 101", "History", "Biology"]`.

## Styling

All visual tokens live in `src/theme.js` — change one value there and it propagates everywhere. The subject badge palette cycles through 8 colors, and the same subject name always hashes to the same color for consistency.

## Roadmap ideas

- Reminders / push notifications
- Recurring tasks (weekly problem sets, etc.)
- Priority field
- Notes / attachments
- Cloud sync
- Calendar view

## Assets

Add the following to `assets/` (referenced in `app.json`). Until they exist, Expo shows warnings but the app runs fine:

- `icon.png` — 1024×1024
- `splash-icon.png`
- `adaptive-icon.png` (Android, 1024×1024)
- `favicon.png` (web)
