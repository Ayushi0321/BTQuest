import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { useFeedback, type FeedbackSettings } from '@/state/feedback';

const SYNCED = ['text', 'voice', 'vibration', 'comfort', 'speechRate'] as const;
type SyncedKey = (typeof SYNCED)[number];

export type Prefs = Partial<Pick<FeedbackSettings, SyncedKey>> & { onboarded?: boolean };
export type Profile = { id: string; username: string; fav_station: string | null; prefs: Prefs };

type Auth = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  onboarded: boolean;
  /** Each returns an error message to show, or null on success. */
  signUp: (username: string, email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  savePrefs: (patch: Prefs) => Promise<string | null>;
  deleteAccount: () => Promise<string | null>;
  sendResetLink: (email: string) => Promise<string | null>;
  /** Signs in with the tokens from a reset email link. */
  startRecovery: (accessToken: string, refreshToken: string) => Promise<string | null>;
  setNewPassword: (password: string) => Promise<string | null>;
};

const PROFILE_KEY = 'tquest.profile.v1';
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

const AuthCtx = createContext<Auth | null>(null);

function pickSynced(src: Prefs | FeedbackSettings): Prefs {
  const out: Prefs = {};
  for (const k of SYNCED) if (src[k] !== undefined) (out as Record<string, unknown>)[k] = src[k];
  return out;
}

function friendly(msg: string): string {
  if (/already registered/i.test(msg)) return 'That email already has an account.';
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/database error saving new user/i.test(msg)) return 'That username is taken.';
  if (/password should be/i.test(msg)) return 'Password needs at least 6 characters.';
  if (/invalid.*email|email.*invalid/i.test(msg)) return 'Enter a valid email.';
  if (/rate limit|security purposes/i.test(msg)) return 'Too many emails. Wait a few minutes and try again.';
  if (/different from the old/i.test(msg)) return 'Pick a password you haven’t used before.';
  if (/network|fetch/i.test(msg)) return 'Can’t reach TQuest. Check your connection.';
  return msg;
}

async function readCachedProfile(uid: string): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    const p = raw ? (JSON.parse(raw) as Profile) : null;
    return p?.id === uid ? p : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings, applySettings, loaded: feedbackLoaded } = useFeedback();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loaded, setLoaded] = useState<{ uid: string; profile: Profile | null } | null>(null);
  const appliedFor = useRef<string | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('id, username, fav_station, prefs').eq('id', userId).single();
      const p = error ? await readCachedProfile(userId) : (data as Profile);
      if (!live) return;
      setLoaded({ uid: userId, profile: p });
      if (!error) AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p)).catch(() => {});
    })();
    return () => { live = false; };
  }, [userId]);

  const profile = loaded && loaded.uid === userId ? loaded.profile : null;
  const ready = sessionReady && feedbackLoaded && (!userId || loaded?.uid === userId);

  const savePrefs = useCallback(async (patch: Prefs) => {
    if (!profile) return 'Not signed in.';
    const prefs = { ...profile.prefs, ...patch };
    const { error } = await supabase.from('profiles').update({ prefs }).eq('id', profile.id);
    if (error) return friendly(error.message);
    const next = { ...profile, prefs };
    setLoaded({ uid: next.id, profile: next });
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next)).catch(() => {});
    return null;
  }, [profile]);

  useEffect(() => {
    if (!profile || appliedFor.current === profile.id) return;
    appliedFor.current = profile.id;
    const patch = pickSynced(profile.prefs);
    if (Object.keys(patch).length) applySettings(patch);
  }, [profile, applySettings]);

  useEffect(() => {
    if (!profile?.prefs.onboarded || appliedFor.current !== profile.id) return;
    const next = pickSynced(settings);
    if (SYNCED.every((k) => profile.prefs[k] === next[k])) return;
    const t = setTimeout(() => { savePrefs(next); }, 800);
    return () => clearTimeout(t);
  }, [settings, profile, savePrefs]);

  const signUp = useCallback(async (username: string, email: string, password: string) => {
    const name = username.trim();
    if (!USERNAME_RE.test(name)) return 'Username: 3 to 20 letters, numbers or _.';
    const { data: free, error: e1 } = await supabase.rpc('username_available', { p_name: name });
    if (e1) return friendly(e1.message);
    if (!free) return 'That username is taken.';
    const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: name } } });
    return error ? friendly(error.message) : null;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? friendly(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
    appliedFor.current = null;
    AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
  }, []);

  const deleteAccount = useCallback(async () => {
    const id = userId;
    const { error } = await supabase.rpc('delete_account');
    if (error) return friendly(error.message);
    if (id) AsyncStorage.removeItem(`tquest.game.v1.${id}`).catch(() => {});
    await signOut();
    return null;
  }, [userId, signOut]);

  const sendResetLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('/reset-password') });
    return error ? friendly(error.message) : null;
  }, []);

  const startRecovery = useCallback(async (accessToken: string, refreshToken: string) => {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    return error ? 'This link is invalid or expired. Request a new one.' : null;
  }, []);

  const setNewPassword = useCallback(async (password: string) => {
    if (password.length < 6) return 'Password needs at least 6 characters.';
    const { error } = await supabase.auth.updateUser({ password });
    return error ? friendly(error.message) : null;
  }, []);

  const value = useMemo<Auth>(
    () => ({ ready, session, profile, onboarded: !!profile?.prefs.onboarded, signUp, signIn, signOut, savePrefs, deleteAccount, sendResetLink, startRecovery, setNewPassword }),
    [ready, session, profile, signUp, signIn, signOut, savePrefs, deleteAccount, sendResetLink, startRecovery, setNewPassword]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): Auth {
  const a = useContext(AuthCtx);
  if (!a) throw new Error('useAuth must be used inside <AuthProvider>');
  return a;
}
