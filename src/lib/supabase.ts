// Supabase client — the single instance the whole app shares.
// Ref: docs/SUPABASE.md §2
//
// This uses the PUBLISHABLE (anon) key, which is safe to ship in the bundle:
// Row Level Security (supabase/schema.sql §4) is what actually protects the
// data. The secret / service-role key bypasses RLS and must never appear here.

import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

// Not a direct AsyncStorage import: that native module throws on import in a
// build compiled before it was added, and because this file is reached from the
// root layout, a throw here leaves every route with no exports. See
// session-storage.ts.
import { sessionStorage } from "@/lib/session-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// EXPO_PUBLIC_* vars are inlined at build time, so a missing .env fails here
// rather than as an opaque network error on the first query.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env and fill in " +
      "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, " +
      "then restart the dev server with `npx expo start -c`.",
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // required for React Native — there is no URL to parse
  },
});
