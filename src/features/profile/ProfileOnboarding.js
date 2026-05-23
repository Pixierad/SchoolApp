import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../../shared/theme';
import {
  isValidUsername,
  normalizeProfile,
  normalizeUsername,
} from '../../shared/profile';
import ProfileAvatar from './ProfileAvatar';

export default function ProfileOnboarding({ profile, onComplete }) {
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const styles = useMemo(
    () => makeStyles({ colors, spacing, radius, typography }),
    [colors, spacing, radius, typography]
  );
  const resolved = useMemo(() => normalizeProfile(profile), [profile]);
  const [name, setName] = useState(resolved.name);
  const [username, setUsername] = useState(resolved.username);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const nextName = name.trim();
    const nextUsername = normalizeUsername(username);
    if (!nextName) {
      setError('Choose a display name.');
      return;
    }
    if (!nextUsername || !isValidUsername(nextUsername)) {
      setError('Choose a username with at least 3 letters, numbers, or underscores.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onComplete?.({
        ...resolved,
        name: nextName,
        username: nextUsername,
      });
    } catch (e) {
      setError(e?.message || 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, shadow.card]}>
          <View style={styles.avatarWrap}>
            <ProfileAvatar profile={resolved} size={78} />
          </View>
          <Text style={styles.kicker}>Profile setup</Text>
          <Text style={styles.title}>Choose your name</Text>
          <Text style={styles.subtitle}>
            Your display name and username are shown to friends, chats, and study profiles.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              placeholder="e.g. Alex"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoCorrect={false}
              returnKeyType="next"
              maxLength={40}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.usernameRow}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                value={username}
                onChangeText={(value) => {
                  setUsername(normalizeUsername(value));
                  setError(null);
                }}
                placeholder="username"
                placeholderTextColor={colors.textFaint}
                style={[styles.input, styles.usernameInput]}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={submit}
                maxLength={24}
              />
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={({ pressed, hovered }) => [
              styles.primaryBtn,
              hovered && !busy && styles.primaryBtnHovered,
              pressed && !busy && styles.primaryBtnPressed,
              busy && styles.primaryBtnDisabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Continue</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors, spacing, radius, typography }) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 480,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    avatarWrap: {
      alignSelf: 'flex-start',
      marginBottom: spacing.xs,
    },
    kicker: {
      ...typography.label,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    title: {
      ...typography.title,
    },
    subtitle: {
      ...typography.bodyMuted,
      lineHeight: 20,
    },
    field: {
      gap: spacing.xs,
    },
    label: {
      ...typography.label,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: colors.cardMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
    },
    usernameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardMuted,
      overflow: 'hidden',
    },
    usernamePrefix: {
      color: colors.textMuted,
      paddingLeft: spacing.md,
      fontSize: 16,
      fontWeight: '900',
    },
    usernameInput: {
      flex: 1,
      borderWidth: 0,
      backgroundColor: 'transparent',
      paddingLeft: spacing.xs,
    },
    errorBox: {
      borderRadius: radius.md,
      backgroundColor: colors.dangerSoft,
      padding: spacing.md,
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: '700',
    },
    primaryBtn: {
      minHeight: 50,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    primaryBtnHovered: {
      backgroundColor: colors.primaryHover,
    },
    primaryBtnPressed: {
      opacity: 0.78,
    },
    primaryBtnDisabled: {
      opacity: 0.65,
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
    },
  });
