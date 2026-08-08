// Auth session provider — the single source of truth for "is someone signed in".
// Ref: docs/SUPABASE.md §3
//
// The root layout reads `session` to decide whether the (tabs) group or the
// (auth) group is reachable, so every screen can assume it is on the right side
// of the guard and never has to check for itself.

import type { AuthError, Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Supabase's raw auth messages are terse and often describe a project setting
 * rather than anything the user did wrong ("email rate limit exceeded" really
 * means "Confirm email is on and the built-in SMTP quota is spent"). Translate
 * the ones we can actually hit into something actionable.
 */
function describeAuthError(error: AuthError): string {
  switch (error.code) {
    case 'over_email_send_rate_limit':
      return (
        'Too many confirmation emails have been sent from this project in the last hour. ' +
        'This only happens because email confirmation is switched on — turn off ' +
        '"Confirm email" in Supabase → Authentication → Sign In / Providers → Email, ' +
        'and signup will stop sending emails entirely. Otherwise, wait an hour.'
      );

    case 'email_not_confirmed':
      return (
        'This account exists but has not confirmed its email. Turn off "Confirm email" in ' +
        'Supabase → Authentication → Sign In / Providers → Email, then sign in again.'
      );

    case 'email_address_invalid':
      return 'Supabase rejected that email address. Note that example.com is not accepted — use a real domain.';

    case 'user_already_exists':
    case 'email_exists':
      return 'An account already exists for that email. Sign in instead.';

    case 'invalid_credentials':
      return 'That email and password do not match an account.';

    case 'weak_password':
      return 'That password is too weak. Use at least 6 characters.';

    case 'over_request_rate_limit':
      return 'Too many attempts in a short time. Wait a minute and try again.';

    default:
      return error.message;
  }
}

function isAuthError(error: unknown): error is AuthError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

function toFriendlyError(error: unknown): Error {
  if (isAuthError(error)) return new Error(describeAuthError(error));
  if (error instanceof Error) return error;
  return new Error(String(error));
}

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
        if (error) throw toFriendlyError(error);
        // onAuthStateChange sets the session, which flips the root guard.
      },

      async signUp(fullName, email, password) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // Read by the handle_new_user trigger to populate profiles.full_name.
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw toFriendlyError(error);

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
        if (error) throw toFriendlyError(error);
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
