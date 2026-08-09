// HTTP client for the FastAPI prediction service (docs/API.md).
//
// The service has one job: run the model. It never touches the database — the
// app persists the result to Supabase itself, and only after a 200 here
// (CLAUDE.md golden rule 3).

import { Platform } from 'react-native';

import { toApiPayload, type FormValues } from '@/lib/prediction-form';

/**
 * docs/API.md §7 recommends a client timeout with a retry on failure.
 *
 * 30s rather than 10s because Render's free tier spins an idle instance down,
 * and the next request has to wait for a cold start. A warm /predict answers in
 * well under a second, so a long wait here always means cold start or no
 * connectivity — never slow inference.
 */
const TIMEOUT_MS = 30_000;

export type PredictionResult = {
  prediction: 'Healthy' | 'At Risk';
  confidence: number;
  recommendation: string;
  /**
   * "High confidence" | "Moderate confidence" | "Low confidence".
   * Optional so older deployments of the service still validate — the UI derives
   * the same band from `confidence` anyway (see confidenceBand()).
   */
  confidence_level?: string;
};

export type PredictionErrorKind =
  /** No API URL configured. */
  | 'config'
  /** Timed out, or the request never reached the service. */
  | 'network'
  /** 422 — the service rejected a field value. */
  | 'validation'
  /** 5xx, or any other non-2xx. */
  | 'server'
  /** 200 but the body was not the documented shape. */
  | 'malformed';

export class PredictionError extends Error {
  readonly kind: PredictionErrorKind;
  /** False when retrying the same input cannot succeed. */
  readonly retryable: boolean;

  constructor(kind: PredictionErrorKind, message: string, retryable: boolean) {
    super(message);
    this.name = 'PredictionError';
    this.kind = kind;
    this.retryable = retryable;
  }
}

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

export const API_URL = resolveApiUrl(process.env.EXPO_PUBLIC_PREDICTION_API_URL);

function isResult(value: unknown): value is PredictionResult {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.prediction === 'string' &&
    typeof candidate.confidence === 'number' &&
    typeof candidate.recommendation === 'string'
  );
}

/** POST /predict. Throws `PredictionError` on every failure path. */
export async function runPrediction(values: FormValues): Promise<PredictionResult> {
  if (!API_URL) {
    throw new PredictionError(
      'config',
      'No prediction service configured. Set EXPO_PUBLIC_PREDICTION_API_URL in .env and restart with `npx expo start -c`.',
      false,
    );
  }

  // AbortSignal.timeout() is not available on all RN runtimes, so drive the
  // controller manually.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toApiPayload(values)),
      signal: controller.signal,
    });
  } catch {
    // fetch rejects for both a timeout abort and a genuine transport failure;
    // the signal is what distinguishes them.
    const aborted = controller.signal.aborted;
    throw new PredictionError(
      'network',
      aborted
        ? `The prediction service did not respond within ${TIMEOUT_MS / 1000} seconds. ` +
          'If it is hosted on a free plan it may be waking from idle — try again in a moment.'
        : `Could not reach the prediction service at ${API_URL}. Check that it is running and that the device can see it.`,
      true,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // FastAPI puts the reason in `detail` — a string for our HTTPExceptions, an
    // array for Pydantic's own body validation failures.
    const detail = await readDetail(response);

    if (response.status === 422) {
      throw new PredictionError(
        'validation',
        detail ?? 'The prediction service rejected one of the answers.',
        false, // the same input will fail again
      );
    }

    throw new PredictionError(
      'server',
      detail ?? `The prediction service returned an error (${response.status}).`,
      response.status >= 500, // 5xx may be transient; other 4xx will not be
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!isResult(body)) {
    throw new PredictionError(
      'malformed',
      'The prediction service returned an unexpected response.',
      false,
    );
  }

  return body;
}

async function readDetail(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    const detail = (body as { detail?: unknown } | null)?.detail;

    if (typeof detail === 'string') return detail;

    // Pydantic 422: [{ loc: [...], msg: "...", ... }, ...]
    if (Array.isArray(detail)) {
      const parts = detail
        .map((item) => {
          const entry = item as { loc?: unknown[]; msg?: unknown };
          const field = Array.isArray(entry.loc) ? entry.loc.at(-1) : undefined;
          const msg = typeof entry.msg === 'string' ? entry.msg : 'invalid';
          return field ? `${String(field)}: ${msg}` : msg;
        })
        .filter(Boolean);
      if (parts.length) return parts.join('; ');
    }

    return null;
  } catch {
    return null;
  }
}
