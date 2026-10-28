import Link from "next/link";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";
import {
  getBatteryStatus,
  getInvoiceAmountCents,
  getInvoiceStatus,
  getStorageAttention,
  getTireStatus,
  hasChecks
} from "@/lib/storage";
import { formatCurrencyFromCents } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("nl-BE");

// Een eigen stockwagen die langer dan dit aantal dagen niet verkocht is, komt
// in het "Vandaag"-overzicht te staan (vastgezet kapitaal).
const STALE_STOCK_DAYS = 60;

// Offertes die binnen dit aantal dagen verlopen (of recent verlopen zijn) worden getoond.
const QUOTE_EXPIRES_SOON_DAYS = 3;
const QUOTE_EXPIRED_RECENTLY_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

// Zoveel items tonen we per blok; de rest staat achter de link of in de telling.
const TODAY_LIST_LIMIT = 5;

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Aantal kalenderdagen tussen vandaag en `date` (negatief = in het verleden). */
function daysFromToday(date: Date, today: Date) {
  return Math.round((startOfDay(date).getTime() - today.getTime()) / DAY_MS);
}

function pluralDays(count: number) {
  return count === 1 ? "1 dag" : `${count} dagen`;
}

export default async function DashboardPage() {
  const now = new Date();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const today = startOfToday;

  const [
    newLeads,
    overdueLeads,
    openTasks,
    overdueTasks,
    appointmentsToday,
    platforms,
    tasksDue,
    followUpsDue,
    todaysAppointments,
    expiringQuotes,
    staleVehicles,
    storageContracts
  ] = await Promise.all([
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({
      where: {
        nextFollowUpAt: { lt: now },
        status: {
          notIn: ["WON", "LOST"]
        }
      }
    }),
    prisma.task.count({
      where: {
        status: "OPEN",
        dueAt: { gte: now }
      }
    }),
    prisma.task.count({
      where: {
        status: "OPEN",
        dueAt: { lt: now }
      }
    }),
    prisma.appointment.count({
      where: {
        scheduledAt: {
          gte: startOfToday,
          lt: endOfToday
        }
      }
    }),
    prisma.platform.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }),
    // Vandaag: open taken die vandaag of al eerder verwacht werden.
    prisma.task.findMany({
      where: {
        status: "OPEN",
        dueAt: { lte: endOfToday }
      },
      orderBy: { dueAt: "asc" },
      take: 50,
      select: {
        id: true,
        title: true,
        dueAt: true,
        lead: { select: { id: true, firstName: true, lastName: true } }
      }
    }),
    // Vandaag: opvolgingen die vandaag of al eerder gepland stonden.
    prisma.lead.findMany({
      where: {
        nextFollowUpAt: { lte: endOfToday },
        status: { notIn: ["WON", "LOST"] }
      },
      orderBy: { nextFollowUpAt: "asc" },
      take: 50,
      select: { id: true, firstName: true, lastName: true, status: true, nextFollowUpAt: true }
    }),
    // Vandaag: geplande afspraken (geannuleerde en voltooide niet).
    prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { gte: startOfToday, lte: endOfToday }
      },
      orderBy: { scheduledAt: "asc" },
      take: 50,
      select: {
        id: true,
        type: true,
        scheduledAt: true,
        lead: { select: { id: true, firstName: true, lastName: true } }
      }
    }),
    // Offertes die binnenkort verlopen of net verlopen zijn, voor leads die nog lopen.
    prisma.quote.findMany({
      where: {
        type: "OFFERTE",
        validUntil: {
          gte: new Date(startOfToday.getTime() - QUOTE_EXPIRED_RECENTLY_DAYS * DAY_MS),
          lte: new Date(endOfToday.getTime() + QUOTE_EXPIRES_SOON_DAYS * DAY_MS)
        },
        lead: { status: { notIn: ["WON", "LOST"] } }
      },
      orderBy: { validUntil: "asc" },
      take: 50,
      select: {
        id: true,
        leadId: true,
        vehicleTitle: true,
        validUntil: true,
        lead: { select: { firstName: true, lastName: true } }
      }
    }),
    // Eigen stockwagens die al lang niet verkocht zijn.
    prisma.vehicle.findMany({
      where: {
        inventoryType: "STOCK",
        status: { not: "SOLD" },
        purchaseDate: { lt: new Date(startOfToday.getTime() - STALE_STOCK_DAYS * DAY_MS) }
      },
      orderBy: { purchaseDate: "asc" },
      take: 50,
      select: { id: true, brand: true, model: true, variant: true, purchaseDate: true }
    }),
    // Car Storage: actieve contracten, voor facturen en checks.
    prisma.storageContract.findMany({ where: { status: "ACTIVE" } })
  ]);

  const storage = getStorageAttention(storageContracts);
  const storageInvoices = [...storage.invoicesDue, ...storage.invoicesSoon];
  const storageChecks = storage.carsWithCheckDue;

  const cards: Array<{
    label: string;
    value: number;
    href: Route;
  }> = [
    { label: "Nieuwe leads", value: newLeads, href: "/leads" },
    { label: "Te late opvolging", value: overdueLeads, href: "/leads" },
    { label: "Open taken", value: openTasks, href: "/tasks?status=open" },
    { label: "Te late taken", value: overdueTasks, href: "/tasks?status=overdue" },
    { label: "Afspraken vandaag", value: appointmentsToday, href: "/appointments" }
  ];

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
          Dashboard
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-black">
          Dagelijks overzicht van leads en opvolging.
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">
          Dit dashboard houdt de focus op wat vandaag telt: nieuwe leads,
          open taken, te late opvolging en afspraken.
        </p>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold text-black">Vandaag</h2>

          <p className="text-sm text-black/55">
            {new Intl.DateTimeFormat("nl-BE", { dateStyle: "full" }).format(now)}
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <TodayCard
            title="Taken"
            count={tasksDue.length}
            href="/tasks"
            emptyText="Geen open taken voor vandaag of achterstallig."
          >
            {tasksDue.slice(0, TODAY_LIST_LIMIT).map((task) => {
              const diff = daysFromToday(task.dueAt, today);

              return (
                <Link
                  key={task.id}
                  href={`/leads/${task.lead.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-black/5"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-black">{task.title}</span>
                    <span className="text-black/55">
                      {" "}
                      · {task.lead.firstName} {task.lead.lastName}
                    </span>
                  </span>

                  <span className={`shrink-0 text-xs font-semibold ${diff < 0 ? "text-red-600" : "text-black/55"}`}>
                    {diff < 0 ? `${pluralDays(-diff)} te laat` : "Vandaag"}
                  </span>
                </Link>
              );
            })}
            <MoreRow total={tasksDue.length} />
          </TodayCard>

          <TodayCard
            title="Opvolging"
            count={followUpsDue.length}
            href="/leads"
            emptyText="Geen opvolging achterstallig of gepland voor vandaag."
          >
            {followUpsDue.slice(0, TODAY_LIST_LIMIT).map((lead) => {
              const diff = lead.nextFollowUpAt ? daysFromToday(lead.nextFollowUpAt, today) : 0;

              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-black/5"
                >
                  <span className="min-w-0 truncate font-semibold text-black">
                    {lead.firstName} {lead.lastName}
                  </span>

                  <span className={`shrink-0 text-xs font-semibold ${diff < 0 ? "text-red-600" : "text-black/55"}`}>
                    {diff < 0 ? `${pluralDays(-diff)} te laat` : "Vandaag"}
                  </span>
                </Link>
              );
            })}
            <MoreRow total={followUpsDue.length} />
          </TodayCard>

          <TodayCard
            title="Afspraken"
            count={todaysAppointments.length}
            href="/appointments"
            emptyText="Geen afspraken vandaag."
          >
            {todaysAppointments.slice(0, TODAY_LIST_LIMIT).map((appointment) => (
              <Link
                key={appointment.id}
                href={`/leads/${appointment.lead.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-black/5"
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-black">
                    {appointment.lead.firstName} {appointment.lead.lastName}
                  </span>
                  <span className="text-black/55"> · {appointmentTypeLabel(appointment.type)}</span>
                </span>

                <span className="shrink-0 text-xs font-semibold text-black/70">
                  {new Intl.DateTimeFormat("nl-BE", { timeStyle: "short" }).format(appointment.scheduledAt)}
                </span>
              </Link>
            ))}
            <MoreRow total={todaysAppointments.length} />
          </TodayCard>

          <TodayCard
            title="Offertes die verlopen"
            count={expiringQuotes.length}
            emptyText="Geen offertes die binnenkort verlopen."
          >
            {expiringQuotes.slice(0, TODAY_LIST_LIMIT).map((quote) => {
              const diff = quote.validUntil ? daysFromToday(quote.validUntil, today) : 0;

              return (
                <Link
                  key={quote.id}
                  href={`/leads/${quote.leadId}/quotes/${quote.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-black/5"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-black">
                      {quote.lead.firstName} {quote.lead.lastName}
                    </span>
                    <span className="text-black/55"> · {quote.vehicleTitle || "Offerte"}</span>
                  </span>

                  <span className={`shrink-0 text-xs font-semibold ${diff < 0 ? "text-red-600" : "text-black/55"}`}>
                    {diff < 0
                      ? `verlopen sinds ${pluralDays(-diff)}`
                      : diff === 0
                        ? "verloopt vandaag"
                        : `verloopt over ${pluralDays(diff)}`}
                  </span>
                </Link>
              );
            })}
            <MoreRow total={expiringQuotes.length} />
          </TodayCard>

          <TodayCard
            title={`Wagens langer dan ${STALE_STOCK_DAYS} dagen in stock`}
            count={staleVehicles.length}
            href="/stock"
            emptyText="Geen wagens die te lang stilstaan."
          >
            {staleVehicles.slice(0, TODAY_LIST_LIMIT).map((vehicle) => {
              const days = vehicle.purchaseDate ? -daysFromToday(vehicle.purchaseDate, today) : 0;

              return (
                <Link
                  key={vehicle.id}
                  href={`/stock/${vehicle.id}/edit`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-black/5"
                >
                  <span className="min-w-0 truncate font-semibold text-black">
                    {[vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(" ")}
                  </span>

                  <span className="shrink-0 text-xs font-semibold text-red-600">
                    {pluralDays(days)} in stock
                  </span>
                </Link>
              );
            })}
            <MoreRow total={staleVehicles.length} />
          </TodayCard>

          <TodayCard
            title="Car Storage: te factureren"
            count={storageInvoices.length}
            href="/storage"
            emptyText="Geen facturen te maken of binnenkort."
          >
            {storageInvoices.slice(0, TODAY_LIST_LIMIT).map((contract) => {
              const status = getInvoiceStatus(contract.nextInvoiceAt);

              return (
                <Link
                  key={contract.id}
                  href={`/storage/${contract.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-black/5"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-black">
                      {contract.firstName} {contract.lastName}
                    </span>
                    <span className="text-black/55">
                      {" "}
                      · {formatCurrencyFromCents(getInvoiceAmountCents(contract.monthlyPriceCents, contract.billingPeriod, contract.invoiceAmountCents))}
                    </span>
                  </span>

                  <span className={`shrink-0 text-xs font-semibold ${status.tone === "due" ? "text-red-600" : "text-black/55"}`}>
                    {status.label}
                  </span>
                </Link>
              );
            })}
            <MoreRow total={storageInvoices.length} />
          </TodayCard>

          <TodayCard
            title="Car Storage: checks nodig"
            count={storageChecks.length}
            href="/storage"
            emptyText="Alle aanwezige wagens zijn gecontroleerd."
          >
            {storageChecks.slice(0, TODAY_LIST_LIMIT).map((contract) => {
              const needs = [
                hasChecks(contract.plan) && getBatteryStatus(contract.batteryCheckedAt).tone !== "ok"
                  ? "batterij"
                  : "",
                hasChecks(contract.plan) && getTireStatus(contract.tiresCheckedAt).tone !== "ok" ? "banden" : ""
              ].filter(Boolean);

              return (
                <Link
                  key={contract.id}
                  href={`/storage/${contract.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-black/5"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-black">
                      {contract.firstName} {contract.lastName}
                    </span>
                    <span className="text-black/55"> · {contract.vehicleLabel || "wagen"}</span>
                  </span>

                  <span className="shrink-0 text-xs font-semibold text-red-600">{needs.join(" + ")}</span>
                </Link>
              );
            })}
            <MoreRow total={storageChecks.length} />
          </TodayCard>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-[24px] border border-black/10 bg-card p-4 shadow-[0_16px_40px_rgba(0,0,0,0.06)] transition hover:bg-hover sm:p-6"
          >
            <p className="text-sm font-semibold text-black/55">{card.label}</p>
            <p className="mt-3 text-3xl font-bold text-black sm:mt-4 sm:text-4xl">
              {numberFormatter.format(card.value)}
            </p>
          </Link>
        ))}
      </section>

      {platforms.length > 0 ? (
        <section className="rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-black">Platformen</h2>

            <Link
              href="/platforms"
              className="text-sm font-semibold text-black/55 hover:text-black"
            >
              Alles bekijken →
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((platform) => (
              <a
                key={platform.id}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-sm font-semibold text-black transition hover:border-black/25 hover:bg-hover"
              >
                {platform.name}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function appointmentTypeLabel(type: string) {
  if (type === "SHOWROOM_VISIT") return "Showroombezoek";
  if (type === "TEST_DRIVE") return "Testrit";
  if (type === "PHONE_CALL") return "Telefonische afspraak";
  return type;
}

function TodayCard({
  title,
  count,
  href,
  emptyText,
  children
}: {
  title: string;
  count: number;
  href?: Route;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-black">{title}</h3>

          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              count > 0 ? "bg-black text-white" : "bg-black/5 text-black/45"
            }`}
          >
            {count}
          </span>
        </div>

        {href ? (
          <Link href={href} className="shrink-0 whitespace-nowrap text-xs font-semibold text-black/55 hover:text-black">
            Bekijken →
          </Link>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col">
        {count === 0 ? <p className="px-3 py-2 text-sm text-black/45">{emptyText}</p> : children}
      </div>
    </div>
  );
}

function MoreRow({ total }: { total: number }) {
  if (total <= TODAY_LIST_LIMIT) return null;

  return (
    <p className="px-3 pt-2 text-xs text-black/45">
      + {total - TODAY_LIST_LIMIT} andere
    </p>
  );
}
