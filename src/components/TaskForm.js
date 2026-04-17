import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, radius, typography, shadow, colorForSubject } from '../theme';
import { toISODate, fromISODate, relativeLabel } from '../utils/dates';

// Modal that handles both creating and editing a task.
// If `task` prop is present, we're editing; otherwise creating.
export default function TaskForm({
  visible,
  task,
  subjects,
  onSave,
  onDelete,
  onCancel,
  onManageSubjects,
}) {
  const isEditing = !!task;
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState(null); // ISO string or null
  const [showPicker, setShowPicker] = useState(false);

  // Reset form whenever modal opens
  useEffect(() => {
    if (visible) {
      setTitle(task?.title ?? '');
      setSubject(task?.subject ?? '');
      setDueDate(task?.dueDate ?? null);
      setShowPicker(false);
    }
  }, [visible, task]);

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Missing title', 'Please give your task a name.');
      return;
    }
    onSave({
      title: trimmed,
      subject: subject || null,
      dueDate: dueDate || null,
    });
  };

  const handleDelete = () => {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  const onDateChange = (event, selectedDate) => {
    // Android closes the picker on any interaction; iOS keeps it open until done
    if (Platform.OS === 'android') setShowPicker(false);
    if (event?.type === 'dismissed') return;
    if (selectedDate) setDueDate(toISODate(selectedDate));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropFill} onPress={onCancel} />
        <View style={[styles.sheet, shadow.float]}>
          {/* Handle */}
          <View style={styles.handle} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <Text style={styles.title}>
              {isEditing ? 'Edit task' : 'New task'}
            </Text>

            {/* Title input */}
            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Read Chapter 4"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                autoFocus={!isEditing}
                returnKeyType="done"
              />
            </View>

            {/* Subject picker */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Subject</Text>
                <Pressable onPress={onManageSubjects} hitSlop={8}>
                  <Text style={styles.manageLink}>Manage</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subjectRow}
              >
                <SubjectChip
                  label="None"
                  active={!subject}
                  onPress={() => setSubject('')}
                />
                {subjects.map((s) => (
                  <SubjectChip
                    key={s}
                    label={s}
                    active={subject === s}
                    onPress={() => setSubject(s)}
                  />
                ))}
                {subjects.length === 0 ? (
                  <Pressable onPress={onManageSubjects} style={styles.addSubjectChip}>
                    <Text style={styles.addSubjectText}>+ Add a subject</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            </View>

            {/* Due date */}
            <View style={styles.field}>
              <Text style={styles.label}>Due date</Text>
              <Pressable
                onPress={() => setShowPicker((v) => !v)}
                style={styles.dateButton}
              >
                <Text style={[styles.dateText, !dueDate && styles.dateTextMuted]}>
                  {dueDate ? relativeLabel(dueDate) : 'No due date'}
                </Text>
                {dueDate ? (
                  <Pressable onPress={() => setDueDate(null)} hitSlop={8}>
                    <Text style={styles.clearText}>Clear</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.dateHint}>Tap to set</Text>
                )}
              </Pressable>
              {showPicker && (
                <DateTimePicker
                  value={dueDate ? fromISODate(dueDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date(2000, 0, 1)}
                />
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {isEditing ? (
              <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <View style={styles.footerRight}>
              <Pressable onPress={onCancel} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveText}>{isEditing ? 'Save' : 'Add task'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SubjectChip({ label, active, onPress }) {
  const color = colorForSubject(label === 'None' ? '' : label);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: color.bg, borderColor: color.fg }
          : { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? color.fg : colors.textMuted },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    paddingBottom: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    ...typography.title,
    fontSize: 24,
  },
  field: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.label,
    textTransform: 'uppercase',
  },
  manageLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  subjectRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 160,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addSubjectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addSubjectText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  dateTextMuted: {
    color: colors.textFaint,
  },
  dateHint: {
    fontSize: 13,
    color: colors.textFaint,
  },
  clearText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deleteBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  deleteText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
  },
  cancelText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
});
