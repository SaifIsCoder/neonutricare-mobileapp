// Storage adapter for the Supabase auth session.
//
// `@react-native-async-storage/async-storage` is a NATIVE module, so it only
// exists in a dev/production build that was compiled after it was added to
// package.json. In a stale build it is null and importing it throws — which
// used to take down the whole app, because supabase.ts is imported by the root
// layout and a throwing module leaves every downstream route with no exports.
//
// This module never throws. If the native module is unavailable it falls back to
// in-memory storage and warns, so the app still runs — but the session will not
// survive an app restart until the build is regenerated:
//
//     npx expo run:android      (or: eas build --profile development)

import { Platform } from 'react-native';

/** The subset of the API that supabase-js needs. */
export type SessionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

function createMemoryStorage(): SessionStorage {
  const store = new Map<string, string>();
  return {
    async getItem(key) {
      return store.get(key) ?? null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
  };
}

function createWebStorage(): SessionStorage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return {
    async getItem(key) {
      return window.localStorage.getItem(key);
    },
    async setItem(key, value) {
      window.localStorage.setItem(key, value);
    },
    async removeItem(key) {
      window.localStorage.removeItem(key);
    },
  };
}

function createNativeStorage(): SessionStorage | null {
  try {
    // Deliberately require() rather than import: a top-level import of a
    // missing native module throws during module evaluation, which cannot be
    // caught by the importer.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-async-storage/async-storage');
    const store = (mod?.default ?? mod) as SessionStorage | undefined;
    if (
      !store ||
      typeof store.getItem !== 'function' ||
      typeof store.setItem !== 'function' ||
      typeof store.removeItem !== 'function'
    ) {
      return null;
    }
    return store;
  } catch {
    return null;
  }
}

/**
 * Depending on version, a missing native module fails either at import or at the
 * first method call — and a shape check cannot detect the latter. Wrapping each
 * call means neither one can reach the auth layer: the first failure degrades to
 * in-memory storage for the rest of the session.
 */
function withFallback(primary: SessionStorage, fallback: SessionStorage): SessionStorage {
  let degraded = false;

  function degrade(err: unknown) {
    if (!degraded) {
      degraded = true;
      warnUnavailable(err instanceof Error ? err.message : String(err));
    }
  }

  return {
    async getItem(key) {
      if (degraded) return fallback.getItem(key);
      try {
        return await primary.getItem(key);
      } catch (err) {
        degrade(err);
        return fallback.getItem(key);
      }
    },
    async setItem(key, value) {
      if (degraded) return fallback.setItem(key, value);
      try {
        await primary.setItem(key, value);
      } catch (err) {
        degrade(err);
        await fallback.setItem(key, value);
      }
    },
    async removeItem(key) {
      if (degraded) return fallback.removeItem(key);
      try {
        await primary.removeItem(key);
      } catch (err) {
        degrade(err);
        await fallback.removeItem(key);
      }
    },
  };
}

function warnUnavailable(reason?: string) {
  console.warn(
    '[NeoNutriCare] Persistent session storage is unavailable, falling back to ' +
      'in-memory storage — you will be signed out when the app restarts.\n' +
      (Platform.OS === 'web'
        ? 'localStorage is not accessible in this context.'
        : 'The AsyncStorage native module is missing from this build. Regenerate it with ' +
          '`npx expo run:android` (or `eas build --profile development`) — a Metro restart is not enough.') +
      (reason ? `\nUnderlying error: ${reason}` : ''),
  );
}

function resolveStorage(): SessionStorage {
  const memory = createMemoryStorage();
  const persistent = Platform.OS === 'web' ? createWebStorage() : createNativeStorage();

  if (!persistent) {
    warnUnavailable();
    return memory;
  }

  return withFallback(persistent, memory);
}

export const sessionStorage: SessionStorage = resolveStorage();
