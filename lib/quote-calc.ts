// Prijsberekening voor offertes & bestelbonnen.
//
// Bewust geïmplementeerd met JS-floats in euro's (niet in centen), exact
// zoals de referentie-implementatie (https://claude.ai/artifact/QPs4hpAuCF5odwjjPpcmh5)
// dat doet. Dat is nodig om bit-voor-bit dezelfde afrondingen te krijgen als
// daar — reken je in centen (integers) dan rondt "incl. → excl." op sommige
// bedragen 1 cent anders af.

/** Belgische notatie (54.663,87 of 54663,87 of 54663.87) naar een getal. */
export function parseAmount(input: string | number | null | undefined): number {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : 0;
  }

  let value = String(input ?? "").replace(/[€\s]/g, "");

  if (!value) {
    return 0;
  }

  if (value.includes(",")) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, "");
  }

  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export type QuotePricingInput = {
  vatType: number; // 21 of 0 (margeregeling)
  priceIncludesVat: boolean;
  salePrice: number; // euro's, in de op dit moment gekozen invoermodus
  tradeIn: number;
  deposit: number;
};

export type QuotePricing = {
  pct: number;
  excl: number;
  vat: number;
  total: number;
  tradeIn: number;
  deposit: number;
  balance: number;
};

export function calcQuotePricing(input: QuotePricingInput): QuotePricing {
  const pct = input.vatType === 21 ? 21 : 0;
  let excl: number;
  let vat: number;
  let total: number;

  if (pct && input.priceIncludesVat) {
    total = round2(input.salePrice);
    excl = round2(total / 1.21);
    vat = round2(total - excl);
  } else {
    excl = round2(input.salePrice);
    vat = round2((excl * pct) / 100);
    total = round2(excl + vat);
  }

  const tradeIn = input.tradeIn || 0;
  const deposit = input.deposit || 0;
  const balance = round2(total - tradeIn - deposit);

  return { pct, excl, vat, total, tradeIn, deposit, balance };
}

export function formatEuro(value: number): string {
  return (
    "€ " +
    (value || 0).toLocaleString("nl-BE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}

export function formatDateBE(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
