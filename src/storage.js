import AsyncStorage from '@react-native-async-storage/async-storage';

const TASKS_KEY = '@simpleapp:tasks:v1';
const SUBJECTS_KEY = '@simpleapp:subjects:v1';

export async function loadTasks() {
  try {
    const raw = await AsyncStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to load tasks:', e);
    return [];
  }
}

export async function saveTasks(tasks) {
  try {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('Failed to save tasks:', e);
  }
}

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

export async function loadSubjects() {
  try {
    const raw = await AsyncStorage.getItem(SUBJECTS_KEY);
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
  try {
    await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
  } catch (e) {
    console.warn('Failed to save subjects:', e);
  }
}

const USER_NAME_KEY = '@simpleapp:userName:v1';

export async function loadUserName() {
  try {
    const raw = await AsyncStorage.getItem(USER_NAME_KEY);
    return raw ?? '';
  } catch (e) {
    console.warn('Failed to load user name:', e);
    return '';
  }
}

export async function saveUserName(name) {
  try {
    await AsyncStorage.setItem(USER_NAME_KEY, name);
  } catch (e) {
    console.warn('Failed to save user name:', e);
  }
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
