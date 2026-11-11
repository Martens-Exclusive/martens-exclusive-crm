// Hulpfuncties om de eerstvolgende open taak van een lead te tonen (pipeline, leadlijst, fiche).

const DAY_MS = 24 * 60 * 60 * 1000;

const dueFormatter = new Intl.DateTimeFormat("nl-BE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
});

export type NextTask = {
  id: string;
  title: string;
  dueLabel: string;
  overdue: boolean;
  // Hele dagen te laat; 0 = vandaag te laat.
  overdueDays: number;
  // Aantal extra open taken naast deze.
  more: number;
};

// Datums en uren worden opgeslagen zoals ze getypt worden ("muurklok"). Daarom vergelijken we
// met de huidige muurklok in Brussel en niet met de servertijd.
export function wallClockNow(now: Date = new Date()): Date {
  const text = now.toLocaleString("sv-SE", { timeZone: "Europe/Brussels" }).replace(" ", "T");
  const parsed = new Date(text);

  return Number.isNaN(parsed.getTime()) ? now : parsed;
}

export function getNextTask(
  tasks: Array<{ id: string; title: string; dueAt: Date }>,
  now: Date
): NextTask | null {
  if (tasks.length === 0) {
    return null;
  }

  const sorted = [...tasks].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const next = sorted[0];
  const overdue = next.dueAt.getTime() < now.getTime();

  return {
    id: next.id,
    title: next.title,
    dueLabel: dueFormatter.format(next.dueAt),
    overdue,
    overdueDays: overdue ? Math.floor((now.getTime() - next.dueAt.getTime()) / DAY_MS) : 0,
    more: sorted.length - 1
  };
}

// Waarde voor een datetime-local veld, zoals de datum is opgeslagen (muurklok).
export function toDateTimeInput(value: Date | null): string {
  if (!value) return "";

  const offset = value.getTimezoneOffset();
  const localDate = new Date(value.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}
