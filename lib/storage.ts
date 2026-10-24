// Car Storage: vaste gegevens op één plek, zodat lijst, formulier en acties overeenkomen.

export const STORAGE_CAPACITY = 15;

// Een check ouder dan dit aantal dagen wordt rood ("Check nodig").
export const BATTERY_CHECK_INTERVAL_DAYS = 90;
export const TIRE_CHECK_INTERVAL_DAYS = 60;

export const STORAGE_PLANS = [
  { value: "BASIC", label: "Basic", priceCents: 15000 },
  { value: "PREMIUM", label: "Premium", priceCents: 20000 },
  { value: "EXCLUSIVE", label: "Exclusive", priceCents: 25000 }
] as const;

export type StoragePlanValue = (typeof STORAGE_PLANS)[number]["value"];

export const STORAGE_PLAN_VALUES = STORAGE_PLANS.map((plan) => plan.value) as [
  StoragePlanValue,
  ...StoragePlanValue[]
];

// Eerste versie bewaarde het pakket als bedrag ("150" / "200" / "250").
const LEGACY_PLANS: Record<string, StoragePlanValue> = {
  "150": "BASIC",
  "200": "PREMIUM",
  "250": "EXCLUSIVE"
};

export function normalizePlan(plan: string): StoragePlanValue {
  return (LEGACY_PLANS[plan] ?? plan) as StoragePlanValue;
}

// Batterij-check zit enkel in Premium en Exclusive, niet in Basic.
export function hasBatteryCheck(plan: string): boolean {
  return normalizePlan(plan) !== "BASIC";
}

export function getPlanLabel(plan: string): string {
  return STORAGE_PLANS.find((item) => item.value === normalizePlan(plan))?.label ?? plan;
}

export function getPlanPriceCents(plan: string): number {
  return STORAGE_PLANS.find((item) => item.value === normalizePlan(plan))?.priceCents ?? 0;
}

// "2,4" of "2.4" → 2.4 (bar). Leeg → null. Ongeldig of onrealistisch → undefined.
export function parseBar(value: string): number | null | undefined {
  const cleaned = value.trim().replace(",", ".");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0.5 && number <= 6 ? Math.round(number * 100) / 100 : undefined;
}

export function formatBar(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return (Number.isInteger(value) ? value.toFixed(1) : String(value)).replace(".", ",");
}

// Bv. "Voor 2,4 · Achter 2,6 bar" (of enkel de ingevulde kant).
export function formatTirePressure(front: number | null, rear: number | null): string {
  const parts = [
    front !== null ? `Voor ${formatBar(front)}` : "",
    rear !== null ? `Achter ${formatBar(rear)}` : ""
  ].filter(Boolean);
  return parts.length ? `${parts.join(" · ")} bar` : "";
}

// Datum van vandaag (Belgische tijd) als "YYYY-MM-DD".
export function todayBrussels(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(new Date());
}

// Datums worden opgeslagen als middernacht UTC en ook zo weergegeven (geen verschuiving van dag).
export function dateFromInput(value: string): Date | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null;
}

export function dateToInput(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function formatStorageDate(value: Date | null | undefined): string {
  return value
    ? new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium", timeZone: "UTC" }).format(value)
    : "";
}

export type BatteryStatus = { tone: "none" | "ok" | "due"; label: string; days: number | null };

export function getBatteryStatus(checkedAt: Date | null | undefined): BatteryStatus {
  return getCheckStatus(checkedAt, BATTERY_CHECK_INTERVAL_DAYS);
}

export function getTireStatus(checkedAt: Date | null | undefined): BatteryStatus {
  return getCheckStatus(checkedAt, TIRE_CHECK_INTERVAL_DAYS);
}

function getCheckStatus(checkedAt: Date | null | undefined, intervalDays: number): BatteryStatus {
  if (!checkedAt) return { tone: "none", label: "Nog geen check", days: null };

  const today = dateFromInput(todayBrussels()) as Date;
  const days = Math.max(0, Math.round((today.getTime() - checkedAt.getTime()) / 86_400_000));

  return days > intervalDays
    ? { tone: "due", label: "Check nodig", days }
    : { tone: "ok", label: "OK", days };
}

// "150", "150,50" of "€ 150" → centen. Ongeldig → null.
export function parseEuroToCents(value: string): number | null {
  const cleaned = value.replace(/[^\d,.]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : null;
}
