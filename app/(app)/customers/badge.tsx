// Klein label voor type en kenmerken van een klant (lijst en klantfiche).
export function Badge({
  tone,
  children
}: {
  tone: "dark" | "good" | "warn" | "bad" | "neutral";
  children: React.ReactNode;
}) {
  const color = {
    dark: "bg-black text-white",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-red-50 text-red-700",
    neutral: "bg-black/5 text-black/70"
  }[tone];

  return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{children}</span>;
}
