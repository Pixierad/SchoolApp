export function dateKey(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return dateKey(new Date());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function startOfDay(dateLike) {
  const date = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return startOfDay(new Date());
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatHours(totalSeconds) {
  const hours = Math.max(0, Number(totalSeconds) || 0) / 3600;
  if (hours >= 10) return String(Math.round(hours));
  return hours.toFixed(1);
}

export function sessionDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function sessionTimeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function buildStudyHeatmap(sessions = [], days = 112) {
  const totals = new Map();
  for (const session of sessions) {
    const key = dateKey(session.endedAt || session.ended_at || session.startedAt || session.started_at);
    totals.set(key, (totals.get(key) || 0) + Math.max(0, Number(session.durationSeconds ?? session.duration_seconds) || 0));
  }

  const today = startOfDay(new Date());
  const start = addDays(today, -(days - 1));
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    const key = dateKey(date);
    return {
      key,
      date,
      seconds: totals.get(key) || 0,
      isToday: key === dateKey(today),
    };
  });
}

export function summarizeStudy(sessions = []) {
  const today = startOfDay(new Date());
  const weekStart = addDays(today, -6);
  let totalSeconds = 0;
  let todaySeconds = 0;
  let weekSeconds = 0;
  const dayTotals = new Map();

  for (const session of sessions) {
    const seconds = Math.max(0, Number(session.durationSeconds ?? session.duration_seconds) || 0);
    const ended = startOfDay(session.endedAt || session.ended_at || session.startedAt || session.started_at);
    const key = dateKey(ended);
    totalSeconds += seconds;
    dayTotals.set(key, (dayTotals.get(key) || 0) + seconds);
    if (ended.getTime() === today.getTime()) todaySeconds += seconds;
    if (ended.getTime() >= weekStart.getTime() && ended.getTime() <= today.getTime()) weekSeconds += seconds;
  }

  let currentStreak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const key = dateKey(addDays(today, -offset));
    if ((dayTotals.get(key) || 0) <= 0) break;
    currentStreak += 1;
  }

  return {
    totalSeconds,
    todaySeconds,
    weekSeconds,
    currentStreak,
    sessionCount: sessions.length,
  };
}

export function modeLabel(mode) {
  switch (mode) {
    case 'pomodoro':
      return 'Pomodoro';
    case 'custom':
      return 'Custom';
    case 'stopwatch':
    default:
      return 'Stopwatch';
  }
}
