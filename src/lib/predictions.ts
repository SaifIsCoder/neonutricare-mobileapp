// Reads and writes for the Supabase `predictions` table.
//
// The prediction itself comes from FastAPI via prediction-api.ts; this module
// owns persistence and the predict-then-save ordering.

import { toDbRow, type FormValues } from '@/lib/prediction-form';
import { runPrediction, type PredictionResult } from '@/lib/prediction-api';
import { supabase } from '@/lib/supabase';

export type { PredictionResult } from '@/lib/prediction-api';
export { PredictionError } from '@/lib/prediction-api';

/** Matches docs/DATABASE.md §2.2. */
export type PredictionRow = {
  id: string;
  created_at: string;
  age: string | null;
  address: string | null;
  weight_gain: string | null;
  education: string | null;
  occupation: string | null;
  family_type: string | null;
  parity: string | null;
  living_with_husband: boolean | null;
  booked: boolean | null;
  antenatal_visits: number | null;
  hemoglobin: number | null;
  iron_injection: boolean | null;
  pre_eclampsia: boolean | null;
  infection: boolean | null;
  prediction: string | null;
  confidence: number | null;
  recommendation: string | null;
};

/**
 * Predict first, then persist (CLAUDE.md golden rule 3). Returns the new row id
 * so the caller can navigate straight to the result.
 *
 * If /predict fails nothing is written, so a retry cannot leave a half-saved
 * assessment behind.
 */
export async function submitAssessment(values: FormValues): Promise<string> {
  const result: PredictionResult = await runPrediction(values);

  // Insert only the columns that exist on `predictions` (docs/DATABASE.md §2.2)
  // rather than spreading the whole response. The API also returns
  // `confidence_level`, which is derived presentation data with no column — and
  // spreading it would fail the insert. The UI recomputes the band from
  // `confidence` via confidenceBand(), so nothing is lost.
  const { data, error } = await supabase
    .from('predictions')
    .insert({
      ...toDbRow(values),
      prediction: result.prediction,
      confidence: result.confidence,
      recommendation: result.recommendation,
    })
    .select('id')
    .single();

  if (error) {
    // The prediction succeeded but the row did not save — say so, rather than
    // letting a Postgres message imply the screening itself failed.
    throw new Error(`Prediction succeeded but saving failed: ${error.message}`);
  }

  return data.id as string;
}

export async function fetchPrediction(id: string): Promise<PredictionRow | null> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchPredictions(): Promise<PredictionRow[]> {
  // RLS restricts this to the caller's own rows.
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type DashboardStats = {
  total_assessments: number;
  low_risk_cases: number;
  high_risk_cases: number;
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) throw new Error(error.message);

  // The RPC returns a single-row table, which supabase-js surfaces as an array.
  const row = Array.isArray(data) ? data[0] : data;
  return (row as DashboardStats | undefined) ?? {
    total_assessments: 0,
    low_risk_cases: 0,
    high_risk_cases: 0,
  };
}
