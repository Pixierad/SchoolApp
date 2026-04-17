import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useTheme, ACCENTS, ACCENT_KEYS } from '../theme';

// Settings bottom sheet: dark/light mode toggle + accent color picker.
// Same swipe-to-dismiss behavior as SubjectManager.
export default function SettingsSheet({ visible, onClose }) {
  const {
    colors,
    spacing,
    radius,
    typography,
    shadow,
    mode,
    accent,
    isDark,
    setMode,
    setAccent,
  } = useTheme();

  const styles = useMemo(
    () => makeStyles({ colors, spacing, radius, typography }),
    [colors, spacing, radius, typography]
  );

  const screenHeight = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropFill} onPress={onClose} />
        <Animated.View
          style={[styles.sheet, shadow.float, { transform: [{ translateY }] }]}
        >
          <View style={styles.dragZone} {...panResponder.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>Appearance</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Mode toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Theme</Text>
              <View style={styles.segment}>
                <SegmentButton
                  label="☀️  Light"
                  active={mode === 'light'}
                  onPress={() => setMode('light')}
                  styles={styles}
                />
                <SegmentButton
                  label="🌙  Dark"
                  active={mode === 'dark'}
                  onPress={() => setMode('dark')}
                  styles={styles}
                />
              </View>
              <Text style={styles.hint}>
                {isDark
                  ? 'Easier on the eyes in low light.'
                  : 'Crisp and bright for daytime use.'}
              </Text>
            </View>

            {/* Accent picker */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Accent color</Text>
              <View style={styles.swatchGrid}>
                {ACCENT_KEYS.map((key) => {
                  const a = ACCENTS[key];
                  const selected = accent === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setAccent(key)}
                      style={[
                        styles.swatchWrap,
                        selected && { borderColor: a.primary },
                      ]}
                      accessibilityLabel={a.label}
                      accessibilityRole="button"
                    >
                      <View
                        style={[
                          styles.swatch,
                          { backgroundColor: a.primary },
                        ]}
                      >
                        {selected ? <Text style={styles.swatchCheck}>✓</Text> : null}
                      </View>
                      <Text
                        style={[
                          styles.swatchLabel,
                          selected && { color: colors.text, fontWeight: '700' },
                        ]}
                      >
                        {a.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.hint}>
                Changes apply instantly — pick what feels right.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SegmentButton({ label, active, onPress, styles }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </Pressable>
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
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      maxHeight: '75%',
      paddingBottom: spacing.lg,
    },
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
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.xl,
    },
    section: {
      gap: spacing.sm,
    },
    sectionLabel: {
      ...typography.label,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    hint: {
      ...typography.bodyMuted,
      fontSize: 13,
    },

    // Segmented control (light/dark)
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.cardMuted,
      borderRadius: radius.md,
      padding: 4,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md - 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBtnActive: {
      backgroundColor: colors.card,
    },
    segmentText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: colors.text,
    },

    // Accent swatches
    swatchGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      paddingTop: spacing.xs,
    },
    swatchWrap: {
      width: 72,
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchCheck: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '800',
      lineHeight: 22,
    },
    swatchLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });
