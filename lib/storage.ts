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

// Batterij-check en banden-check zitten enkel in Premium en Exclusive, niet in Basic.
export function hasChecks(plan: string): boolean {
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

// ---------------------------------------------------------------------------
// Facturatie: per contract maandelijks of jaarlijks. "Volgende factuur" is de datum
// waarop je de factuur moet maken; met "Gefactureerd" schuift die een periode op.
// ---------------------------------------------------------------------------

export const BILLING_PERIODS = [
  { value: "MONTHLY", label: "Maandelijks", months: 1 },
  { value: "YEARLY", label: "Jaarlijks", months: 12 }
] as const;

export type BillingPeriodValue = (typeof BILLING_PERIODS)[number]["value"];

export const BILLING_PERIOD_VALUES = BILLING_PERIODS.map((item) => item.value) as [
  BillingPeriodValue,
  ...BillingPeriodValue[]
];

// Zoveel dagen vooraf verschijnt een factuur als "binnenkort" op het dashboard.
export const INVOICE_WARNING_DAYS = 7;

export function getBillingMonths(period: string): number {
  return BILLING_PERIODS.find((item) => item.value === period)?.months ?? 1;
}

export function getBillingLabel(period: string): string {
  return BILLING_PERIODS.find((item) => item.value === period)?.label ?? "Maandelijks";
}

// Wie jaarlijks betaalt, krijgt 1 maand gratis: een jaarfactuur is standaard 11 × het maandbedrag.
export const YEARLY_PAID_MONTHS = 11;

// Bedrag van één factuur. Een zelf ingevuld bedrag gaat voor; anders maandbedrag ×
// aantal betaalde maanden (maandelijks 1, jaarlijks 11).
export function getInvoiceAmountCents(
  monthlyPriceCents: number,
  period: string,
  overrideCents?: number | null
): number {
  if (overrideCents !== null && overrideCents !== undefined) return overrideCents;
  return monthlyPriceCents * (period === "YEARLY" ? YEARLY_PAID_MONTHS : 1);
}

// Werkelijke omzet per jaar van één contract (met 1 maand gratis bij jaarlijks).
export function getAnnualRevenueCents(contract: {
  monthlyPriceCents: number;
  billingPeriod: string;
  invoiceAmountCents?: number | null;
}): number {
  const invoice = getInvoiceAmountCents(contract.monthlyPriceCents, contract.billingPeriod, contract.invoiceAmountCents);
  return invoice * (12 / getBillingMonths(contract.billingPeriod));
}

// Telt maanden bij een datum (middernacht UTC); 31 jan + 1 maand = 28/29 feb.
export function addMonthsUtc(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

export type InvoiceStatus = { tone: "none" | "ok" | "soon" | "due"; label: string; days: number | null };

export function getInvoiceStatus(nextInvoiceAt: Date | null | undefined): InvoiceStatus {
  if (!nextInvoiceAt) return { tone: "none", label: "Geen factuurdatum", days: null };

  const today = dateFromInput(todayBrussels()) as Date;
  const days = Math.round((nextInvoiceAt.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return { tone: "due", label: `${-days} ${-days === 1 ? "dag" : "dagen"} te laat`, days };
  if (days === 0) return { tone: "due", label: "Vandaag factureren", days };
  if (days <= INVOICE_WARNING_DAYS) return { tone: "soon", label: `Binnen ${days} ${days === 1 ? "dag" : "dagen"}`, days };
  return { tone: "ok", label: formatStorageDate(nextInvoiceAt), days };
}

// ---------------------------------------------------------------------------
// Wat heeft aandacht nodig? Gebruikt door het storage-overzicht én het dashboard.
// ---------------------------------------------------------------------------

export type StorageAttentionInput = {
  status: string;
  plan: string;
  isPresent: boolean;
  nextInvoiceAt: Date | null;
  batteryCheckedAt: Date | null;
  tiresCheckedAt: Date | null;
};

export function getStorageAttention<T extends StorageAttentionInput>(contracts: T[]) {
  const active = contracts.filter((contract) => contract.status === "ACTIVE");
  const present = active.filter((contract) => contract.isPresent);
  const byInvoiceDate = (a: T, b: T) => (a.nextInvoiceAt?.getTime() ?? 0) - (b.nextInvoiceAt?.getTime() ?? 0);

  // Facturen lopen door, ook als de wagen tijdelijk weg is. Checks enkel voor aanwezige wagens.
  const invoicesDue = active.filter((c) => getInvoiceStatus(c.nextInvoiceAt).tone === "due").sort(byInvoiceDate);
  const invoicesSoon = active.filter((c) => getInvoiceStatus(c.nextInvoiceAt).tone === "soon").sort(byInvoiceDate);
  const batteryDue = present.filter(
    (c) => hasChecks(c.plan) && getBatteryStatus(c.batteryCheckedAt).tone !== "ok"
  );
  const tiresDue = present.filter((c) => hasChecks(c.plan) && getTireStatus(c.tiresCheckedAt).tone !== "ok");
  const carsWithCheckDue = present.filter(
    (c) =>
      hasChecks(c.plan) &&
      (getBatteryStatus(c.batteryCheckedAt).tone !== "ok" || getTireStatus(c.tiresCheckedAt).tone !== "ok")
  );

  return { active, present, invoicesDue, invoicesSoon, batteryDue, tiresDue, carsWithCheckDue };
}
