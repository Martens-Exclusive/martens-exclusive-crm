// Snelkeuzes voor taken. De titel blijft altijd vrij in te vullen, dit zijn enkel veelgebruikte voorbeelden.
export const titleSuggestions = [
  "Terugbellen",
  "Offerte opvolgen",
  "Offerte opmaken",
  "Testrit inplannen",
  "Documenten opvragen",
  "Prijs bespreken",
  "Foto's of info doorsturen"
];

export const dateSuggestions = [
  { label: "Morgen", days: 1 },
  { label: "Over 3 dagen", days: 3 },
  { label: "Over 1 week", days: 7 },
  { label: "Over 2 weken", days: 14 }
];

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Een aantal dagen in de toekomst, om 9 uur 's ochtends (waarde voor een datetime-local veld).
export function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);

  return toLocalInputValue(date);
}

export const suggestionChipClass = (active: boolean) =>
  `rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
    active ? "border-black bg-black text-white" : "border-black/15 bg-raised text-black hover:bg-hover2"
  }`;
