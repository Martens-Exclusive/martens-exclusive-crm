// Gestructureerd zoekprofiel van een lead (deel van de behoefteanalyse).
// Wordt als JSON in LeadNeedsAnalysis.profile bewaard, zodat nieuwe vragen geen databasewijziging vragen.
// De bestaande tekstvelden (aanleiding, gebruik, budget, no-gos, ...) blijven in lib/needs-analysis.ts.

import type { NeedsAnalysisValues } from "@/lib/needs-analysis";
import { getOwnershipLabel, getTimelineLabel, splitList } from "@/lib/needs-analysis";

export const BODY_TYPES = ["Berline", "Coupé", "Break", "SUV", "Cabrio", "Hatchback", "Monovolume"];

export const FUEL_TYPES = ["Benzine", "Diesel", "Hybride (plug-in)", "Hybride (mild)", "Elektrisch"];

export const EXTERIOR_COLORS = [
  "Zwart",
  "Wit",
  "Grijs",
  "Zilver",
  "Blauw",
  "Groen",
  "Rood",
  "Bruin",
  "Beige",
  "Geel / oranje"
];

export const INTERIOR_COLORS = ["Zwart", "Grijs", "Beige / crème", "Cognac / bruin", "Rood", "Wit"];

// Veelgevraagde opties. Elke optie is: niet belangrijk, "moet erop" of "zou leuk zijn".
export const OPTION_SUGGESTIONS = [
  "Panoramadak",
  "Luchtvering / adaptieve vering",
  "Head-up display",
  "Trekhaak",
  "Ventilatie- en massagezetels",
  "Sportzetels",
  "Verwarmde zetels",
  "360° camera",
  "Softclose deuren",
  "Premium audio (B&W, Burmester, Bose, ...)",
  "Matrix / laser LED",
  "Sportuitlaat",
  "Keramische remmen",
  "Achterasbesturing",
  "Adaptieve cruisecontrol",
  "Nachtzicht",
  "Standkachel",
  "Sportstuur / Alcantara",
  "Keyless entry",
  "Trekgewicht / aanhangerkoppeling"
];

export const ANNUAL_KM_OPTIONS = [
  { value: "LT10", label: "Minder dan 10.000 km" },
  { value: "10_20", label: "10.000 – 20.000 km" },
  { value: "20_30", label: "20.000 – 30.000 km" },
  { value: "30_50", label: "30.000 – 50.000 km" },
  { value: "GT50", label: "Meer dan 50.000 km" }
];

export const ELECTRIC_RANGE_OPTIONS = [
  { value: "ANY", label: "Maakt niet uit" },
  { value: "50", label: "Minstens 50 km" },
  { value: "80", label: "Minstens 80 km" },
  { value: "150", label: "Minstens 150 km" },
  { value: "250", label: "Minstens 250 km" },
  { value: "350", label: "Minstens 350 km" },
  { value: "450", label: "Minstens 450 km" },
  { value: "550", label: "Minstens 550 km" }
];

export const CHARGING_OPTIONS = [
  { value: "HOME", label: "Thuis" },
  { value: "WORK", label: "Op het werk" },
  { value: "BOTH", label: "Thuis en op het werk" },
  { value: "NONE", label: "Nergens" }
];

export const MAX_MILEAGE_OPTIONS = [
  { value: "ANY", label: "Maakt niet uit" },
  { value: "10000", label: "Tot 10.000 km" },
  { value: "25000", label: "Tot 25.000 km" },
  { value: "50000", label: "Tot 50.000 km" },
  { value: "75000", label: "Tot 75.000 km" },
  { value: "100000", label: "Tot 100.000 km" }
];

export const BRAND_SUGGESTIONS = [
  "Porsche",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Range Rover",
  "Land Rover",
  "Volkswagen",
  "Volvo",
  "Lexus",
  "Cupra",
  "Tesla",
  "Bentley",
  "Maserati",
  "Alpine"
];

export const REASON_OPTIONS = [
  "Leasing loopt af",
  "Wil een nieuwere wagen",
  "Meer ruimte nodig",
  "Gezinsuitbreiding",
  "Meer vermogen / sportiever",
  "Overstap naar hybride of elektrisch",
  "Fiscale redenen (zaak)",
  "Onderhoud wordt te duur",
  "Huidige wagen is stuk",
  "Gewoon zin in iets anders"
];

export const QUALITY_OPTIONS = [
  "Comfort",
  "Ruimte",
  "Vermogen",
  "Verbruik",
  "Design",
  "Infotainment / techniek",
  "Rijgedrag",
  "Interieurkwaliteit",
  "Geluid van de motor",
  "Betrouwbaarheid",
  "Onderhoudskost",
  "Zicht en parkeren"
];

