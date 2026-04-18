import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { relativeLabel, dueStatus } from '../utils/dates';

// A single task row: checkbox, title, subject badge, due date pill.
// Tap the card to edit. Tap the checkbox to toggle done.
// Once a task is done, a small delete button appears on the right as a
// shortcut to clear it out without opening the edit sheet.
export default function TaskCard({ task, onToggle, onPress, onDelete }) {
  const { colors, spacing, radius, typography, shadow, colorForSubject } = useTheme();
  const styles = useMemo(
    () => makeStyles({ colors, spacing, radius, typography }),
    [colors, spacing, radius, typography]
  );

  const subjectColor = colorForSubject(task.subject);
  const status = dueStatus(task.dueDate, task.done);
  const duePill = dueStyleFor(status, colors);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadow.card,
        task.done && styles.cardDone,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Checkbox */}
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        style={[styles.checkbox, task.done && styles.checkboxDone]}
      >
        {task.done && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>

      {/* Middle: title + meta */}
      <View style={styles.content}>
        <Text
          style={[styles.title, task.done && styles.titleDone]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.description ? (
          <Text
            style={[styles.description, task.done && styles.descriptionDone]}
            numberOfLines={2}
          >
            {task.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {task.subject ? (
            <View style={[styles.subjectBadge, { backgroundColor: subjectColor.bg }]}>
              <Text style={[styles.subjectText, { color: subjectColor.fg }]} numberOfLines={1}>
                {task.subject}
              </Text>
            </View>
          ) : null}
          {task.dueDate ? (
            <View style={[styles.duePill, { backgroundColor: duePill.bg }]}>
              <Text style={[styles.dueText, { color: duePill.fg }]}>
                {relativeLabel(task.dueDate)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Delete shortcut — only for completed tasks.
          Nested Pressable captures the tap so the outer card's onPress (edit)
          won't also fire. */}
      {task.done && onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && styles.deleteBtnPressed,
          ]}
          accessibilityLabel="Delete task"
          accessibilityRole="button"
        >
          <Text style={styles.deleteBtnText}>×</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function dueStyleFor(status, colors) {
  switch (status) {
    case 'overdue':
      return { bg: colors.dangerSoft, fg: colors.danger };
    case 'today':
      return { bg: colors.warningSoft, fg: colors.warning };
    case 'soon':
      return { bg: colors.primarySoft, fg: colors.primary };
    case 'done':
      return { bg: colors.successSoft, fg: colors.success };
    default:
      return { bg: colors.cardMuted, fg: colors.textMuted };
  }
}

const makeStyles = ({ colors, spacing, radius, typography }) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    cardDone: {
      backgroundColor: colors.cardMuted,
    },
    cardPressed: {
      opacity: 0.7,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: radius.sm,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxDone: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    checkmark: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 16,
    },
    content: {
      flex: 1,
      gap: spacing.sm,
    },
    title: {
      ...typography.body,
      fontWeight: '600',
      fontSize: 16,
    },
    titleDone: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    description: {
      ...typography.bodyMuted,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      marginTop: -2,
    },
    descriptionDone: {
      color: colors.textFaint,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    subjectBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.pill,
      maxWidth: 180,
    },
    subjectText: {
      fontSize: 12,
      fontWeight: '600',
    },
    duePill: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    dueText: {
      fontSize: 12,
      fontWeight: '600',
    },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    deleteBtnPressed: {
      opacity: 0.6,
    },
    deleteBtnText: {
      color: colors.danger,
      fontSize: 22,
      fontWeight: '500',
      lineHeight: 24,
      // slight nudge so the × sits visually centered
      marginTop: -2,
    },
  });
