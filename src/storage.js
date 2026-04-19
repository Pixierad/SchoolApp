// Storage layer.
//
// Dual mode:
//   * Local-only -- Supabase isn't configured, OR the user isn't signed in.
//     Everything reads/writes AsyncStorage under @simpleapp:*:v1 keys.
//   * Cloud      -- Supabase is configured and a session exists. Reads/writes
//     go through Supabase tables (tasks, subjects, profiles). AsyncStorage
//     is still used as a lightweight offline cache per-user so the UI can
//     render instantly on boot.
//
// Callers import the top-level helpers (loadTasks/saveTasks/etc.) and don't
// need to care which backend is active. App.js picks up an auth state
// listener to re-load when the user signs in/out.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, currentUserId } from './supabase';

// ── Local keys ─────────────────────────────────────────────────────────────
// The legacy keys (no user id) are preserved so existing local-only data
// keeps working. For signed-in users we scope the cache to their id.
const LEGACY_TASKS_KEY = '@simpleapp:tasks:v1';
const LEGACY_SUBJECTS_KEY = '@simpleapp:subjects:v1';
const LEGACY_USER_NAME_KEY = '@simpleapp:userName:v1';

function tasksKey(userId) {
  return userId ? `@simpleapp:tasks:${userId}:v1` : LEGACY_TASKS_KEY;
}
function subjectsKey(userId) {
  return userId ? `@simpleapp:subjects:${userId}:v1` : LEGACY_SUBJECTS_KEY;
}
function userNameKey(userId) {
  return userId ? `@simpleapp:userName:${userId}:v1` : LEGACY_USER_NAME_KEY;
}

// Small helper: true when we should hit Supabase.
async function cloudMode() {
  if (!isSupabaseConfigured || !supabase) return null;
  const uid = await currentUserId();
  return uid || null;
}

// ── Normalizers ────────────────────────────────────────────────────────────

export function normalizeSubject(s) {
  if (typeof s === 'string') {
    return { name: s, room: '', teacher: '', color: null };
  }
  if (s && typeof s === 'object' && typeof s.name === 'string') {
    return {
      name: s.name,
      room: typeof s.room === 'string' ? s.room : '',
      teacher: typeof s.teacher === 'string' ? s.teacher : '',
      color: typeof s.color === 'string' && s.color ? s.color : null,
    };
  }
  return null;
}

// Map between app-shape tasks (camelCase) and DB-shape rows (snake_case).
function taskToRow(t, userId) {
  return {
    id: t.id,
    user_id: userId,
    title: t.title ?? '',
    description: t.description ?? null,
    subject: t.subject ?? null,
    due_date: t.dueDate ?? null,
    done: !!t.done,
    created_at: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
  };
}
function rowToTask(r) {
  return {
    id: r.id,
    title: r.title ?? '',
    description: r.description ?? null,
    subject: r.subject ?? null,
    dueDate: r.due_date ?? null,
    done: !!r.done,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  };
}

function subjectToRow(s, userId) {
  return {
    user_id: userId,
    name: s.name,
    room: s.room ?? '',
    teacher: s.teacher ?? '',
    color: s.color ?? null,
  };
}
function rowToSubject(r) {
  return {
    name: r.name,
    room: r.room ?? '',
    teacher: r.teacher ?? '',
    color: r.color ?? null,
  };
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export async function loadTasks() {
  const uid = await cloudMode();

  if (uid) {
    // Render fast from cache, then hydrate from the server in the background.
    // For the first boot we still await the server so the UI shows the real
    // data. Callers treat the returned promise as authoritative.
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const tasks = (data || []).map(rowToTask);
      // Update the cache for offline reads.
      AsyncStorage.setItem(tasksKey(uid), JSON.stringify(tasks)).catch(() => {});
      return tasks;
    } catch (e) {
      console.warn('Supabase loadTasks failed, falling back to cache:', e?.message);
      return readLocalTasks(tasksKey(uid));
    }
  }

  return readLocalTasks(tasksKey(null));
}

async function readLocalTasks(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to load tasks:', e);
    return [];
  }
}

