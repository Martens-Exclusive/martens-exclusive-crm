import Link from "next/link";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";
import {
  STORAGE_CAPACITY,
  STORAGE_PLANS,
  formatStorageDate,
  formatTirePressure,
  getBatteryStatus,
  getAnnualRevenueCents,
  getBillingLabel,
  getInvoiceAmountCents,
  getInvoiceStatus,
  getPlanLabel,
  getStorageAttention,
  getTireStatus,
  hasChecks,
  normalizePlan
} from "@/lib/storage";
import { formatCurrencyFromCents } from "@/lib/utils";
import { markChecked, markInvoiced, setPresence } from "./actions";

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

  // Werkelijke omzet: wie jaarlijks betaalt krijgt 1 maand gratis, dat zit hier al in.
  const yearlyRevenueCents = active.reduce((total, contract) => total + getAnnualRevenueCents(contract), 0);
  const monthlyRevenueCents = Math.round(yearlyRevenueCents / 12);
  const free = STORAGE_CAPACITY - active.length;
  const attention = getStorageAttention(contracts);
  const present = attention.present.length;
  const batteryDue = attention.batteryDue.length;
  const tiresDue = attention.tiresDue.length;
  const checksDue = attention.carsWithCheckDue.length;
  const invoicesDue = attention.invoicesDue.length;
  const invoicesDueCents = attention.invoicesDue.reduce(
    (total, contract) => total + getInvoiceAmountCents(contract.monthlyPriceCents, contract.billingPeriod, contract.invoiceAmountCents),
    0
  );

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="Bezet"
          value={`${active.length} / ${STORAGE_CAPACITY}`}
          note={`${free >= 0 ? `${free} ${free === 1 ? "plaats" : "plaatsen"} vrij` : `${-free} boven de capaciteit`} · ${present} aanwezig`}
          tone={free < 0 ? "bad" : "neutral"}
        />
        <Stat
          label="Maandomzet"
          value={formatCurrencyFromCents(monthlyRevenueCents)}
          note={`${formatCurrencyFromCents(yearlyRevenueCents)} per jaar`}
        />
        <Stat
          label="Per pakket"
          value={STORAGE_PLANS.map((plan) => active.filter((c) => normalizePlan(c.plan) === plan.value).length).join(" · ")}
          note={STORAGE_PLANS.map((plan) => plan.label).join(" · ")}
        />
        <Stat
          label="Te factureren"
          value={String(invoicesDue)}
          note={
            invoicesDue === 0
              ? attention.invoicesSoon.length > 0
                ? `${attention.invoicesSoon.length} binnenkort`
                : "Alles gefactureerd"
              : `${formatCurrencyFromCents(invoicesDueCents)} · ${attention.invoicesSoon.length} binnenkort`
          }
          tone={invoicesDue > 0 ? "bad" : "good"}
        />
        <Stat
          label="Checks nodig"
          value={String(checksDue)}
          note={
            checksDue === 0
              ? "Alles in orde"
              : `wagens · batterij ${batteryDue} · banden ${tiresDue}`
          }
          tone={checksDue > 0 ? "warn" : "good"}
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
            <table className="w-full min-w-[64rem] border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
                  <th className="px-3 pb-1">Klant</th>
                  <th className="px-3 pb-1">Wagen</th>
                  <th className="px-3 pb-1">Pakket</th>
                  {currentTab === "active" ? <th className="px-3 pb-1">Aanwezig</th> : null}
                  <th className="px-3 pb-1">Batterij-check</th>
                  <th className="px-3 pb-1">Banden en check</th>
                  {currentTab === "active" ? <th className="px-3 pb-1">Factuur</th> : null}
                  <th className="px-3 pb-1" />
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
  const tires = getTireStatus(contract.tiresCheckedAt);
  const invoice = getInvoiceStatus(contract.nextInvoiceAt);
  const cell = "bg-white px-3 py-3 align-top first:rounded-l-2xl last:rounded-r-2xl";

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
        {contract.spot ? <p className="mt-0.5 text-xs font-semibold text-black/60">Plaats {contract.spot}</p> : null}
      </td>
      <td className={cell}>
        <p className="font-semibold text-black">{getPlanLabel(contract.plan)}</p>
        <p className="mt-1 whitespace-nowrap text-xs text-black/50">{formatCurrencyFromCents(contract.monthlyPriceCents)} per maand</p>
        <p className="mt-0.5 whitespace-nowrap text-xs text-black/50">{getBillingLabel(contract.billingPeriod)} gefactureerd</p>
      </td>
      {showBattery ? (
        <td className={cell}>
          <form action={setPresence}>
            <input type="hidden" name="contractId" value={contract.id} />
            <input type="hidden" name="present" value={contract.isPresent ? "0" : "1"} />
            <button
              type="submit"
              title={contract.isPresent ? "Klik als de wagen weg is" : "Klik als de wagen terug is"}
              className="flex items-center gap-2"
            >
              <span
                className={`relative inline-block h-6 w-11 rounded-full transition ${
                  contract.isPresent ? "bg-emerald-500" : "bg-black/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    contract.isPresent ? "left-[1.375rem]" : "left-0.5"
                  }`}
                />
              </span>
              <span className={`text-xs font-semibold ${contract.isPresent ? "text-emerald-700" : "text-black/50"}`}>
                {contract.isPresent ? "Aanwezig" : "Weg"}
              </span>
            </button>
          </form>
        </td>
      ) : null}
      <td className={cell}>
        {showBattery && !hasChecks(contract.plan) ? (
          <span className="text-xs text-black/40">Check niet in Basic</span>
        ) : showBattery ? (
          <div className="flex flex-col items-start gap-2">
            <CheckPill status={battery} date={contract.batteryCheckedAt} />
            <form action={markChecked}>
              <input type="hidden" name="contractId" value={contract.id} />
              <input type="hidden" name="kind" value="battery" />
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
        <p className="whitespace-nowrap font-semibold text-black/75">
          {formatTirePressure(contract.tirePressureFrontBar, contract.tirePressureRearBar) || "-"}
        </p>
        {showBattery && hasChecks(contract.plan) ? (
          <div className="mt-2 flex flex-col items-start gap-2">
            <CheckPill status={tires} date={contract.tiresCheckedAt} />
            <form action={markChecked}>
              <input type="hidden" name="contractId" value={contract.id} />
              <input type="hidden" name="kind" value="tires" />
              <button type="submit" className="text-xs font-semibold text-black/60 underline underline-offset-4 hover:text-black">
                Check vandaag gedaan
              </button>
            </form>
          </div>
        ) : null}
      </td>
      {showBattery ? (
        <td className={cell}>
          <div className="flex flex-col items-start gap-2">
            <InvoicePill status={invoice} />
            <p className="whitespace-nowrap text-xs text-black/50">
              {formatCurrencyFromCents(getInvoiceAmountCents(contract.monthlyPriceCents, contract.billingPeriod, contract.invoiceAmountCents))}
            </p>
            <form action={markInvoiced}>
              <input type="hidden" name="contractId" value={contract.id} />
              <button type="submit" className="text-xs font-semibold text-black/60 underline underline-offset-4 hover:text-black">
                Gefactureerd
              </button>
            </form>
          </div>
        </td>
      ) : null}
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

function InvoicePill({ status }: { status: ReturnType<typeof getInvoiceStatus> }) {
  const color =
    status.tone === "due"
      ? "bg-red-50 text-red-700"
      : status.tone === "soon"
        ? "bg-amber-50 text-amber-700"
        : status.tone === "ok"
          ? "bg-black/5 text-black/70"
          : "bg-amber-50 text-amber-700";

  return (
    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {status.label}
    </span>
  );
}

function CheckPill({ status, date }: { status: ReturnType<typeof getBatteryStatus>; date: Date | null }) {
  const color =
    status.tone === "ok"
      ? "bg-emerald-50 text-emerald-700"
      : status.tone === "due"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {status.label}
      {date ? ` · ${formatStorageDate(date)}` : ""}
    </span>
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
