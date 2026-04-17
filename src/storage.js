import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const TASKS_KEY = '@simpleapp:tasks:v1';
const SUBJECTS_KEY = '@simpleapp:subjects:v1';

// --- Tasks ---

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

// --- Subjects ---

export async function loadSubjects() {
  try {
    const raw = await AsyncStorage.getItem(SUBJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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

// --- Helpers ---

export function newId() {
  // Good-enough unique ID for local storage. Not crypto-grade, but collision-safe
  // for a personal task list.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