// Bulk save -- used by the simple "setTasks" pattern in App.js.
// In cloud mode we diff against the server and upsert/delete as needed.
export async function saveTasks(tasks) {
  const uid = await cloudMode();

  if (uid) {
    // Always keep the local cache current.
    AsyncStorage.setItem(tasksKey(uid), JSON.stringify(tasks)).catch(() => {});
    try {
      // Fetch current ids on the server to decide what to delete.
      const { data: existing, error: selErr } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', uid);
      if (selErr) throw selErr;

      const desiredIds = new Set(tasks.map((t) => t.id));
      const serverIds = new Set((existing || []).map((r) => r.id));

      const toDelete = [...serverIds].filter((id) => !desiredIds.has(id));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('tasks')
          .delete()
          .eq('user_id', uid)
          .in('id', toDelete);
        if (delErr) throw delErr;
      }

      if (tasks.length > 0) {
        const rows = tasks.map((t) => taskToRow(t, uid));
        const { error: upErr } = await supabase
          .from('tasks')
          .upsert(rows, { onConflict: 'id' });
        if (upErr) throw upErr;
      }
    } catch (e) {
      console.warn('Supabase saveTasks failed (cached locally):', e?.message);
    }
    return;
  }

  try {
    await AsyncStorage.setItem(tasksKey(null), JSON.stringify(tasks));
  } catch (e) {
    console.warn('Failed to save tasks:', e);
  }
}

// ── Subjects ───────────────────────────────────────────────────────────────

export async function loadSubjects() {
  const uid = await cloudMode();

  if (uid) {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', uid)
        .order('name', { ascending: true });
      if (error) throw error;
      const subjects = (data || []).map(rowToSubject).filter(Boolean);
      AsyncStorage.setItem(subjectsKey(uid), JSON.stringify(subjects)).catch(() => {});
      return subjects;
    } catch (e) {
      console.warn('Supabase loadSubjects failed, falling back to cache:', e?.message);
      return readLocalSubjects(subjectsKey(uid));
    }
  }

  return readLocalSubjects(subjectsKey(null));
}

async function readLocalSubjects(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSubject).filter(Boolean);
  } catch (e) {
    console.warn('Failed to load subjects:', e);
    return [];
  }
}

export async function saveSubjects(subjects) {
  const uid = await cloudMode();

  if (uid) {
    AsyncStorage.setItem(subjectsKey(uid), JSON.stringify(subjects)).catch(() => {});
    try {
      // Subjects are keyed by (user_id, name). Diff by name and sync.
      const { data: existing, error: selErr } = await supabase
        .from('subjects')
        .select('name')
        .eq('user_id', uid);
      if (selErr) throw selErr;

      const desiredNames = new Set(subjects.map((s) => s.name));
      const serverNames = new Set((existing || []).map((r) => r.name));

      const toDelete = [...serverNames].filter((n) => !desiredNames.has(n));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('subjects')
          .delete()
          .eq('user_id', uid)
          .in('name', toDelete);
        if (delErr) throw delErr;
      }

      if (subjects.length > 0) {
        const rows = subjects.map((s) => subjectToRow(s, uid));
        const { error: upErr } = await supabase
          .from('subjects')
          .upsert(rows, { onConflict: 'user_id,name' });
        if (upErr) throw upErr;
      }
    } catch (e) {
      console.warn('Supabase saveSubjects failed (cached locally):', e?.message);
    }
    return;
  }

  try {
    await AsyncStorage.setItem(subjectsKey(null), JSON.stringify(subjects));
  } catch (e) {
    console.warn('Failed to save subjects:', e);
  }
}

// ── User name (profile) ────────────────────────────────────────────────────

export async function loadUserName() {
  const uid = await cloudMode();

  if (uid) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', uid)
        .maybeSingle();
      if (error) throw error;
      const name = data?.name ?? '';
      AsyncStorage.setItem(userNameKey(uid), name).catch(() => {});
      return name;
    } catch (e) {
      console.warn('Supabase loadUserName failed, falling back to cache:', e?.message);
      try {
        return (await AsyncStorage.getItem(userNameKey(uid))) ?? '';
      } catch {
        return '';
      }
    }
  }

  try {
    return (await AsyncStorage.getItem(userNameKey(null))) ?? '';
  } catch (e) {
    console.warn('Failed to load user name:', e);
    return '';
  }
}

export async function saveUserName(name) {
  const uid = await cloudMode();

  if (uid) {
    AsyncStorage.setItem(userNameKey(uid), name).catch(() => {});
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: uid, name }, { onConflict: 'id' });
      if (error) throw error;
    } catch (e) {
      console.warn('Supabase saveUserName failed (cached locally):', e?.message);
    }
    return;
  }

  try {
    await AsyncStorage.setItem(userNameKey(null), name);
  } catch (e) {
    console.warn('Failed to save user name:', e);
  }
}

// ── Misc ───────────────────────────────────────────────────────────────────

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
