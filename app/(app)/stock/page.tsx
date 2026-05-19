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

  const totalMargin = activeVehicles.reduce(
    (total, vehicle) => total + (vehicle.netProfitCents ?? 0),
    0
  );

  const consignmentCount = activeVehicles.filter(
    (vehicle) => vehicle.inventoryType === "CONSIGNMENT"
  ).length;

  const onOrderCount = activeVehicles.filter(
    (vehicle) => vehicle.inventoryType === "ON_ORDER"
  ).length;

  return (
    <main className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Actieve stock" value={String(activeVehicles.length)} />
        <SummaryCard label="Consignatie" value={String(consignmentCount)} />
        <SummaryCard label="In bestelling" value={String(onOrderCount)} />
        <SummaryCard
          label="Marge / commissie"
          value={formatCurrencyFromCents(totalMargin)}
        />
      </section>

      <section className="rounded-[30px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/50">
              Stock
            </p>
            <h1 className="mt-3 text-3xl font-bold text-black">Stockoverzicht</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">
              Compact overzicht van stockwagens, consignatie en bestellingen met
              directe focus op prijs, dagen in stock en marge.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={"/stock/new" as Route}
              className="rounded-2xl border border-black/15 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
            >
              Nieuwe stockwagen
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

      <VehicleOverview
        title={currentTab === "archive" ? "Archief" : "Actieve stock"}
        description={
          currentTab === "archive"
            ? "Verkochte wagens blijven hier raadpleegbaar met aankoop-, verkoop-, kosten- en margegegevens."
            : "Wagennummer, merk, model, kilometerstand, prijs en dagen in stock in één compact overzicht."
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

function VehicleOverview({
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
    inventoryType: string | null;
    commissionRate: number | null;
    commissionMinimumExclVatCents: number | null;
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
    <section className="rounded-[30px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/50">
            Stocklijst
          </p>
          <h2 className="mt-3 text-2xl font-bold text-black">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">
            {description}
          </p>
        </div>

        <p className="text-sm font-semibold text-black/50">
          {vehicles.length} voertuigen
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-black/10 bg-white">
        <div className="hidden grid-cols-[1fr_1.4fr_0.8fr_1fr_1fr_1fr_0.9fr] border-b border-black/10 bg-[#eeeeee] px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-black/45 lg:grid">
          <div>Wagennr.</div>
          <div>Wagen</div>
          <div>Km</div>
          <div>Prijs</div>
          <div>Dagen</div>
          <div>Marge</div>
          <div className="text-right">Actie</div>
        </div>

        {vehicles.length === 0 ? (
          <div className="p-8 text-center text-sm text-black/50">{emptyText}</div>
        ) : (
          <div className="divide-y divide-black/10">
            {vehicles.map((vehicle) => (
              <VehicleRow key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function VehicleRow({
  vehicle
}: {
  vehicle: {
    id: string;
    stockNumber: string;
    purchaseDate: Date | null;
    brand: string;
    model: string;
    vin: string | null;
    mileageKm: number | null;
    inventoryType: string | null;
    commissionRate: number | null;
    commissionMinimumExclVatCents: number | null;
    purchaseVatType: string | null;
    saleVatType: string | null;
    purchaseVatRate: number | null;
    saleVatRate: number | null;
    purchasePriceExclVatCents: number | null;
    salePriceExclVatCents: number | null;
    costsExclVatCents: number | null;
    netProfitCents: number | null;
    status: string;
  };
}) {
  return (
    <article className="grid gap-4 px-5 py-5 transition hover:bg-[#f7f7f7] lg:grid-cols-[1fr_1.4fr_0.8fr_1fr_1fr_1fr_0.9fr] lg:items-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40 lg:hidden">
          Wagennr.
        </p>
        <p className="text-base font-bold text-black">{vehicle.stockNumber}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge label={getInventoryTypeLabel(vehicle.inventoryType)} tone={getInventoryTone(vehicle.inventoryType)} />
          <Badge label={getStatusLabel(vehicle.status)} tone="neutral" />
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40 lg:hidden">
          Wagen
        </p>
        <Link
          href={`/stock/${vehicle.id}/edit` as Route}
          className="text-base font-bold text-black transition hover:text-black/65"
        >
          {vehicle.brand} {vehicle.model}
        </Link>
        <p className="mt-1 text-xs text-black/50">
          Chassis:{" "}
          {vehicle.vin ||
            (vehicle.inventoryType === "ON_ORDER" ? "nog niet beschikbaar" : "-")}
        </p>
      </div>

      <Metric
        label="Km"
        value={formatInteger(vehicle.mileageKm)}
      />

      <Metric
        label="Prijs"
        value={formatMoney(vehicle.salePriceExclVatCents)}
      />

      <Metric
        label="Dagen"
        value={formatDaysInStock(vehicle.purchaseDate)}
        tone={getDaysInStockTone(vehicle.purchaseDate)}
      />

      <Metric
        label={
          vehicle.inventoryType === "CONSIGNMENT" ? "Commissie" : "Marge"
        }
        value={formatMoney(vehicle.netProfitCents)}
        tone={getNetProfitTone(vehicle.netProfitCents)}
      />

      <div className="flex justify-start gap-2 lg:justify-end">
        <Link
          href={`/stock/${vehicle.id}/edit` as Route}
          className="rounded-2xl border border-black/15 bg-[#f8f8f8] px-4 py-2 text-sm font-semibold text-black/85 transition hover:bg-[#e2e2e2] hover:text-black"
        >
          Open
        </Link>

        {vehicle.status === "SOLD" ? (
          <DeleteVehicleButton vehicleId={vehicle.id} />
        ) : null}
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning" | "negative";
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40 lg:hidden">
        {label}
      </p>
      <p className={`text-sm font-bold ${getToneClassName(tone)}`}>{value}</p>
    </div>
  );
}

function Badge({
  label,
  tone
}: {
  label: string;
  tone: "neutral" | "blue" | "orange" | "black";
}) {
  const toneClassName = {
    neutral: "border-black/10 bg-[#f2f2f2] text-black/70",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    orange: "border-amber-200 bg-amber-50 text-amber-700",
    black: "border-black bg-black text-white"
  }[tone];

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${toneClassName}`}
    >
      {label}
    </span>
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
          ? "border-black bg-black text-white"
          : "border-black/10 bg-[#fafafa] text-black/70 hover:bg-[#e7e7e7] hover:text-black"
      }`}
    >
      {label}
    </Link>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
      <p className="text-sm font-semibold text-black/50">{label}</p>
      <p className="mt-4 text-3xl font-bold text-black">{value}</p>
    </div>
  );
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

function getToneClassName(tone: "default" | "positive" | "warning" | "negative") {
  if (tone === "positive") {
    return "text-green-700";
  }

  if (tone === "warning") {
    return "text-amber-700";
  }

  if (tone === "negative") {
    return "text-red-700";
  }

  return "text-black/80";
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

function getInventoryTypeLabel(inventoryType: string | null) {
  if (inventoryType === "STOCK") {
    return "Stock";
  }

  if (inventoryType === "CONSIGNMENT") {
    return "Consignatie";
  }

  if (inventoryType === "ON_ORDER") {
    return "In bestelling";
  }

  return inventoryType || "Stock";
}

function getInventoryTone(inventoryType: string | null) {
  if (inventoryType === "CONSIGNMENT") {
    return "blue" as const;
  }

  if (inventoryType === "ON_ORDER") {
    return "orange" as const;
  }

  return "black" as const;
}