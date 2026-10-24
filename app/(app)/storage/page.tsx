import Link from "next/link";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";
import {
  STORAGE_CAPACITY,
  STORAGE_PLANS,
  formatStorageDate,
  formatTirePressure,
  getBatteryStatus,
  getPlanLabel,
  normalizePlan
} from "@/lib/storage";
import { formatCurrencyFromCents } from "@/lib/utils";
import { markBatteryChecked } from "./actions";

type Contract = Awaited<ReturnType<typeof prisma.storageContract.findMany>>[number];

function matchesSearch(contract: Contract, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const haystack = [
    contract.firstName,
    contract.lastName,
    contract.phone,
    contract.email,
    contract.vehicleLabel,
    contract.chassisNumber,
    contract.spot,
    contract.tires,
    contract.notes
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return words.every((word) => haystack.includes(word));
}

export default async function StoragePage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const currentTab = tab === "ended" ? "ended" : "active";
  const query = (q ?? "").trim();

  const contracts = await prisma.storageContract.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
  });

  const active = contracts.filter((contract) => contract.status === "ACTIVE");
  const ended = contracts.filter((contract) => contract.status === "ENDED");
  const visible = (currentTab === "ended" ? ended : active).filter((contract) =>
    matchesSearch(contract, query)
  );

  const monthlyRevenueCents = active.reduce((total, contract) => total + contract.monthlyPriceCents, 0);
  const free = STORAGE_CAPACITY - active.length;
  const batteryDue = active.filter((contract) => getBatteryStatus(contract.batteryCheckedAt).tone !== "ok").length;

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/50">Car Storage</p>
            <h1 className="mt-3 text-3xl font-bold text-black">Wie staat waar</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">
              Alle storageklanten met wagen, pakket, batterij-check en banden. Bezetting en
              maandomzet worden automatisch berekend.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={"/storage/new" as Route}
              className="rounded-2xl border border-black/15 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
            >
              Nieuwe storageklant
            </Link>
            <TabLink href={"/storage" as Route} label={`Actief (${active.length})`} active={currentTab === "active"} />
            <TabLink href={"/storage?tab=ended" as Route} label={`Beëindigd (${ended.length})`} active={currentTab === "ended"} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Bezet"
          value={`${active.length} / ${STORAGE_CAPACITY}`}
          note={free >= 0 ? `${free} ${free === 1 ? "plaats" : "plaatsen"} vrij` : `${-free} boven de capaciteit`}
          tone={free < 0 ? "bad" : "neutral"}
        />
        <Stat
          label="Maandomzet"
          value={formatCurrencyFromCents(monthlyRevenueCents)}
          note={`${formatCurrencyFromCents(monthlyRevenueCents * 12)} per jaar`}
        />
        <Stat
          label="Per pakket"
          value={STORAGE_PLANS.map((plan) => active.filter((c) => normalizePlan(c.plan) === plan.value).length).join(" · ")}
          note={STORAGE_PLANS.map((plan) => plan.label).join(" · ")}
        />
        <Stat
          label="Batterij-check"
          value={String(batteryDue)}
          note={batteryDue === 0 ? "Alles in orde" : "wagens met check nodig of zonder check"}
          tone={batteryDue > 0 ? "warn" : "good"}
        />
      </section>

      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <form method="get" className="mb-5 flex flex-wrap gap-3">
          {currentTab === "ended" ? <input type="hidden" name="tab" value="ended" /> : null}
          <input
            name="q"
            defaultValue={query}
            placeholder="Zoek op naam, wagen, chassisnummer, plaats..."
            className="min-w-[16rem] flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-black focus:ring-1 focus:ring-black/20"
          />
          <button
            type="submit"
            className="rounded-2xl border border-black/15 bg-[#fafafa] px-5 py-3 text-sm font-semibold text-black/80 transition hover:bg-[#e7e7e7]"
          >
            Zoeken
          </button>
          {query ? (
            <Link
              href={(currentTab === "ended" ? "/storage?tab=ended" : "/storage") as Route}
              className="rounded-2xl px-3 py-3 text-sm font-semibold text-black/60 hover:text-black"
            >
              Wissen
            </Link>
          ) : null}
        </form>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-black/55">
            {query
              ? "Geen resultaten voor deze zoekopdracht."
              : currentTab === "ended"
                ? "Er zijn nog geen beëindigde contracten."
                : "Nog geen storageklanten. Voeg de eerste toe met 'Nieuwe storageklant'."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
                  <th className="px-4 pb-1">Klant</th>
                  <th className="px-4 pb-1">Wagen</th>
                  <th className="px-4 pb-1">Pakket</th>
                  <th className="px-4 pb-1">Plaats</th>
                  <th className="px-4 pb-1">Batterij</th>
                  <th className="px-4 pb-1">Banden</th>
                  <th className="px-4 pb-1" />
                </tr>
              </thead>
              <tbody>
                {visible.map((contract) => (
                  <ContractRow key={contract.id} contract={contract} showBattery={currentTab === "active"} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function ContractRow({ contract, showBattery }: { contract: Contract; showBattery: boolean }) {
  const battery = getBatteryStatus(contract.batteryCheckedAt);
  const cell = "bg-white px-4 py-3 align-top first:rounded-l-2xl last:rounded-r-2xl";

  return (
    <tr>
      <td className={cell}>
        <Link
          href={`/storage/${contract.id}` as Route}
          className="font-bold text-black transition hover:text-black/65"
        >
          {contract.firstName} {contract.lastName}
        </Link>
        <p className="mt-1 text-xs text-black/50">{[contract.phone, contract.email].filter(Boolean).join(" · ")}</p>
      </td>
      <td className={cell}>
        <p className="font-semibold text-black">{contract.vehicleLabel || "-"}</p>
        <p className="mt-1 text-xs text-black/50">{contract.chassisNumber || ""}</p>
      </td>
      <td className={cell}>
        <p className="font-semibold text-black">{getPlanLabel(contract.plan)}</p>
        <p className="mt-1 whitespace-nowrap text-xs text-black/50">{formatCurrencyFromCents(contract.monthlyPriceCents)} per maand</p>
      </td>
      <td className={cell}>{contract.spot || "-"}</td>
      <td className={cell}>
        {showBattery ? (
          <div className="flex flex-col items-start gap-2">
            <span
              className={
                battery.tone === "ok"
                  ? "whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  : battery.tone === "due"
                    ? "whitespace-nowrap rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                    : "whitespace-nowrap rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
              }
            >
              {battery.label}
              {contract.batteryCheckedAt ? ` · ${formatStorageDate(contract.batteryCheckedAt)}` : ""}
            </span>
            <form action={markBatteryChecked}>
              <input type="hidden" name="contractId" value={contract.id} />
              <button type="submit" className="text-xs font-semibold text-black/60 underline underline-offset-4 hover:text-black">
                Check vandaag gedaan
              </button>
            </form>
          </div>
        ) : (
          <span className="text-black/60">{formatStorageDate(contract.batteryCheckedAt) || "-"}</span>
        )}
      </td>
      <td className={cell}>
        <span className="text-black/75">{contract.tires || "-"}</span>
        {formatTirePressure(contract.tirePressureFrontBar, contract.tirePressureRearBar) ? (
          <p className="mt-1 whitespace-nowrap text-xs font-semibold text-black/60">
            {formatTirePressure(contract.tirePressureFrontBar, contract.tirePressureRearBar)}
          </p>
        ) : null}
      </td>
      <td className={`${cell} text-right`}>
        <Link
          href={`/storage/${contract.id}` as Route}
          className="rounded-2xl border border-black/15 bg-[#f8f8f8] px-4 py-2 text-sm font-semibold text-black/85 transition hover:bg-[#e2e2e2] hover:text-black"
        >
          Open
        </Link>
      </td>
    </tr>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "neutral"
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const color =
    tone === "bad" ? "text-red-700" : tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : "text-black";

  return (
    <div className="rounded-3xl border border-black/10 bg-[#f5f5f5] p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-black/55">{note}</p>
    </div>
  );
}

function TabLink({ href, label, active }: { href: Route; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-2xl border border-black bg-black px-5 py-3 text-sm font-semibold text-white"
          : "rounded-2xl border border-black/15 bg-[#fafafa] px-5 py-3 text-sm font-semibold text-black/80 transition hover:bg-[#e7e7e7] hover:text-black"
      }
    >
      {label}
    </Link>
  );
}
