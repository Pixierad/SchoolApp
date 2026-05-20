import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from '../shared/theme';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import {
  createLocalAdminSession,
  isLocalAdminAccessAllowed,
  LOCAL_ADMIN_SESSION_STORAGE_KEY,
} from '../features/auth/localAdminCredentials';

const AuthScreen = React.lazy(() => import('../features/auth/AuthScreen'));
const SignedInApp = React.lazy(() => import('./SignedInApp'));

function writeWebPath(path, { replace = true } = {}) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (window.location.pathname === path) return;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]?.(null, '', path);
}

function isLoginPath() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const normalized = `/${String(window.location.pathname || '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')}`;
  return normalized === '/login';
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthGate />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AuthGate() {
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

  useEffect(() => {
    if (!isSupabaseConfigured || session === undefined) return;
    if (!session) {
      writeWebPath('/login');
      return;
    }
    if (isLoginPath()) writeWebPath('/');
  }, [session]);

  const handleLocalAdminSignIn = useCallback(async () => {
    if (!isLocalAdminAccessAllowed()) return;
    await AsyncStorage.setItem(LOCAL_ADMIN_SESSION_STORAGE_KEY, 'true');
    if (supabase) await supabase.auth.signOut().catch(() => {});
    setSession(createLocalAdminSession());
  }, []);

  if (session === undefined) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isSupabaseConfigured && !session) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Suspense fallback={<AuthFallback />}>
          <AuthScreen onLocalAdminSignIn={handleLocalAdminSignIn} />
        </Suspense>
      </SafeAreaView>
    );
  }

  return (
    <Suspense fallback={<AppFallback />}>
      <SignedInApp session={session} setSession={setSession} />
    </Suspense>
  );
}

function AuthFallback() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <SafeAreaView style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={colors.primary} />
    </SafeAreaView>
  );
}

function AppFallback() {
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