export const TRIP_TYPES = [
  "Woon-werk",
  "Veel snelweg",
  "Vooral stad",
  "Lange vakantieritten",
  "Zakelijke ritten",
  "Sleepwerk",
  "Sportief rijden",
  "Weekendritten"
];

export const PASSENGER_OPTIONS = ["Meestal alleen", "Met partner", "Gezin met kinderen", "Met hond", "Vaak 4 tot 5 personen", "7 zitplaatsen nodig"];

export const LONGEST_TRIP_OPTIONS = [
  { value: "LT100", label: "Tot 100 km" },
  { value: "100_250", label: "100 – 250 km" },
  { value: "250_500", label: "250 – 500 km" },
  { value: "GT500", label: "Meer dan 500 km" }
];

export const PAYMENT_OPTIONS = ["Cash", "Financiering", "Leasing", "Via de zaak", "Met inruil"];

export const BUDGET_OPTIONS = [
  { value: "40000", label: "Tot €40.000" },
  { value: "60000", label: "Tot €60.000" },
  { value: "80000", label: "Tot €80.000" },
  { value: "100000", label: "Tot €100.000" },
  { value: "150000", label: "Tot €150.000" },
  { value: "250000", label: "Tot €250.000" }
];

export const MIN_YEAR_OPTIONS = ["2020", "2021", "2022", "2023", "2024", "2025"].map((year) => ({ value: year, label: `Vanaf ${year}` }));

export const DECISION_OPTIONS = [
  "Beslist alleen",
  "Beslist samen met partner",
  "Beslist met boekhouder of vennoot",
  "Kijkt ook bij andere verkopers",
  "Kijkt enkel bij ons",
  "Vergelijkt vooral online"
];

export const BLOCKER_OPTIONS = [
  "Prijs te hoog",
  "Wil eerst een proefrit",
  "Twijfelt tussen modellen",
  "Wacht op inruilprijs",
  "Wacht op financiering of leasing",
  "Partner moet de wagen nog zien",
  "Levertermijn",
  "Zaak moet nog beslissen"
];

export const NOGO_OPTIONS = [
  "Geen diesel",
  "Geen schade in de historiek",
  "Geen herspuitingen",
  "Geen ex-huurwagen",
  "Geen import",
  "Geen sportzetels",
  "Geen harde vering",
  "Geen grote velgen",
  "Geen opvallende kleur"
];

export const CAR_YEAR_OPTIONS = ["2024 of nieuwer", "2022 – 2023", "2020 – 2021", "2018 – 2019", "2015 – 2017", "Ouder"];

// Veelvoorkomende modellen per merk, zodat je ze kan aantikken in plaats van typen.
export const MODEL_CATALOG: Record<string, string[]> = {
  Porsche: ["911", "718 Cayman", "718 Boxster", "Cayenne", "Cayenne Coupé", "Macan", "Panamera", "Taycan"],
  BMW: ["1 Reeks", "2 Reeks", "3 Reeks", "4 Reeks", "5 Reeks", "7 Reeks", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "M2", "M3", "M4", "M5", "i4", "i5", "iX"],
  "Mercedes-Benz": ["A-Klasse", "CLA", "C-Klasse", "E-Klasse", "S-Klasse", "GLA", "GLB", "GLC", "GLC Coupé", "GLE", "GLE Coupé", "GLS", "G-Klasse", "AMG GT", "EQE", "EQS"],
  Audi: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", "RS3", "RS4", "RS5", "RS6", "RS7", "RSQ8", "e-tron GT", "TT", "R8"],
  "Range Rover": ["Evoque", "Velar", "Sport", "Range Rover"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport"],
  Volkswagen: ["Golf", "Passat", "Tiguan", "Touareg", "T-Roc", "ID.4", "ID.7"],
  Volvo: ["XC40", "XC60", "XC90", "V60", "V90", "S90", "EX30", "EX90"],
  Lexus: ["NX", "RX", "UX", "ES", "LC"],
  Cupra: ["Formentor", "Born", "Leon", "Ateca"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X"]
};

export const VARIANT_OPTIONS = ["Instapversie", "Sportief (M Sport, AMG Line, S line)", "Plug-in hybride", "Performance (M, AMG, RS, GTS)", "Elektrisch", "Topmodel"];

export type Candidate = {
  brand: string;
  model: string;
  variant: string;
  note: string;
};

export type NeedsProfile = {
  reasons: string[];
  currentBrand: string;
  currentModel: string;
  currentVariant: string;
  currentYear: string;
  likes: string[];
  dislikes: string[];
  keepOptions: string[];
  annualKm: string;
  longestTrip: string;
  tripTypes: string[];
  passengers: string[];
  charging: string;
  minElectricRange: string;
  bodyTypes: string[];
  fuelTypes: string[];
  exteriorColors: string[];
  noGoColors: string[];
  interiorColors: string[];
  candidates: Candidate[];
  optionsMust: string[];
  optionsNice: string[];
  noGoTags: string[];
  budgetMax: string;
  payment: string[];
  maxMileage: string;
  minYear: string;
  decisionTags: string[];
  blockers: string[];
};

export function emptyProfile(): NeedsProfile {
  return {
    reasons: [],
    currentBrand: "",
    currentModel: "",
    currentVariant: "",
    currentYear: "",
    likes: [],
    dislikes: [],
    keepOptions: [],
    annualKm: "",
    longestTrip: "",
    tripTypes: [],
    passengers: [],
    charging: "",
    minElectricRange: "",
    bodyTypes: [],
    fuelTypes: [],
    exteriorColors: [],
    noGoColors: [],
    interiorColors: [],
    candidates: [],
    optionsMust: [],
    optionsNice: [],
    noGoTags: [],
    budgetMax: "",
    payment: [],
    maxMileage: "",
    minYear: "",
    decisionTags: [],
    blockers: []
  };
}

const text = (value: unknown, max = 300) => (typeof value === "string" ? value.trim().slice(0, max) : "");

const list = (value: unknown, maxItems = 40, maxLength = 80): string[] =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => text(item, maxLength))
            .filter(Boolean)
        )
      ).slice(0, maxItems)
    : [];

