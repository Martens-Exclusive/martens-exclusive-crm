import Link from "next/link";
import type { Route } from "next";
import type { Prisma } from "@prisma/client";

import { buildCustomerWhere, customerFiltersToSearch, readCustomerFilters, type CustomerFilters } from "@/lib/customer-filters";
import { CUSTOMER_LANGUAGES, CUSTOMER_TYPES, getCustomerFlags, getCustomerName, getCustomerTypeLabel } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { Badge } from "./badge";

const customerInclude = {
  leads: {
    orderBy: { createdAt: "desc" as const },
    select: {
      status: true,
      storageInterest: true,
      interestedBrand: true,
      interestedModel: true,
      primaryVehicle: { select: { brand: true, model: true } }
    }
  },
  storageContracts: { select: { status: true, vehicleLabel: true } }
} satisfies Prisma.CustomerInclude;

export default async function CustomersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = readCustomerFilters(await searchParams);

  const [customers, counts, mailable] = await Promise.all([
    prisma.customer.findMany({
      where: buildCustomerWhere(filters),
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { companyName: "asc" }],
      include: customerInclude
    }),
    prisma.customer.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.customer.count({ where: { mailingOptOut: false, email: { not: null } } })
  ]);

  const countByType = (type: string) => counts.find((row) => row.type === type)?._count._all ?? 0;
  const total = counts.reduce((sum, row) => sum + row._count._all, 0);
  const isFiltered = Boolean(filters.q || filters.type || filters.language || filters.mailing);

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/50">Klanten</p>
            <h1 className="mt-3 text-3xl font-bold text-black">Klantenbestand</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">
              Iedereen met wie Martens Exclusive contact heeft. Nieuwe leads en storageklanten komen hier
              automatisch bij, en een bestaande klant wordt herkend op e-mail of telefoon.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={"/customers/new" as Route}
              className="rounded-2xl border border-black/15 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
            >
              Nieuwe klant
            </Link>
            <a
              href={`/api/customers/export${customerFiltersToSearch(filters)}`}
              className="rounded-2xl border border-black/15 bg-raised px-5 py-3 text-sm font-semibold text-black/80 transition hover:bg-hover2 hover:text-black"
            >
              Exporteren ({customers.length})
            </a>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Totaal" value={String(total)} note="in het klantenbestand" />
        <Stat label="Klanten" value={String(countByType("CUSTOMER"))} note="deden al zaken met ons" />
        <Stat label="Prospects" value={String(countByType("PROSPECT"))} note="nog geen aankoop" />
        <Stat label="Mailbaar" value={String(mailable)} note="e-mail en niet uitgeschreven" />
      </section>

      <section className="rounded-[28px] border border-black/10 bg-card p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="mb-4 flex flex-wrap gap-2">
          <TabLink filters={filters} type="" label="Alle" />
          {CUSTOMER_TYPES.map((item) => (
            <TabLink key={item.value} filters={filters} type={item.value} label={item.label} />
          ))}
        </div>

        <form method="get" className="mb-5 flex flex-wrap items-center gap-3">
          {filters.type ? <input type="hidden" name="type" value={filters.type} /> : null}
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Zoek op naam, bedrijf, e-mail, telefoon, gemeente, merk..."
            className="min-w-[16rem] flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-black focus:ring-1 focus:ring-black/20"
          />
          <select
            name="language"
            defaultValue={filters.language}
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black/20"
          >
            <option value="">Alle talen</option>
            {CUSTOMER_LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/80">
            <input type="checkbox" name="mailing" value="1" defaultChecked={filters.mailing} className="h-4 w-4 accent-black" />
            Enkel mailbaar
          </label>
          <button
            type="submit"
            className="rounded-2xl border border-black/15 bg-raised px-5 py-3 text-sm font-semibold text-black/80 transition hover:bg-hover2"
          >
            Zoeken
          </button>
          {isFiltered ? (
            <Link
              href={"/customers" as Route}
              className="rounded-2xl px-3 py-3 text-sm font-semibold text-black/60 hover:text-black"
            >
              Wissen
            </Link>
          ) : null}
        </form>

        {customers.length === 0 ? (
          <p className="py-8 text-center text-sm text-black/55">
            {isFiltered
              ? "Geen klanten gevonden voor deze zoekopdracht."
              : "Het klantenbestand is nog leeg. Voeg een klant toe of maak een lead aan."}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[60rem] border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
                    <th className="px-3 pb-1">Naam</th>
                    <th className="px-3 pb-1">Contact</th>
                    <th className="px-3 pb-1">Gemeente</th>
                    <th className="px-3 pb-1">Wagen of interesse</th>
                    <th className="px-3 pb-1">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:hidden">
              {customers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

type CustomerWithRelations = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

// Recentste wagen (gekoppelde stockwagen, anders vrije interesse of storagewagen).
function getVehicleLabel(customer: CustomerWithRelations): string {
  for (const lead of customer.leads) {
    if (lead.primaryVehicle) return `${lead.primaryVehicle.brand} ${lead.primaryVehicle.model}`;
    const interest = [lead.interestedBrand, lead.interestedModel].filter(Boolean).join(" ");
    if (interest) return interest;
  }
  return customer.storageContracts.find((contract) => contract.vehicleLabel)?.vehicleLabel ?? "";
}

function Flags({ customer }: { customer: CustomerWithRelations }) {
  const flags = getCustomerFlags(customer);
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone="dark">{getCustomerTypeLabel(customer.type)}</Badge>
      {flags.isBuyer ? <Badge tone="good">Koper</Badge> : null}
      {flags.hasOpenLead ? <Badge tone="warn">Lopende lead</Badge> : null}
      {flags.hasActiveStorage ? <Badge tone="neutral">Storage</Badge> : null}
      {customer.mailingOptOut ? <Badge tone="bad">Uitgeschreven</Badge> : null}
    </div>
  );
}

function CustomerRow({ customer }: { customer: CustomerWithRelations }) {
  const cell = "bg-white px-3 py-3 align-top first:rounded-l-2xl last:rounded-r-2xl";
  const name = getCustomerName(customer);

  return (
    <tr>
      <td className={cell}>
        <Link href={`/customers/${customer.id}` as Route} className="font-bold text-black transition hover:text-black/65">
          {name}
        </Link>
        {customer.companyName && customer.companyName !== name ? (
          <p className="mt-1 text-xs text-black/50">{customer.companyName}</p>
        ) : null}
      </td>
      <td className={cell}>
        <p className="break-all text-black/80">{customer.email || "—"}</p>
        <p className="mt-1 text-xs text-black/50">{customer.phone || ""}</p>
      </td>
      <td className={`${cell} text-black/80`}>{customer.city || "—"}</td>
      <td className={`${cell} text-black/80`}>{getVehicleLabel(customer) || "—"}</td>
      <td className={cell}>
        <Flags customer={customer} />
      </td>
    </tr>
  );
}

// Telefoon en tablet: elke klant als kaartje in plaats van een brede tabel.
function CustomerCard({ customer }: { customer: CustomerWithRelations }) {
  const vehicle = getVehicleLabel(customer);

  return (
    <Link href={`/customers/${customer.id}` as Route} className="block rounded-2xl border border-black/10 bg-white p-4 transition active:bg-hover3">
      <p className="font-bold text-black">{getCustomerName(customer)}</p>
      <p className="mt-0.5 break-all text-xs text-black/50">
        {[customer.phone, customer.email, customer.city].filter(Boolean).join(" · ")}
      </p>
      {vehicle ? <p className="mt-2 text-sm font-semibold text-black/75">{vehicle}</p> : null}
      <div className="mt-3">
        <Flags customer={customer} />
      </div>
    </Link>
  );
}

function TabLink({ filters, type, label }: { filters: CustomerFilters; type: string; label: string }) {
  const active = filters.type === type;
  return (
    <Link
      href={`/customers${customerFiltersToSearch(filters, { type })}` as Route}
      className={
        active
          ? "rounded-2xl border border-black bg-black px-4 py-2 text-sm font-semibold text-white"
          : "rounded-2xl border border-black/15 bg-raised px-4 py-2 text-sm font-semibold text-black/80 transition hover:bg-hover2 hover:text-black"
      }
    >
      {label}
    </Link>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-card p-4 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">{label}</p>
      <p className="mt-3 text-2xl font-bold text-black sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-black/55">{note}</p>
    </div>
  );
}
