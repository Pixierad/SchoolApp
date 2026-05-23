import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '../../shared/theme';
import {
  buildStudyHeatmap,
  formatDuration,
  formatHours,
  summarizeStudy,
} from './studyUtils';

export default function StudyHeatmap({ sessions = [], compact = false }) {
  const { colors, spacing, radius, typography } = useTheme();
  const styles = useMemo(
    () => makeStyles({ colors, spacing, radius, typography, compact }),
    [colors, spacing, radius, typography, compact]
  );
  const days = useMemo(() => buildStudyHeatmap(sessions, compact ? 84 : 112), [sessions, compact]);
  const summary = useMemo(() => summarizeStudy(sessions), [sessions]);
  const maxSeconds = Math.max(1, ...days.map((day) => day.seconds));

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Study heatmap</Text>
          <Text style={styles.subtitle}>
            {summary.sessionCount === 0
              ? 'No study sessions logged yet.'
              : `${formatHours(summary.totalSeconds)} total hours logged`}
          </Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakValue}>{summary.currentStreak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {days.map((day) => (
          <View
            key={day.key}
            accessibilityLabel={`${day.key}: ${formatDuration(day.seconds)}`}
            style={[
              styles.cell,
              {
                backgroundColor: colorForDay(day.seconds, maxSeconds, colors),
                borderColor: day.isToday ? colors.primary : colors.border,
              },
              day.isToday && styles.todayCell,
            ]}
          />
        ))}
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 0.25, 0.5, 0.75, 1].map((level) => (
          <View
            key={level}
            style={[
              styles.legendCell,
              { backgroundColor: colorForDay(level * maxSeconds, maxSeconds, colors) },
            ]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

export function StudySummaryStrip({ sessions = [] }) {
  const { colors, spacing, radius, typography } = useTheme();
  const styles = useMemo(
    () => makeStyles({ colors, spacing, radius, typography, compact: false }),
    [colors, spacing, radius, typography]
  );
  const summary = useMemo(() => summarizeStudy(sessions), [sessions]);

  return (
    <View style={styles.summaryGrid}>
      <SummaryTile label="Today" value={`${formatHours(summary.todaySeconds)}h`} styles={styles} />
      <SummaryTile label="7 days" value={`${formatHours(summary.weekSeconds)}h`} styles={styles} />
      <SummaryTile label="Total" value={`${formatHours(summary.totalSeconds)}h`} styles={styles} />
      <SummaryTile label="Sessions" value={String(summary.sessionCount)} styles={styles} />
    </View>
  );
}

function SummaryTile({ label, value, styles }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function colorForDay(seconds, maxSeconds, colors) {
  if (!seconds) return colors.cardMuted;
  const ratio = Math.max(0.12, Math.min(1, seconds / Math.max(1, maxSeconds)));
  if (ratio > 0.75) return colors.primary;
  if (ratio > 0.45) return colors.success;
  if (ratio > 0.2) return colors.successSoftHover || colors.successSoft;
  return colors.primarySoft;
}

const makeStyles = ({ colors, spacing, radius, typography, compact }) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: compact ? spacing.md : spacing.lg,
      gap: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    title: {
      ...typography.subheading,
    },
    subtitle: {
      ...typography.bodyMuted,
      marginTop: 2,
    },
    streakBadge: {
      minWidth: compact ? 76 : 92,
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    streakValue: {
      color: colors.primary,
      fontSize: compact ? 18 : 22,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    streakLabel: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: compact ? 3 : 4,
    },
    cell: {
      width: compact ? 10 : 13,
      height: compact ? 10 : 13,
      borderRadius: 3,
      borderWidth: 1,
    },
    todayCell: {
      borderWidth: 2,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-end',
    },
    legendText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    legendCell: {
      width: 12,
      height: 12,
      borderRadius: 3,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    summaryTile: {
      flex: 1,
      minWidth: 112,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: spacing.md,
    },
    summaryValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    summaryLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginTop: 2,
    },
  });