const choice = (value: unknown, options: ReadonlyArray<{ value: string }>) => {
  const candidate = text(value, 20);
  return options.some((option) => option.value === candidate) ? candidate : "";
};

const digits = (value: unknown, max = 9) => text(value, 20).replace(/[^\d]/g, "").slice(0, max);

/** Maakt van onbekende invoer (formulier of database) altijd een veilig, volledig profiel. */
export function sanitizeProfile(raw: unknown): NeedsProfile {
  const base = emptyProfile();

  if (!raw || typeof raw !== "object") return base;

  const input = raw as Record<string, unknown>;

  const candidates: Candidate[] = Array.isArray(input.candidates)
    ? input.candidates
        .map((item) => {
          const row = (item ?? {}) as Record<string, unknown>;

          return {
            brand: text(row.brand, 60),
            model: text(row.model, 80),
            variant: text(row.variant, 120),
            note: text(row.note, 200)
          };
        })
        .filter((row) => row.brand || row.model || row.variant)
        .slice(0, 8)
    : [];

  const optionsMust = list(input.optionsMust);
  const optionsNice = list(input.optionsNice).filter((item) => !optionsMust.includes(item));

  return {
    reasons: list(input.reasons),
    currentBrand: text(input.currentBrand, 60),
    currentModel: text(input.currentModel, 80),
    currentVariant: text(input.currentVariant, 120),
    currentYear: text(input.currentYear, 30),
    likes: list(input.likes, 20, 40),
    dislikes: list(input.dislikes, 20, 40),
    keepOptions: list(input.keepOptions),
    annualKm: choice(input.annualKm, ANNUAL_KM_OPTIONS),
    longestTrip: choice(input.longestTrip, LONGEST_TRIP_OPTIONS),
    tripTypes: list(input.tripTypes, 15, 40),
    passengers: list(input.passengers, 10, 40),
    charging: choice(input.charging, CHARGING_OPTIONS),
    minElectricRange: choice(input.minElectricRange, ELECTRIC_RANGE_OPTIONS),
    bodyTypes: list(input.bodyTypes, 10, 30),
    fuelTypes: list(input.fuelTypes, 10, 30),
    exteriorColors: list(input.exteriorColors, 12, 30),
    noGoColors: list(input.noGoColors, 12, 30),
    interiorColors: list(input.interiorColors, 12, 30),
    candidates,
    optionsMust,
    optionsNice,
    noGoTags: list(input.noGoTags, 15, 60),
    budgetMax: digits(input.budgetMax, 8),
    payment: list(input.payment, 8, 30),
    maxMileage: choice(input.maxMileage, MAX_MILEAGE_OPTIONS),
    minYear: digits(input.minYear, 4),
    decisionTags: list(input.decisionTags, 10, 60),
    blockers: list(input.blockers, 12, 60)
  } satisfies NeedsProfile;
}

