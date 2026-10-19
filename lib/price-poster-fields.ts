// Velden van het prijsaffiche-formulier. Gedeeld door het formulier, de PDF-route
// en de opslag per wagen (VehiclePoster.data).
export const POSTER_FIELD_KEYS = [
  "title",
  "subtitle",
  "price",
  "firstRegistration",
  "mileage",
  "fuel",
  "power",
  "displacement",
  "transmission",
  "warranty",
  "consumption",
  "consumptionNote",
  "co2",
  "euroNorm",
  "options",
  "adUrl",
  "carPassUrl",
  "adNumber"
] as const;

export type PosterFieldKey = (typeof POSTER_FIELD_KEYS)[number];
export type PosterValues = Record<PosterFieldKey, string>;

const MAX_LENGTH: Partial<Record<PosterFieldKey, number>> = {
  options: 4000,
  adUrl: 500,
  carPassUrl: 500,
  adNumber: 30
};

export function readPosterValuesFromForm(formData: FormData): PosterValues {
  const values = {} as PosterValues;
  for (const key of POSTER_FIELD_KEYS) {
    const raw = formData.get(key);
    values[key] = typeof raw === "string" ? raw.trim().slice(0, MAX_LENGTH[key] ?? 200) : "";
  }
  return values;
}

// Zet opgeslagen JSON veilig om naar een PosterValues-object (enkel bekende tekstvelden).
export function parseSavedPosterValues(data: unknown): Partial<PosterValues> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const result: Partial<PosterValues> = {};
  for (const key of POSTER_FIELD_KEYS) {
    if (typeof record[key] === "string") result[key] = record[key] as string;
  }
  return result;
}
