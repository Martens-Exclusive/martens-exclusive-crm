import Link from "next/link";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";
import { formatCurrencyFromCents } from "@/lib/utils";
import { DeleteVehicleButton } from "./delete-vehicle-button";

export default async function StockPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const currentTab = tab === "archive" ? "archive" : "active";

  const [activeVehicles, archivedVehicles] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        status: {
          not: "SOLD"
        }
      },
      orderBy: [{ status: "asc" }, { purchaseDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.vehicle.findMany({
      where: { status: "SOLD" },
      orderBy: [{ updatedAt: "desc" }, { purchaseDate: "desc" }]
    })
  ]);

  const visibleVehicles = currentTab === "archive" ? archivedVehicles : activeVehicles;

  return (
    <main className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Actieve stock" value={String(activeVehicles.length)} />
        <SummaryCard label="Archief" value={String(archivedVehicles.length)} />
        <SummaryCard
          label="Totale actieve marge"
          value={formatCurrencyFromCents(
            activeVehicles.reduce(
              (total, vehicle) => total + (vehicle.netProfitCents ?? 0),
              0
            )
          )}
        />
      </section>

      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
              Stock
            </p>
            <h1 className="mt-3 text-2xl font-bold text-black">Stockoverzicht</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/70">
              Beheer actieve stock en archief in een rustige overzichtspagina, en open
              aparte pagina’s voor toevoegen of bewerken.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={"/stock/new" as Route}
              className="rounded-2xl border border-black/15 bg-[#fafafa] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#ececec]"
            >
              Nieuwe stockwagen toevoegen
            </Link>

            <TabLink
              href={"/stock?tab=active" as Route}
              label="Actieve stock"
              active={currentTab === "active"}
            />

            <TabLink
              href={"/stock?tab=archive" as Route}
              label="Archief"
              active={currentTab === "archive"}
            />
          </div>
        </div>
      </section>

      <VehicleCardList
        title={currentTab === "archive" ? "Archief" : "Actieve stock"}
        description={
          currentTab === "archive"
            ? "Verkochte wagens blijven hier raadpleegbaar met aankoop-, verkoop-, kosten- en margegegevens."
            : "Beschikbare en gereserveerde wagens voor dagelijkse opvolging, zonder brede horizontale tabellen."
        }
        vehicles={visibleVehicles}
        emptyText={
          currentTab === "archive"
            ? "Nog geen verkochte wagens in archief."
            : "Nog geen actieve stockwagens."
        }
      />
    </main>
  );
}

