import Link from "next/link";

type LeadViewToggleProps = {
  active: "pipeline" | "list";
};

// Schakelaar tussen het pipeline-bord en de leadlijst.
export function LeadViewToggle({ active }: LeadViewToggleProps) {
  const base = "rounded-xl px-4 py-2 text-sm font-semibold transition";
  const on = "bg-black text-white";
  const off = "text-black/65 hover:bg-hover hover:text-black";

  return (
    <div className="inline-flex rounded-2xl border border-black/10 bg-white p-1">
      <Link href="/leads/pipeline" className={`${base} ${active === "pipeline" ? on : off}`}>
        Pipeline
      </Link>
      <Link href="/leads" className={`${base} ${active === "list" ? on : off}`}>
        Lijst
      </Link>
    </div>
  );
}
