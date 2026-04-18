import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from './src/theme';
import { todayISO, daysBetween, dueStatus } from './src/utils/dates';
import {
  loadTasks,
  saveTasks,
  loadSubjects,
  saveSubjects,
  loadUserName,
  saveUserName,
  newId,
} from './src/storage';

import TaskCard from './src/components/TaskCard';
import TaskForm from './src/components/TaskForm';
import SubjectManager from './src/components/SubjectManager';
import SettingsSheet from './src/components/SettingsSheet';
import FilterTabs from './src/components/FilterTabs';
import EmptyState from './src/components/EmptyState';

// Outer App: just wires providers. All real logic lives in AppContent so
// that it can call useTheme() from inside the ThemeProvider.
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { colors, spacing, radius, typography, shadow, isDark } = useTheme();
  const styles = useMemo(
    () => makeStyles({ colors, spacing, radius, typography }),
    [colors, spacing, radius, typography]
  );

  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null); // object or null
  const [formVisible, setFormVisible] = useState(false);
  const [subjectMgrVisible, setSubjectMgrVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Bumped only when we want TaskForm to reset its internal draft (opening
  // a brand-new task, or switching to edit a different task). Flipping
  // formVisible alone does NOT reset — so a detour to SubjectManager and
  // back preserves whatever the user had typed.
  const [taskFormResetKey, setTaskFormResetKey] = useState(0);
  // Tracks whether we hid the form only to show SubjectManager (native
  // only — on web the form stays mounted). When SubjectManager closes we
  // re-open the form without bumping resetKey, restoring the draft.
  const [resumeFormAfterSubjects, setResumeFormAfterSubjects] = useState(false);

  // Initial load
  useEffect(() => {
    (async () => {
      const [t, s, n] = await Promise.all([loadTasks(), loadSubjects(), loadUserName()]);
      setTasks(t);
      setSubjects(s);
      setUserName(n);
      setLoading(false);
    })();
  }, []);

  // Persist whenever state changes (after initial load)
  useEffect(() => {
    if (!loading) saveTasks(tasks);
  }, [tasks, loading]);

  useEffect(() => {
    if (!loading) saveSubjects(subjects);
  }, [subjects, loading]);

  // --- Derived data ---

  const counts = useMemo(() => {
    const today = todayISO();
    const c = { all: tasks.length, today: 0, upcoming: 0, overdue: 0, done: 0 };
    for (const t of tasks) {
      if (t.done) {
        c.done++;
        continue;
      }
      if (!t.dueDate) continue;
      const diff = daysBetween(today, t.dueDate);
      if (diff < 0) c.overdue++;
      else if (diff === 0) c.today++;
      else c.upcoming++;
    }
    return c;
  }, [tasks]);

  const filtered = useMemo(() => {
    const today = todayISO();
    const matches = tasks.filter((t) => {
      const status = dueStatus(t.dueDate, t.done);
      switch (filter) {
        case 'today':
          return !t.done && t.dueDate && daysBetween(today, t.dueDate) === 0;
        case 'upcoming':
          return !t.done && t.dueDate && daysBetween(today, t.dueDate) > 0;
        case 'overdue':
          return status === 'overdue';
        case 'done':
          return t.done;
        case 'all':
        default:
          return true;
      }
    });
    // Sort: not-done first, then by dueDate ascending (no date goes last), then by creation
    return matches.slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
  }, [tasks, filter]);

  const taskCountsBySubject = useMemo(() => {
    const out = {};
    for (const t of tasks) {
      if (!t.subject) continue;
      out[t.subject] = (out[t.subject] ?? 0) + 1;
    }
    return out;
  }, [tasks]);

  // Progress summary for the header
  const progress = useMemo(() => {
    const doneCount = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
    return { doneCount, total, pct };
  }, [tasks]);

  // --- Handlers ---

  const openNewTask = () => {
    setEditingTask(null);
    setTaskFormResetKey((k) => k + 1); // fresh form
    setFormVisible(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskFormResetKey((k) => k + 1); // load this task's values
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingTask(null);
    // If the user actually closed (saved / cancelled / deleted), don't
    // auto-resume later from a SubjectManager detour.
    setResumeFormAfterSubjects(false);
  };

  const handleSaveTask = useCallback(
    (values) => {
      if (editingTask) {
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? { ...t, ...values } : t))
        );
      } else {
        const newTask = {
          id: newId(),
          title: values.title,
          description: values.description ?? null,
          subject: values.subject,
          dueDate: values.dueDate,
          done: false,
          createdAt: Date.now(),
        };
        setTasks((prev) => [newTask, ...prev]);
      }
      closeForm();
    },
    [editingTask]
  );

  const handleDeleteTask = useCallback(() => {
    if (!editingTask) return;
    setTasks((prev) => prev.filter((t) => t.id !== editingTask.id));
    closeForm();
  }, [editingTask]);

  const toggleDone = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);

  // Quick-delete from the card itself (only exposed for completed tasks).
  // No confirm: the task was already marked done, so this is a deliberate
  // follow-up. Editing via the card still has a confirm-delete in the sheet.
  const quickDeleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateSubjects = useCallback(
    (nextSubjects) => {
      // If a subject was removed, clear it from affected tasks
      const removed = subjects.filter((s) => !nextSubjects.includes(s));
      if (removed.length > 0) {
        setTasks((prev) =>
          prev.map((t) =>
            removed.includes(t.subject) ? { ...t, subject: null } : t
          )
        );
      }
      setSubjects(nextSubjects);
    },
    [subjects]
  );

  // --- Render ---

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting(userName || 'Student')}</Text>
          <Text style={styles.headerTitle}>Your tasks</Text>
        </View>
        <Pressable
          onPress={() => setSettingsVisible(true)}
          style={styles.iconBtn}
          hitSlop={8}
          accessibilityLabel="Settings"
        >
          <Text style={styles.iconBtnText}>⚙️</Text>
        </Pressable>
        <Pressable
          onPress={() => setSubjectMgrVisible(true)}
          style={[styles.iconBtn, { marginLeft: spacing.sm }]}
          hitSlop={8}
          accessibilityLabel="Manage subjects"
        >
          <Text style={styles.iconBtnText}>📚</Text>
        </Pressable>
      </View>

      {/* Progress card */}
      <ProgressCard progress={progress} styles={styles} />

      {/* Filter tabs */}
      <FilterTabs value={filter} onChange={setFilter} counts={counts} />

      {/* Task list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={() => toggleDone(item.id)}
            onPress={() => openEditTask(item)}
            onDelete={() => quickDeleteTask(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={emptyTitleFor(filter, tasks.length)}
            subtitle={emptySubtitleFor(filter, tasks.length)}
            icon={emptyIconFor(filter, tasks.length)}
          />
        }
      />

      {/* Floating add button — centered, grows while held */}
      <AddTaskFab onPress={openNewTask} styles={styles} shadow={shadow} />

      {/* Modals */}
      <TaskForm
        visible={formVisible}
        task={editingTask}
        subjects={subjects}
        resetKey={taskFormResetKey}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onCancel={closeForm}
        onManageSubjects={() => {
          // Keep TaskForm mounted so the user's in-progress draft (title,
          // subject selection, date) isn't wiped when they pop over to add
          // a subject. On web, modals stack cleanly, so we just show the
          // SubjectManager on top. On native, stacking two bottom-sheet
          // modals can look janky, so we close the form first and flag it
          // to be re-opened when SubjectManager closes. Because TaskForm
          // now only resets on resetKey changes (not on visible flips),
          // the draft is preserved across the detour.
          if (Platform.OS === 'web') {
            setSubjectMgrVisible(true);
          } else {
            setFormVisible(false);
            setResumeFormAfterSubjects(true);
            setTimeout(() => setSubjectMgrVisible(true), 250);
          }
        }}
      />
      <SubjectManager
        visible={subjectMgrVisible}
        subjects={subjects}
        onChange={updateSubjects}
        onClose={() => {
          setSubjectMgrVisible(false);
          // On native, re-show the TaskForm if we hid it only to let the
          // user pop into SubjectManager. resetKey is NOT bumped, so the
          // user returns to whatever they had typed.
          if (resumeFormAfterSubjects) {
            setResumeFormAfterSubjects(false);
            setTimeout(() => setFormVisible(true), 250);
          }
        }}
        taskCountsBySubject={taskCountsBySubject}
      />
      <SettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        userName={userName}
        onNameChange={(name) => {
          setUserName(name);
          saveUserName(name);
        }}
      />
    </SafeAreaView>
  );
}

