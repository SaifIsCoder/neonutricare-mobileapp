import { sessionStorage } from '@/lib/session-storage';
import type { PersonalizedTip } from '@/lib/rag-api';

const STORAGE_KEY_PREFIX = '@neonutricare:tips_cache:';

type CachedData = {
  predictionId: string;
  tips: PersonalizedTip[];
  cachedAt: string;
};

export async function getCachedTips(predictionId: string): Promise<PersonalizedTip[] | null> {
  try {
    const raw = await sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${predictionId}`);
    if (!raw) return null;
    const parsed: CachedData = JSON.parse(raw);
    if (parsed.predictionId === predictionId && Array.isArray(parsed.tips)) {
      return parsed.tips;
    }
    return null;
  } catch (err) {
    console.warn('[tips-storage] Error reading cached tips:', err);
    return null;
  }
}

export async function setCachedTips(predictionId: string, tips: PersonalizedTip[]): Promise<void> {
  try {
    const data: CachedData = {
      predictionId,
      tips,
      cachedAt: new Date().toISOString(),
    };
    await sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${predictionId}`, JSON.stringify(data));
  } catch (err) {
    console.warn('[tips-storage] Error saving cached tips:', err);
  }
}

export async function clearCachedTips(predictionId: string): Promise<void> {
  try {
    await sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${predictionId}`);
  } catch (err) {
    console.warn('[tips-storage] Error clearing cached tips:', err);
  }
}
