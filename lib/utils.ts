export function formatCurrencyFromCents(value: number, currency = "EUR") {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency
  }).format(value / 100);
}
