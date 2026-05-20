import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from '../../src/shared/theme';
import { supabase, isSupabaseConfigured } from '../../src/services/supabase';
import {
  createLocalAdminSession,
  isLocalAdminAccessAllowed,
  LOCAL_ADMIN_SESSION_STORAGE_KEY,
} from '../../src/features/auth/localAdminCredentials';

const AuthScreen = React.lazy(() => import('../../src/features/auth/AuthScreen'));
const SignedInApp = React.lazy(() => import('../../src/application/SignedInApp'));

export default function MobileApp() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MobileAuthGate />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function MobileAuthGate() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const [session, setSession] = useState(isSupabaseConfigured ? undefined : null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    let mounted = true;

    (async () => {
      const savedLocalAdmin = await AsyncStorage.getItem(LOCAL_ADMIN_SESSION_STORAGE_KEY);
      if (!mounted) return;
      if (savedLocalAdmin === 'true') {
        if (!isLocalAdminAccessAllowed()) {
          await AsyncStorage.removeItem(LOCAL_ADMIN_SESSION_STORAGE_KEY);
          const { data } = await supabase.auth.getSession();
          if (mounted) setSession(data?.session ?? null);
          return;
        }
        await supabase.auth.signOut().catch(() => {});
        if (mounted) setSession(createLocalAdminSession());
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data?.session ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      const savedLocalAdmin = await AsyncStorage.getItem(LOCAL_ADMIN_SESSION_STORAGE_KEY);
      if (savedLocalAdmin === 'true' && isLocalAdminAccessAllowed()) return;
      setSession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleLocalAdminSignIn = useCallback(async () => {
    if (!isLocalAdminAccessAllowed()) return;
    await AsyncStorage.setItem(LOCAL_ADMIN_SESSION_STORAGE_KEY, 'true');
    if (supabase) await supabase.auth.signOut().catch(() => {});
    setSession(createLocalAdminSession());
  }, []);

  if (session === undefined) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isSupabaseConfigured && !session) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Suspense fallback={<LoadingFallback />}>
          <AuthScreen onLocalAdminSignIn={handleLocalAdminSignIn} />
        </Suspense>
      </SafeAreaView>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignedInApp session={session} setSession={setSession} />
    </Suspense>
  );
}

function LoadingFallback() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  return (
    <SafeAreaView style={styles.loadingWrap}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ActivityIndicator size="large" color={colors.primary} />
    </SafeAreaView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    loadingWrap: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
