// The ONE place that maps between the three representations of a screening input:
//
//   UI label        what the user picks       '20–45 years'
//   API code        what /predict receives    'B'
//   DB value        what Supabase stores      '20–45 years' (text) or true/false (boolean)
//
// Source of truth: docs/ML_MODEL.md §3b (the encoding image + the model files).
// NOT the HTML mockup — it shows a numeric age, 3 weight bands and free-text
// occupation, none of which the model accepts. See docs/PRD.md §9 UI correction.
//
// Field order matches ML_MODEL.md §2 so the form reads in the model's own order.

export type FieldKey =
  | 'age'
  | 'address'
  | 'weight_gain'
  | 'education'
  | 'occupation'
  | 'family_type'
  | 'parity'
  | 'living_with_husband'
  | 'booked'
  | 'antenatal_visits'
  | 'hemoglobin'
  | 'iron_injection'
  | 'pre_eclampsia'
  | 'infection';

export type Choice = {
  /** Shown in the dropdown and stored in Supabase for history. */
  label: string;
  /** Sent to POST /predict. */
  code: string;
};

type SelectField = {
  key: FieldKey;
  kind: 'select';
  label: string;
  choices: readonly Choice[];
  /** Present when the DB column is boolean: the code that means `true`. */
  trueCode?: string;
};

type NumberField = {
  key: FieldKey;
  kind: 'number';
  label: string;
  hint: string;
  min: number;
  max: number;
  /** Hemoglobin accepts one decimal; visit counts do not. */
  decimal: boolean;
};

export type Field = SelectField | NumberField;

const YES_NO: readonly Choice[] = [
  { label: 'Yes', code: 'YES' },
  { label: 'No', code: 'NO' },
];

export const FIELDS: readonly Field[] = [
  {
    key: 'age',
    kind: 'select',
    label: 'Age',
    choices: [
      { label: '15–19 years', code: 'A' },
      { label: '20–45 years', code: 'B' },
    ],
  },
  {
    key: 'address',
    kind: 'select',
    label: 'Address',
    choices: [
      { label: 'Rural', code: 'R' },
      { label: 'Urban', code: 'U' },
    ],
  },
  {
    key: 'weight_gain',
    kind: 'select',
    label: 'Weight gain during pregnancy',
    choices: [
      { label: 'More than 10 kg', code: 'A' },
      { label: 'Less than 10 kg', code: 'B' },
    ],
  },
  {
    key: 'education',
    kind: 'select',
    label: 'Education',
    choices: [
      { label: 'Educated', code: 'E' },
      { label: 'Uneducated', code: 'U' },
    ],
  },
  {
    key: 'occupation',
    kind: 'select',
    label: 'Occupation',
    choices: [
      { label: 'Employed', code: 'E' },
      { label: 'Unemployed', code: 'U' },
    ],
  },
  {
    key: 'family_type',
    kind: 'select',
    label: 'Type of family',
    choices: [
      { label: 'Joint family', code: 'J' },
      { label: 'Single / nuclear family', code: 'S' },
    ],
  },
  {
    key: 'parity',
    kind: 'select',
    label: 'Parity (gravida)',
    choices: [
      { label: 'Primigravida', code: 'P' },
      { label: 'Multigravida', code: 'G' },
    ],
  },
  {
    key: 'living_with_husband',
    kind: 'select',
    label: 'Living with husband',
    choices: [
      { label: 'Yes', code: 'Y' },
      { label: 'No', code: 'N' },
    ],
    trueCode: 'Y',
  },
  {
    key: 'booked',
    kind: 'select',
    label: 'Booked',
    choices: [
      { label: 'Booked', code: 'B' },
      { label: 'Un-booked', code: 'N' },
    ],
    trueCode: 'B',
  },
  {
    key: 'antenatal_visits',
    kind: 'number',
    label: 'Number of antenatal visits',
    hint: '0–20 visits',
    min: 0,
    max: 20,
    decimal: false,
  },
  {
    key: 'hemoglobin',
    kind: 'number',
    label: 'Hemoglobin',
    hint: '4.0–18.0 g/dL',
    min: 4,
    max: 18,
    decimal: true,
  },
  {
    key: 'iron_injection',
    kind: 'select',
    label: 'History of iron injection',
    choices: YES_NO,
    trueCode: 'YES',
  },
  {
    key: 'pre_eclampsia',
    kind: 'select',
    label: 'Pre-eclampsia',
    choices: YES_NO,
    trueCode: 'YES',
  },
  {
    key: 'infection',
    kind: 'select',
    label: 'Infection',
    choices: YES_NO,
    trueCode: 'YES',
  },
] as const;

/** Raw form state: selects hold the chosen code, numbers hold the typed text. */
export type FormValues = Partial<Record<FieldKey, string>>;

export type ValidationErrors = Partial<Record<FieldKey, string>>;

export function validate(values: FormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const field of FIELDS) {
    const raw = values[field.key];

    if (raw === undefined || raw === '') {
      errors[field.key] = 'Required.';
      continue;
    }

    if (field.kind === 'number') {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        errors[field.key] = 'Enter a number.';
      } else if (!field.decimal && !Number.isInteger(parsed)) {
        errors[field.key] = 'Enter a whole number.';
      } else if (parsed < field.min || parsed > field.max) {
        errors[field.key] = `Must be between ${field.min} and ${field.max}.`;
      }
    }
  }

  return errors;
}

export function labelForCode(field: Field, code: string | undefined): string | undefined {
  if (field.kind !== 'select' || code === undefined) return undefined;
  return field.choices.find((choice) => choice.code === code)?.label;
}

/** Body for `POST /predict` — clean keys + confirmed codes (docs/API.md §2). */
export function toApiPayload(values: FormValues): Record<string, string | number> {
  const payload: Record<string, string | number> = {};

  for (const field of FIELDS) {
    const raw = values[field.key];
    if (raw === undefined) continue;
    payload[field.key] = field.kind === 'number' ? Number(raw) : raw;
  }

  return payload;
}

/**
 * Row for the Supabase `predictions` table (docs/DATABASE.md §2.2): human-readable
 * text for the selects that history displays, booleans for the yes/no columns.
 * `user_id` is omitted — the column defaults to auth.uid().
 */
export function toDbRow(values: FormValues): Record<string, string | number | boolean | null> {
  const row: Record<string, string | number | boolean | null> = {};

  for (const field of FIELDS) {
    const raw = values[field.key];
    if (raw === undefined) continue;

    if (field.kind === 'number') {
      row[field.key] = Number(raw);
    } else if (field.trueCode) {
      row[field.key] = raw === field.trueCode;
    } else {
      row[field.key] = labelForCode(field, raw) ?? raw;
    }
  }

  return row;
}
