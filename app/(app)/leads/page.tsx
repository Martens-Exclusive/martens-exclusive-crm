import Link from "next/link";

import {
  leadPriorities,
  leadPriorityLabels,
  leadStatuses,
  leadStatusLabels,
  type LeadPriority,
  type LeadStatus
} from "@/lib/lead-status";
import { prisma } from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  dateStyle: "medium",
  timeStyle: "short"
});

export default async function LeadsPage({
  searchParams
}: {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    priority?: string;
  }>;
}) {
  const params = await searchParams;

  const query = params?.q?.trim() || "";
  const status = params?.status || "";
  const priority = params?.priority || "";

  const now = new Date();

  const where = {
    ...(query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" as const } },
            { lastName: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {})
  };

  const [leads, totalLeads, newLeads, overdueLeads, wonLeads] =
    await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          source: true,
          assignedUser: true,
          primaryVehicle: true
        },
        orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
        take: 75
      }),

      prisma.lead.count(),

      prisma.lead.count({
        where: {
          status: "NEW"
        }
      }),

      prisma.lead.count({
        where: {
          nextFollowUpAt: {
            lt: now
          },
          status: {
            notIn: ["WON", "LOST"]
          }
        }
      }),

      prisma.lead.count({
        where: {
          status: "WON"
        }
      })
    ]);

  return (
    <main className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
            Leads
          </p>

          <h1 className="mt-4 text-3xl font-bold text-black">
            Lead overzicht
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">
            Beheer nieuwe aanvragen, opvolgingen, verkopers en geïnteresseerde
            wagens vanuit één overzicht.
          </p>
        </div>

        <Link
          href="/leads/new"
          className="inline-flex items-center justify-center rounded-2xl border border-black/15 bg-[#fafafa] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ececec]"
        >
          Nieuwe lead
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Totaal leads" value={totalLeads} />
        <StatCard label="Nieuwe leads" value={newLeads} />
        <StatCard label="Te late opvolging" value={overdueLeads} />
        <StatCard label="Gewonnen" value={wonLeads} />
      </section>

      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <form className="grid gap-4 md:grid-cols-[1fr_0.35fr_0.35fr_auto]">
          <input
            name="q"
            defaultValue={query}
            placeholder="Zoek op naam, telefoon of e-mail..."
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-black/30"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-black/30"
          >
            <option value="">Alle statussen</option>
            {leadStatuses.map((value) => (
              <option key={value} value={value}>
                {leadStatusLabels[value]}
              </option>
            ))}
          </select>

          <select
            name="priority"
            defaultValue={priority}
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-black/30"
          >
            <option value="">Alle prioriteiten</option>
            {leadPriorities.map((value) => (
              <option key={value} value={value}>
                {leadPriorityLabels[value]}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-2xl border border-black/15 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
          >
            Filter
          </button>
        </form>

        {(query || status || priority) ? (
          <Link
            href="/leads"
            className="mt-4 inline-flex text-sm font-semibold text-black/60 hover:text-black"
          >
            Filters wissen
          </Link>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#f5f5f5] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-black/10 bg-[#ececec] text-left text-xs uppercase tracking-[0.2em] text-black/45">
                <th className="px-6 py-4">Naam</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Wagen</th>
                <th className="px-6 py-4">Verkoper</th>
                <th className="px-6 py-4">Bron</th>
                <th className="px-6 py-4">Opvolging</th>
                <th className="px-6 py-4">Prioriteit</th>
              </tr>
            </thead>

            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-black/55"
                  >
                    Geen leads gevonden.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isOverdue =
                    lead.nextFollowUpAt &&
                    lead.nextFollowUpAt < now &&
                    !["WON", "LOST"].includes(lead.status);

                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-black/10 text-sm text-black transition hover:bg-[#ececec]"
                    >
                      <td className="px-6 py-5">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-semibold text-black hover:underline"
                        >
                          {lead.firstName} {lead.lastName}
                        </Link>

                        <p className="mt-1 text-xs text-black/50">
                          {lead.phone || lead.email || "Geen contactgegevens"}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <Badge>
                          {getLeadStatusLabel(lead.status)}
                        </Badge>
                      </td>

                      <td className="px-6 py-5">
                        {lead.primaryVehicle
                          ? `${lead.primaryVehicle.brand} ${lead.primaryVehicle.model}`
                          : "Nog niet gekoppeld"}
                      </td>

                      <td className="px-6 py-5">
                        {lead.assignedUser
                          ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}`
                          : "Niet toegewezen"}
                      </td>

                      <td className="px-6 py-5">{lead.source.name}</td>

                      <td className="px-6 py-5">
                        <span
                          className={
                            isOverdue
                              ? "font-semibold text-red-700"
                              : "text-black"
                          }
                        >
                          {lead.nextFollowUpAt
                            ? dateFormatter.format(lead.nextFollowUpAt)
                            : "Nog niet ingepland"}
                        </span>

                        {isOverdue ? (
                          <p className="mt-1 text-xs font-semibold text-red-700">
                            Te laat
                          </p>
                        ) : null}
                      </td>

                      <td className="px-6 py-5">
                        <Badge>
                          {getLeadPriorityLabel(lead.priority)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function getLeadStatusLabel(status: string) {
  return leadStatusLabels[status as LeadStatus] ?? status;
}

function getLeadPriorityLabel(priority: string) {
  return leadPriorityLabels[priority as LeadPriority] ?? priority;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
      <p className="text-sm font-semibold text-black/55">{label}</p>
      <p className="mt-4 text-4xl font-bold text-black">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/70">
      {children}
    </span>
  );
}