// --- Subcomponents ---

// Floating "add task" button. Anchored to the horizontal center of the
// screen, it grows while the user holds it down. On release (or cancel)
// it springs back. onPress still fires so a quick tap also opens the form.
function AddTaskFab({ onPress, styles, shadow }) {
  const scale = useRef(new Animated.Value(1)).current;

  const start = () => {
    Animated.timing(scale, {
      toValue: 1.6,
      duration: 450,
      useNativeDriver: true,
    }).start();
  };

  const end = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 10,
      speed: 14,
    }).start();
  };

  return (
    <View style={styles.fabWrap} pointerEvents="box-none">
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={start}
          onPressOut={end}
          accessibilityLabel="Add task"
          accessibilityRole="button"
          style={[styles.fab, shadow.float]}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ProgressCard({ progress, styles }) {
  const { doneCount, total, pct } = progress;
  const { shadow } = useTheme();

  // Tween the bar's width whenever pct changes.
  // useNativeDriver MUST be false: the native driver can't animate layout
  // properties like width — only transforms and opacity.
  const animatedPct = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    Animated.timing(animatedPct, {
      toValue: pct,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [pct, animatedPct]);

  // Interpolate 0..100 → "0%".."100%" so the View's width is a percentage
  // string (matches the parent track width regardless of screen size).
  const widthInterpolated = animatedPct.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.progressCard, shadow.card]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.progressLabel}>Progress</Text>
        <Text style={styles.progressText}>
          {total === 0
            ? 'No tasks or events yet — add one to get started.'
            : `${doneCount} of ${total} done (${pct}%)`}
        </Text>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: widthInterpolated }]}
          />
        </View>
      </View>
    </View>
  );
}

