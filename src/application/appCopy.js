export function greeting(name) {
  const h = new Date().getHours();
  const suffix = name ? `, ${name}` : '';
  if (h < 5) return name ? `Up late, ${name}?` : 'Up late?';
  if (h < 12) return `Good morning${suffix}`;
  if (h < 17) return `Good afternoon${suffix}`;
  if (h < 22) return `Good evening${suffix}`;
  return `Late night${suffix}`;
}

export function emptyTitleFor(filter, total) {
  if (total === 0) return 'No tasks or events yet';
  switch (filter) {
    case 'incomplete':
      return 'No unfinished tasks or events';
    case 'today':
      return 'Nothing upcoming or due today';
    case 'upcoming':
      return 'No upcoming tasks or events';
    case 'overdue':
      return 'Nothing overdue';
    case 'complete':
      return 'No completed tasks or events';
    default:
      return 'All caught up';
  }
}

export function emptySubtitleFor(filter, total) {
  if (total === 0) return 'Tap the + button to add your first task or event.';
  switch (filter) {
    case 'today':
      return 'Enjoy your day \u2014 or get ahead on something upcoming.';
    case 'incomplete':
      return 'Everything is finished for now.';
    case 'upcoming':
      return 'No future due dates scheduled.';
    case 'overdue':
      return "You're on top of things. \u{1F389}";
    case 'complete':
      return 'Completed tasks will show up here.';
    default:
      return '';
  }
}

export function emptyIconFor(filter, total) {
  if (filter === 'incomplete') return '\u2705';
  if (total === 0) return '\u{1F4DA}';
  switch (filter) {
    case 'today':
      return '\u2600\uFE0F';
    case 'upcoming':
      return '\u{1F4C5}';
    case 'overdue':
      return '\u{1F3AF}';
    case 'complete':
      return '\u2705';
    default:
      return '\u{1F389}';
  }
}