function VehicleCardList({
  title,
  description,
  vehicles,
  emptyText
}: {
  title: string;
  description: string;
  vehicles: Array<{
    id: string;
    stockNumber: string;
    purchaseDate: Date | null;
    brand: string;
    model: string;
    vin: string | null;
    mileageKm: number | null;
    purchaseVatType: string | null;
    saleVatType: string | null;
    purchaseVatRate: number | null;
    saleVatRate: number | null;
    purchasePriceExclVatCents: number | null;
    salePriceExclVatCents: number | null;
    costsExclVatCents: number | null;
    netProfitCents: number | null;
    status: string;
  }>;
  emptyText: string;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
          Stocklijst
        </p>
        <h2 className="mt-3 text-2xl font-bold text-black">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-black/70">{description}</p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {vehicles.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-black/12 bg-[#ececec] p-5 text-sm text-black/55">
            {emptyText}
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <article
              key={vehicle.id}
              className="rounded-[24px] border border-black/10 bg-[#efefef] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.05)]"
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-black/45">
                      Referentie
                    </p>
                    <div className="mt-2 flex flex-col gap-1">
                      <h3 className="text-xl font-bold text-black">{vehicle.stockNumber}</h3>
                      <p className="text-sm text-black/70">
                        {vehicle.brand} {vehicle.model}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl border border-black/12 bg-[#fafafa] px-4 py-2 text-sm font-semibold text-black">
                      {getStatusLabel(vehicle.status)}
                    </div>

                    <Link
                      href={`/stock/${vehicle.id}/edit` as Route}
                      className="rounded-2xl border border-black/15 bg-[#fafafa] px-4 py-2 text-sm font-semibold text-black/80 transition hover:bg-[#e7e7e7] hover:text-black"
                    >
                      Bewerken
                    </Link>

                    {vehicle.status === "SOLD" ? (
                      <DeleteVehicleButton vehicleId={vehicle.id} />
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
                  <section className="rounded-[20px] border border-black/10 bg-[#f7f7f7] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                      Wageninformatie
                    </p>

                    <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      <DetailItem label="Aankoopdatum" value={formatDate(vehicle.purchaseDate)} />
                      <DetailItem
                        label="Dagen in stock"
                        value={formatDaysInStock(vehicle.purchaseDate)}
                        strong
                        tone={getDaysInStockTone(vehicle.purchaseDate)}
                      />
                      <DetailItem
                        label="Kilometerstand"
                        value={formatInteger(vehicle.mileageKm)}
                      />
                      <DetailItem label="Chassisnummer" value={vehicle.vin || "-"} />
                    </div>

                    <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      <DetailItem
                        label="Aankoop btw-type"
                        value={formatVatType(vehicle.purchaseVatType)}
                      />
                      <DetailItem
                        label="Verkoop btw-type"
                        value={formatVatType(vehicle.saleVatType)}
                      />
                      <DetailItem
                        label="Aankoop btw-percentage"
                        value={formatVatRate(vehicle.purchaseVatRate)}
                      />
                      <DetailItem
                        label="Verkoop btw-percentage"
                        value={formatVatRate(vehicle.saleVatRate)}
                      />
                    </div>
                  </section>

                  <section className="rounded-[20px] border border-black/10 bg-[#f7f7f7] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                      Financieel
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <FinanceItem
                        label="Aankoop excl. btw"
                        value={formatMoney(vehicle.purchasePriceExclVatCents)}
                      />
                      <FinanceItem
                        label="Verkoop excl. btw"
                        value={formatMoney(vehicle.salePriceExclVatCents)}
                      />
                      <FinanceItem
                        label="Kosten excl. btw"
                        value={formatMoney(vehicle.costsExclVatCents)}
                      />
                      <FinanceItem
                        label="Netto winst"
                        value={formatMoney(vehicle.netProfitCents)}
                        highlight
                        tone={getNetProfitTone(vehicle.netProfitCents)}
                      />
                    </div>
                  </section>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function TabLink({
  href,
  label,
  active
}: {
  href: Route;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-black/15 bg-[#fafafa] text-black"
          : "border-black/10 bg-[#ececec] text-black/70 hover:bg-[#e2e2e2] hover:text-black"
      }`}
    >
      {label}
    </Link>
  );
}

function DetailItem({
  label,
  value,
  strong = false,
  tone = "default"
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "default" | "positive" | "warning" | "negative";
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-black/45">{label}</p>
      <p
        className={`mt-2 text-sm ${
          strong ? "font-bold" : "font-medium"
        } ${getToneClassName(tone, strong)}`}
      >
        {value}
      </p>
    </div>
  );
}

function FinanceItem({
  label,
  value,
  highlight = false,
  tone = "default"
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "positive" | "warning" | "negative";
}) {
  return (
    <div className="rounded-[18px] border border-black/10 bg-[#fafafa] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-black/45">{label}</p>
      <p
        className={`mt-2 text-base ${
          highlight ? "font-bold" : "font-semibold"
        } ${getToneClassName(tone, highlight)}`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
      <p className="text-sm font-semibold text-black/55">{label}</p>
      <p className="mt-4 text-3xl font-bold text-black">{value}</p>
    </div>
  );
}

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "medium"
  }).format(value);
}

function formatInteger(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("nl-BE").format(value);
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "-";
  }

  return formatCurrencyFromCents(value);
}

function formatVatRate(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("nl-BE", {
    maximumFractionDigits: 2
  }).format(value)}%`;
}

function formatVatType(value: string | null) {
  if (value === "BTW_WAGEN") {
    return "Btw wagen";
  }

  if (value === "MARGE_WAGEN") {
    return "Marge wagen";
  }

  return value || "-";
}

function formatDaysInStock(value: Date | null) {
  if (!value) {
    return "-";
  }

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const purchaseDate = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate()
  );
  const differenceInMs = startOfToday.getTime() - purchaseDate.getTime();
  const differenceInDays = Math.max(0, Math.floor(differenceInMs / 86_400_000));

  return `${differenceInDays} dagen`;
}

function getDaysInStockTone(value: Date | null) {
  if (!value) {
    return "default" as const;
  }

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const purchaseDate = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate()
  );
  const differenceInMs = startOfToday.getTime() - purchaseDate.getTime();
  const differenceInDays = Math.max(0, Math.floor(differenceInMs / 86_400_000));

  if (differenceInDays <= 30) {
    return "positive" as const;
  }

  if (differenceInDays <= 60) {
    return "warning" as const;
  }

  return "negative" as const;
}

function getNetProfitTone(value: number | null) {
  if (value === null || value === 0) {
    return "default" as const;
  }

  if (value > 0) {
    return "positive" as const;
  }

  return "negative" as const;
}

function getToneClassName(
  tone: "default" | "positive" | "warning" | "negative",
  emphasized: boolean
) {
  if (tone === "positive") {
    return emphasized ? "text-green-600" : "text-green-700";
  }

  if (tone === "warning") {
    return emphasized ? "text-amber-600" : "text-amber-700";
  }

  if (tone === "negative") {
    return emphasized ? "text-red-600" : "text-red-700";
  }

  return emphasized ? "text-black" : "text-black/88";
}

function getStatusLabel(status: string) {
  if (status === "AVAILABLE") {
    return "Beschikbaar";
  }

  if (status === "RESERVED") {
    return "Gereserveerd";
  }

  if (status === "SOLD") {
    return "Verkocht";
  }

  return status;
}