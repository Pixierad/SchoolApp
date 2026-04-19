// Email OTP sign-in / sign-up screen.
//
// Two-step flow:
//   1. User enters their email and we call supabase.auth.signInWithOtp().
//      Supabase emails them a 6-digit code (the `{{ .Token }}` in the
//      "Magic Link" / "Confirm signup" email templates).
//   2. User enters the code and we call supabase.auth.verifyOtp() with
//      type: 'email'. On success the auth listener in App.js takes over.
//
// `shouldCreateUser: true` means the same flow handles both sign-in and
// sign-up -- if the email isn't on file yet, Supabase creates the user
// automatically when the OTP is verified.
//
// Shown whenever Supabase is configured but no session is present.
// If Supabase isn't configured (missing env vars) App.js skips this
// screen entirely and goes straight into local-only mode.

import React, { useState, useMemo, useRef, useEffect } from 'react';
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

const RESEND_COOLDOWN_SECONDS = 30;

export default function AuthScreen() {
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const styles = useMemo(
    () => makeStyles({ colors, spacing, radius, typography }),
    [colors, spacing, radius, typography]
  );

  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [resendIn, setResendIn] = useState(0);

  const codeInputRef = useRef(null);

  // Countdown for the "Resend code" link.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const isValidEmail = (v) => /^\S+@\S+\.\S+$/.test(v.trim());
  const trimmedEmail = email.trim();

  const canSendEmail = isValidEmail(trimmedEmail) && !busy;
  const canVerify = code.replace(/\s/g, '').length >= 6 && !busy;

  const sendOtp = async ({ silent = false } = {}) => {
    if (!supabase) return;
    if (!isValidEmail(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    if (!silent) setInfo(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: true },
      });
      if (err) throw err;
      setStep('code');
      setInfo(`We sent a 6-digit code to ${trimmedEmail}.`);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      // Focus the code field so the user can start typing immediately.
      setTimeout(() => codeInputRef.current?.focus?.(), 100);
    } catch (e) {
      setError(e?.message || 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!supabase || !canVerify) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const cleaned = code.replace(/\s/g, '');
      const { error: err } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: cleaned,
        type: 'email',
      });
      if (err) throw err;
      // Success -- App.js auth listener takes over from here.
    } catch (e) {
      setError(e?.message || 'That code didn’t work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const useDifferentEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
    setInfo(null);
    setResendIn(0);
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
            {step === 'email' ? 'Sign in with email' : 'Enter your code'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'email'
              ? 'We’ll email you a 6-digit code — no password needed.'
              : `Check ${trimmedEmail || 'your inbox'} for the 6-digit code.`}
          </Text>

          {step === 'email' ? (
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
                onSubmitEditing={() => canSendEmail && sendOtp()}
                returnKeyType="send"
              />
            </View>
          ) : (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>6-digit code</Text>
              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={(v) => setCode(v.replace(/[^\d]/g, '').slice(0, 6))}
                placeholder="123456"
                placeholderTextColor={colors.textFaint}
                style={[styles.input, styles.codeInput]}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                editable={!busy}
                onSubmitEditing={verifyOtp}
                returnKeyType="go"
              />
            </View>
          )}

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

          {step === 'email' ? (
            <Pressable
              onPress={() => sendOtp()}
              disabled={!canSendEmail}
              style={[styles.primaryBtn, !canSendEmail && { opacity: 0.5 }]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Send code</Text>
              )}
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={verifyOtp}
                disabled={!canVerify}
                style={[styles.primaryBtn, !canVerify && { opacity: 0.5 }]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify and sign in</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => sendOtp({ silent: true })}
                disabled={busy || resendIn > 0}
                hitSlop={8}
                style={styles.switchLink}
              >
                <Text
                  style={[
                    styles.switchText,
                    (busy || resendIn > 0) && { opacity: 0.5 },
                  ]}
                >
                  {resendIn > 0
                    ? `Resend code in ${resendIn}s`
                    : 'Resend code'}
                </Text>
              </Pressable>

              <Pressable
                onPress={useDifferentEmail}
                disabled={busy}
                hitSlop={8}
                style={styles.switchLink}
              >
                <Text style={styles.switchText}>Use a different email</Text>
              </Pressable>
            </>
          )}
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
    codeInput: {
      fontSize: 24,
      letterSpacing: 8,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
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
