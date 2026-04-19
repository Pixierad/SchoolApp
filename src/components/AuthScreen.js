// Email + password sign-in / sign-up screen.
//
// Shown whenever Supabase is configured but no session is present. Lets
// the user switch between sign-in and sign-up, surfaces Supabase errors
// inline, and calls back to App.js once a session is obtained (the
// auth listener in App.js does the actual handoff).
//
// If Supabase isn't configured (missing env vars) App.js skips this
// screen entirely and goes straight into local-only mode.

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme';
import { supabase } from '../supabase';

export default function AuthScreen() {
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const styles = useMemo(
    () => makeStyles({ colors, spacing, radius, typography }),
    [colors, spacing, radius, typography]
  );

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const isSignIn = mode === 'signin';
  const canSubmit = email.trim().length > 0 && password.length >= 6 && !busy;

  const submit = async () => {
    if (!canSubmit || !supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (isSignIn) {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        // Success -- the onAuthStateChange listener in App.js takes it from here.
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        // If email confirmation is required, Supabase returns a user but
        // no session. Tell the user to go confirm the email.
        if (!data?.session) {
          setInfo('Check your email for a confirmation link, then sign in.');
          setMode('signin');
          setPassword('');
        }
      }
    } catch (e) {
      setError(e?.message || 'Something went wrong. Try again.');
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
          <Text style={styles.brand}>SchoolApp</Text>
          <Text style={styles.title}>
            {isSignIn ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignIn
              ? 'Sign in to sync your tasks across devices.'
              : 'Sign up to back up your tasks to the cloud.'}
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!busy}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              textContentType={isSignIn ? 'password' : 'newPassword'}
              editable={!busy}
              onSubmitEditing={submit}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {info ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{info}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={[styles.primaryBtn, !canSubmit && { opacity: 0.5 }]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSignIn ? 'Sign in' : 'Sign up'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(isSignIn ? 'signup' : 'signin');
              setError(null);
              setInfo(null);
            }}
            hitSlop={8}
            disabled={busy}
            style={styles.switchLink}
          >
            <Text style={styles.switchText}>
              {isSignIn
                ? "New here? Create an account"
                : 'Already have an account? Sign in'}
            </Text>
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
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.md,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 420,
    },
    brand: {
      ...typography.label,
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: colors.primary,
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.title,
    },
    subtitle: {
      ...typography.bodyMuted,
      marginBottom: spacing.md,
    },
    fieldGroup: {
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
    errorBox: {
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: '600',
    },
    infoBox: {
      backgroundColor: colors.successSoft,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    infoText: {
      color: colors.success,
      fontSize: 14,
      fontWeight: '600',
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
      minHeight: 48,
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    switchLink: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    switchText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