export function readProfileFromForm(formData: FormData): NeedsProfile {
  const raw = formData.get("needs_profile");

  if (typeof raw !== "string" || raw.length === 0 || raw.length > 20000) return emptyProfile();

  try {
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    return emptyProfile();
  }
}

export function hasProfileContent(profile: NeedsProfile): boolean {
  return JSON.stringify(profile) !== JSON.stringify(emptyProfile());
}

export function formatCandidate(candidate: Candidate): string {
  return [candidate.brand, candidate.model, candidate.variant].filter(Boolean).join(" ");
}

const euro = new Intl.NumberFormat("nl-BE");

export function formatKm(value: string): string {
  return value ? `${euro.format(Number(value))} km` : "";
}

export function getLabel(options: ReadonlyArray<{ value: string; label: string }>, value: string): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

export type SearchLine = { label: string; value: string };

/** Korte, leesbare samenvatting van wat de klant zoekt; handig om mee te zoeken of door te sturen. */
export function buildSearchLines(values: NeedsAnalysisValues, profile: NeedsProfile): SearchLine[] {
  const lines: SearchLine[] = [];
  const add = (label: string, value: string) => {
    if (value) lines.push({ label, value });
  };

  add("Interesse", profile.candidates.map(formatCandidate).join(" · "));
  add("Carrosserie", profile.bodyTypes.join(", "));

  const drive = [
    profile.fuelTypes.join(", "),
    profile.minElectricRange && profile.minElectricRange !== "ANY"
      ? `elektrisch bereik minstens ${profile.minElectricRange} km`
      : ""
  ]
    .filter(Boolean)
    .join(" · ");
  add("Aandrijving", drive);

  const colors = [
    profile.exteriorColors.length ? profile.exteriorColors.join(", ") : "",
    profile.noGoColors.length ? `niet: ${profile.noGoColors.join(", ")}` : ""
  ]
    .filter(Boolean)
    .join(" · ");
  add("Kleur", colors);
  add("Interieur", profile.interiorColors.join(", "));

  const limits = [
    profile.budgetMax ? `max. €${euro.format(Number(profile.budgetMax))}` : "",
    profile.maxMileage && profile.maxMileage !== "ANY" ? `tot ${formatKm(profile.maxMileage)}` : "",
    profile.minYear ? `vanaf bouwjaar ${profile.minYear}` : ""
  ]
    .filter(Boolean)
    .join(" · ");
  add("Grenzen", limits);

  add("Moet erop", [...profile.optionsMust, ...splitList(values.mustHaves)].join(", "));
  add("Zou leuk zijn", profile.optionsNice.join(", "));
  add("Opties uit huidige wagen", profile.keepOptions.join(", "));
  add("Niet gewenst", [...profile.noGoTags, ...splitList(values.noGos)].join(", "));

  return lines;
}

export type CompletenessItem = { label: string; done: boolean };

/** Welke onderdelen van het gesprek zijn al besproken? Zo weet je aan de lijn wat nog ontbreekt. */
export function getCompleteness(values: NeedsAnalysisValues, profile: NeedsProfile): CompletenessItem[] {
  return [
    {
      label: "Aanleiding en huidige wagen",
      done: Boolean(values.reasonAndCurrentCar || profile.reasons.length || profile.currentBrand || profile.currentModel)
    },
    { label: "Gebruik en km per jaar", done: Boolean(values.usage || profile.annualKm || profile.tripTypes.length) },
    { label: "Carrosserie", done: profile.bodyTypes.length > 0 },
    { label: "Aandrijving en bereik", done: profile.fuelTypes.length > 0 || Boolean(profile.minElectricRange) },
    {
      label: "Kleur",
      done: profile.exteriorColors.length > 0 || profile.noGoColors.length > 0 || profile.interiorColors.length > 0
    },
    { label: "Merken en modellen", done: profile.candidates.length > 0 },
    {
      label: "Belangrijke opties",
      done: profile.optionsMust.length > 0 || profile.optionsNice.length > 0 || Boolean(values.mustHaves)
    },
    { label: "Budget", done: Boolean(values.budget || profile.budgetMax || profile.payment.length) },
    { label: "Privé of zaak", done: Boolean(values.ownership) },
    { label: "Timing", done: Boolean(values.timeline) },
    { label: "Beslissing", done: Boolean(values.decision || profile.decisionTags.length) }
  ];
}

export { getOwnershipLabel, getTimelineLabel };

export function formatCurrentCar(profile: NeedsProfile): string {
  return [profile.currentBrand, profile.currentModel, profile.currentVariant, profile.currentYear].filter(Boolean).join(" ");
}
