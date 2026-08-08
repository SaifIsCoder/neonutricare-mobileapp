// Auth session provider — the single source of truth for "is someone signed in".
// Ref: docs/SUPABASE.md §3
//
// The root layout reads `session` to decide whether the (tabs) group or the
// (auth) group is reachable, so every screen can assume it is on the right side
// of the guard and never has to check for itself.

import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  /** True until the persisted session has been read from AsyncStorage. */
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Restore the persisted session first so a returning user is never bounced
    // to the login screen while AsyncStorage is still being read.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // onAuthStateChange sets the session, which flips the root guard.
      },

      async signUp(fullName, email, password) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // Read by the handle_new_user trigger to populate profiles.full_name.
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;

        // With "Confirm email" ON, signUp succeeds but returns no session and
        // the user is stuck on the register screen with no explanation. Surface
        // it as an actionable error instead. (Turn the setting off in
        // Supabase → Authentication → Sign In / Providers → Email.)
        if (!data.session) {
          throw new Error(
            'Account created, but this project still requires email confirmation. ' +
              'Disable "Confirm email" in Supabase → Authentication → Sign In / Providers → Email.',
          );
        }
      },

      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
