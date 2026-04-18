import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useTheme } from '../theme';

// Modal to manage the user's list of subjects.
// Add: type a name and tap +. Delete: tap the × on a row.
export default function SubjectManager({
  visible,
  subjects,
  onChange,
  onClose,
  taskCountsBySubject = {},
}) {
  const { colors, spacing, radius, typography, shadow, colorForSubject } = useTheme();
  const styles = useMemo(
    () => makeStyles({ colors, spacing, radius, typography }),
    [colors, spacing, radius, typography]
  );

  const [draft, setDraft] = useState('');

  // --- Swipe-to-dismiss gesture ---
  // Drag the handle/header downward → the sheet follows your finger.
  // Release past a threshold (or flick down fast enough) → the sheet
  // animates off-screen and calls onClose. Otherwise it springs back.
  const screenHeight = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(0)).current;

  // Reset position each time the sheet opens, so a half-finished drag
  // from a previous open doesn't leak into the next one.
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      // Don't claim on touch start — lets children (like "Done") handle taps.
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // Claim on meaningful downward drag. Both normal and capture variants
      // so we win the gesture even if a child Pressable would take it.
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 3 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        gs.dy > 3 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderGrant: () => {
        translateY.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        const dismissed = gs.dy > 100 || gs.vy > 0.5;
        if (dismissed) {
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (subjects.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Already exists', `"${trimmed}" is already in your subjects.`);
      return;
    }
    onChange([...subjects, trimmed]);
    setDraft('');
  };

  const remove = (name) => {
    const count = taskCountsBySubject[name] ?? 0;
    const message =
      count > 0
        ? `"${name}" is used by ${count} task${count === 1 ? '' : 's'}. Those tasks will lose their subject tag.`
        : `Remove "${name}" from your subjects?`;
    // On web, React Native's Alert.alert falls back to window.alert and
    // ignores Cancel/Remove buttons, so the onPress never fires. Use the
    // browser's native confirm() dialog instead.
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove subject?\n\n${message}`)) {
        onChange(subjects.filter((s) => s !== name));
      }
      return;
    }
    Alert.alert('Remove subject?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onChange(subjects.filter((s) => s !== name)),
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropFill} onPress={onClose} />
        <Animated.View
          style={[styles.sheet, shadow.float, { transform: [{ translateY }] }]}
        >
          {/* Drag zone: the whole top area — handle bar + header row.
              The pan responder only claims the gesture once the user is
              actually dragging (dy > 3), so tapping the "Done" Pressable
              inside still fires normally. */}
          <View style={styles.dragZone} {...panResponder.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>Subjects</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          </View>

          {/* Add row */}
          <View style={styles.addRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={add}
              placeholder="Add a subject (e.g. Math)"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              returnKeyType="done"
            />
            <Pressable onPress={add} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>

          {/* List */}
          {subjects.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No subjects yet. Add a few to organize your tasks by class.
              </Text>
            </View>
          ) : (
            <FlatList
              data={subjects}
              keyExtractor={(item) => item}
              style={styles.listOuter}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              renderItem={({ item }) => {
                const color = colorForSubject(item);
                const count = taskCountsBySubject[item] ?? 0;
                return (
                  <View style={[styles.row, { backgroundColor: color.bg }]}>
                    <View style={[styles.dot, { backgroundColor: color.fg }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: color.fg }]}>{item}</Text>
                      <Text style={styles.rowMeta}>
                        {count} {count === 1 ? 'task' : 'tasks'}
                      </Text>
                    </View>
                    <Pressable onPress={() => remove(item)} hitSlop={8} style={styles.removeBtn}>
                      <Text style={styles.removeText}>×</Text>
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = ({ colors, spacing, radius, typography }) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    backdropFill: { ...StyleSheet.absoluteFillObject },
    // Fixed 75% of screen height so the sheet is the same size whether the
    // subjects list is empty or full. The list itself scrolls internally
    // (flex: 1 on the FlatList / empty container below).
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      height: '75%',
      paddingBottom: spacing.lg,
    },
    // Encompasses the handle bar AND the header row. The pan responder is
    // attached to this whole area, so users can drag down from anywhere at
    // the top of the sheet — not just the tiny handle itself.
    dragZone: {
      paddingBottom: spacing.sm,
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    title: {
      ...typography.title,
      fontSize: 22,
    },
    doneText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    addRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
    },
    addBtn: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: {
      color: '#fff',
      fontSize: 26,
      fontWeight: '300',
      lineHeight: 28,
    },
    // flex: 1 on both the empty state and the list container so they consume
    // the remaining space inside the fixed-height sheet. Without this, an
    // empty list would collapse and make the sheet look off.
    empty: {
      flex: 1,
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      ...typography.bodyMuted,
      textAlign: 'center',
    },
    // Outer style: take all remaining vertical space inside the fixed-height
    // sheet so the list scrolls internally.
    listOuter: {
      flex: 1,
    },
    list: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radius.md,
      gap: spacing.md,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    rowTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    rowMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    removeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    removeText: {
      fontSize: 20,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 22,
    },
  });