// --- Helpers ---

function greeting(name) {
  const h = new Date().getHours();
  const suffix = name ? `, ${name}` : '';
  if (h < 5) return name ? `Up late, ${name}?` : 'Up late?';
  if (h < 12) return `Good morning${suffix}`;
  if (h < 17) return `Good afternoon${suffix}`;
  if (h < 22) return `Good evening${suffix}`;
  return `Late night${suffix}`;
}

function emptyTitleFor(filter, total) {
  if (total === 0) return 'No tasks or events yet';
  switch (filter) {
    case 'today':
      return 'Nothing upcoming or due today';
    case 'upcoming':
      return 'No upcoming tasks or events';
    case 'overdue':
      return 'Nothing overdue';
    case 'done':
      return 'No completed tasks or events';
    default:
      return 'All caught up';
  }
}

function emptySubtitleFor(filter, total) {
  if (total === 0) return 'Tap the + button to add your first task or event.';
  switch (filter) {
    case 'today':
      return 'Enjoy your day — or get ahead on something upcoming.';
    case 'upcoming':
      return 'No future due dates scheduled.';
    case 'overdue':
      return "You're on top of things. 🎉";
    case 'done':
      return 'Completed tasks will show up here.';
    default:
      return '';
  }
}

function emptyIconFor(filter, total) {
  if (total === 0) return '📚';
  switch (filter) {
    case 'today':
      return '☀️';
    case 'upcoming':
      return '📅';
    case 'overdue':
      return '🎯';
    case 'done':
      return '✅';
    default:
      return '🎉';
  }
}

const makeStyles = ({ colors, spacing, radius, typography }) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      display: 'flex',
      flexDirection: 'column',
    },
    loadingWrap: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    greeting: {
      ...typography.caption,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 2,
    },
    headerTitle: {
      ...typography.title,
    },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconBtnText: {
      fontSize: 20,
    },
    progressCard: {
      backgroundColor: colors.card,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    progressLabel: {
      ...typography.label,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    progressText: {
      ...typography.body,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.cardMuted,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
    // The FlatList itself needs flex:1 so it takes all remaining vertical
    // space below the filters; otherwise it only sizes to its content and
    // a gap can appear between filters and the list.
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: 120,
      flexGrow: 1,
    },
    fabWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fab: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabIcon: {
      color: '#fff',
      fontSize: 32,
      fontWeight: '300',
      lineHeight: 34,
    },
  });

