// Behoefteanalyse van een lead: de korte vragen die je bij een eerste gesprek stelt.
// Dit bestand wordt gedeeld door het formulier, de leadfiche en de server-acties,
// zodat vragen, voorbeeldteksten en opties maar op één plek staan.

export const NEEDS_OWNERSHIP_OPTIONS = [
  { value: "PRIVATE", label: "Privé" },
  { value: "SELF_EMPLOYED", label: "Zelfstandige" },
  { value: "COMPANY", label: "Vennootschap" },
  { value: "COMPANY_CAR", label: "Bedrijfswagen via werkgever" }
] as const;

export const NEEDS_TIMELINE_OPTIONS = [
  { value: "ASAP", label: "Zo snel mogelijk" },
  { value: "WITHIN_MONTH", label: "Binnen 1 maand" },
  { value: "ONE_TO_THREE_MONTHS", label: "1 tot 3 maanden" },
  { value: "LATER", label: "Later" },
  { value: "UNKNOWN", label: "Weet nog niet" }
] as const;

export type NeedsAnalysisValues = {
  reasonAndCurrentCar: string;
  usage: string;
  ownership: string;
  budget: string;
  mustHaves: string;
  noGos: string;
  timeline: string;
  decision: string;
  notes: string;
};

export type NeedsAnalysisKey = keyof NeedsAnalysisValues;

// Voorvoegsel van de veldnamen in het formulier ("needs_usage", ...), zodat ze
// niet botsen met de gewone leadvelden in hetzelfde formulier.
export const NEEDS_FORM_PREFIX = "needs_";

// De open tekstvragen. De vraag staat altijd boven het veld, het voorbeeld staat
// in grijs in het lege veld.
export const NEEDS_TEXT_FIELDS: Array<{
  name: Exclude<NeedsAnalysisKey, "ownership" | "timeline">;
  label: string;
  question: string;
  placeholder: string;
  rows: number;
}> = [
  {
    name: "reasonAndCurrentCar",
    label: "1 · Aanleiding en huidige wagen",
    question: "Waarom nu een nieuwe wagen, en wat rijdt hij nu? Wat bevalt wel of niet?",
    placeholder:
      "Bv. Leasing loopt af in maart. Rijdt nu een Audi Q5: te weinig power en het interieur is verouderd.",
    rows: 2
  },
  {
    name: "usage",
    label: "2 · Gebruik",
    question: "Hoeveel km per jaar, welk soort ritten, en wie rijdt er mee?",
    placeholder:
      "Bv. ± 30.000 km/jaar, veel snelweg. Meestal alleen, in het weekend met partner en 2 kinderen.",
    rows: 2
  },
  {
    name: "budget",
    label: "4 · Budget en betaling",
    question: "Welk budget of welke maandlast? Cash, financiering of leasing?",
    placeholder: "Bv. ± €85.000, financiering via de zaak.",
    rows: 2
  },
  {
    name: "mustHaves",
    label: "5 · Must-haves",
    question: "Wat zijn de 3 dingen die de wagen absoluut moet hebben?",
    placeholder: "Bv. Hybride, panoramadak, adaptieve vering",
    rows: 2
  },
  {
    name: "noGos",
    label: "6 · No-gos",
    question: "Wat mag absoluut niet (merk, kleur, motor, een slechte ervaring)?",
    placeholder: "Bv. Geen wit of rood, geen sportzetels",
    rows: 2
  },
  {
    name: "decision",
    label: "8 · Beslissing en concurrentie",
    question: "Wie beslist mee, en kijkt hij ook bij andere verkopers?",
    placeholder: "Bv. Beslist samen met partner. Kijkt ook bij een Porsche Centrum in Aalst.",
    rows: 2
  },
  {
    name: "notes",
    label: "Notities en afsluitvraag",
    question: "Wat zou er nog niet kloppen om te tekenen?",
    placeholder: "Bv. Vindt de prijs hoog, wil eerst een proefrit met de Cayenne.",
    rows: 3
  }
];

export const NEEDS_OWNERSHIP_QUESTION = {
  label: "3 · Privé of zaak",
  question: "Koopt hij privé, als zelfstandige, via een vennootschap, of is het een bedrijfswagen?",
  hint: "Bepaalt het btw-regime en het fiscale voordeel. Laat de boekhouder dat bevestigen."
};

export const NEEDS_TIMELINE_QUESTION = {
  label: "7 · Timing",
  question: "Hoe snel moet het gebeuren?"
};

const MAX_LENGTH = 2000;

export function emptyNeedsAnalysis(): NeedsAnalysisValues {
  return {
    reasonAndCurrentCar: "",
    usage: "",
    ownership: "",
    budget: "",
    mustHaves: "",
    noGos: "",
    timeline: "",
    decision: "",
    notes: ""
  };
}

function cleanText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_LENGTH) : "";
}

function cleanChoice(
  value: FormDataEntryValue | null,
  options: ReadonlyArray<{ value: string }>
): string {
  const text = typeof value === "string" ? value.trim() : "";
  return options.some((option) => option.value === text) ? text : "";
}

/** Leest de behoefteanalyse uit een formulier; onbekende of lege waarden worden "". */
export function readNeedsAnalysisFromForm(formData: FormData): NeedsAnalysisValues {
  const get = (name: NeedsAnalysisKey) => formData.get(`${NEEDS_FORM_PREFIX}${name}`);

  return {
    reasonAndCurrentCar: cleanText(get("reasonAndCurrentCar")),
    usage: cleanText(get("usage")),
    ownership: cleanChoice(get("ownership"), NEEDS_OWNERSHIP_OPTIONS),
    budget: cleanText(get("budget")),
    mustHaves: cleanText(get("mustHaves")),
    noGos: cleanText(get("noGos")),
    timeline: cleanChoice(get("timeline"), NEEDS_TIMELINE_OPTIONS),
    decision: cleanText(get("decision")),
    notes: cleanText(get("notes"))
  };
}

export function hasNeedsAnalysisContent(values: NeedsAnalysisValues): boolean {
  return Object.values(values).some((value) => value.length > 0);
}

/** Lege velden worden null in de database. */
export function needsAnalysisToData(values: NeedsAnalysisValues) {
  return {
    reasonAndCurrentCar: values.reasonAndCurrentCar || null,
    usage: values.usage || null,
    ownership: values.ownership || null,
    budget: values.budget || null,
    mustHaves: values.mustHaves || null,
    noGos: values.noGos || null,
    timeline: values.timeline || null,
    decision: values.decision || null,
    notes: values.notes || null
  };
}

/** Database-record (met mogelijk lege velden) → waarden voor het formulier en de weergave. */
export function toNeedsAnalysisValues(
  record: Partial<Record<NeedsAnalysisKey, string | null>> | null | undefined
): NeedsAnalysisValues {
  const values = emptyNeedsAnalysis();

  if (!record) return values;

  (Object.keys(values) as NeedsAnalysisKey[]).forEach((key) => {
    values[key] = record[key] ?? "";
  });

  return values;
}

/** "Hybride, panoramadak · adaptieve vering" → ["Hybride", "panoramadak", "adaptieve vering"] */
export function splitList(text: string): string[] {
  return text
    .split(/[\n,;·]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getOwnershipLabel(value: string): string {
  return NEEDS_OWNERSHIP_OPTIONS.find((option) => option.value === value)?.label ?? "";
}

export function getTimelineLabel(value: string): string {
  return NEEDS_TIMELINE_OPTIONS.find((option) => option.value === value)?.label ?? "";
}
