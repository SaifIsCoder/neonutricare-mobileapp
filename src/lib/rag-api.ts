import { Platform } from 'react-native';

export type AskRequest = {
  question: string;
};

export type AskResponse = {
  question: string;
  answer: string;
  sources: {
    rank: number;
    source: string;
    chunk: number;
    similarity: number;
  }[];
};

/**
 * On the Android emulator, `localhost` resolves to the emulator itself rather
 * than the host machine, so a dev server on the host is unreachable. 10.0.2.2 is
 * the emulator's alias for the host loopback. Rewriting here keeps one .env
 * value working across web, iOS sim and Android emulator.
 */
export function resolveApiUrl(raw: string | undefined): string | undefined {
  const base = raw?.trim().replace(/\/+$/, '');
  if (!base) return undefined;

  if (Platform.OS === 'android') {
    return base.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/, '$110.0.2.2');
  }

  return base;
}

export const RAG_API_URL = resolveApiUrl(process.env.EXPO_PUBLIC_RAG_API_URL);

/** POST /ask */
export async function askRag(question: string): Promise<AskResponse> {
  if (!RAG_API_URL) {
    throw new Error('No RAG service configured. Set EXPO_PUBLIC_RAG_API_URL in .env');
  }

  const response = await fetch(`${RAG_API_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error(`RAG API returned an error (${response.status})`);
  }

  const data: AskResponse = await response.json();
  return data;
}
