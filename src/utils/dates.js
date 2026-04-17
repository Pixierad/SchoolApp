// Small date helpers used across the app.
// Tasks store dueDate as an ISO date string "YYYY-MM-DD" (no time — day-level granularity).

export function toISODate(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  return toISODate(new Date());
}

export function daysBetween(fromISO, toISO) {
  const a = fromISODate(fromISO);
  const b = fromISODate(toISO);
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Friendly relative label: "Today", "Tomorrow", "In 3 days", "2 days ago", "Mon, Apr 21"
export function relativeLabel(iso) {
  if (!iso) return 'No due date';
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff <= 6) return `In ${diff} days`;
  if (diff < -1 && diff >= -6) return `${Math.abs(diff)} days ago`;

  const d = fromISODate(iso);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const month = d.toLocaleDateString(undefined, { month: 'short' });
  return `${weekday}, ${month} ${d.getDate()}`;
}

// Status for coloring the due-date pill
export function dueStatus(iso, done) {
  if (done) return 'done';
  if (!iso) return 'none';
  const diff = daysBetween(todayISO(), iso);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 3) return 'soon';
  return 'future';
}
