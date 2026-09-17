import Link from "next/link";

import { buildLeadWhere, describeLeadFilters } from "@/lib/lead-filters";
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
    assignedUserId?: string;
    openOnly?: string;
  }>;
}) {
  const params = await searchParams;

  const query = params?.q?.trim() || "";
  const status = params?.status || "";
  const priority = params?.priority || "";
  const assignedUserId = params?.assignedUserId || "";
  const openOnly = params?.openOnly === "1";

  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Verloren leads blijven standaard uit de lijst zodat die overzichtelijk
  // blijft. Kies je zelf expliciet een status (bv. via de funnel of het
  // filter), dan tonen we precies wat je koos — ook als dat "Verloren" is.
  const isShowingLost = status === "LOST";

  const filters = { q: query, status, priority, assignedUserId, openOnly };
  const where = buildLeadWhere(filters);

  const [
    leads,
    users,
    totalLeads,
    openLeads,
    overdueLeads,
    wonThisMonth,
    wonLeads,
    lostLeads,
    pipelineCounts,
    sourceCounts,
    sources
  ] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        source: true,
        assignedUser: true,
        primaryVehicle: true
      },
      orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
      take: 100
    }),

    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    }),

    prisma.lead.count(),

    prisma.lead.count({
      where: {
        status: {
          notIn: ["WON", "LOST"]
        }
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
        status: "WON",
        wonAt: {
          gte: startOfMonth
        }
      }
    }),

    prisma.lead.count({
      where: {
        status: "WON"
      }
    }),

    prisma.lead.count({
      where: {
        status: "LOST"
      }
    }),

    prisma.lead.groupBy({
      by: ["status"],
      _count: {
        status: true
      }
    }),

    prisma.lead.groupBy({
      by: ["sourceId"],
      _count: {
        sourceId: true
      },
      orderBy: {
        _count: {
          sourceId: "desc"
        }
      }
    }),

    prisma.leadSource.findMany({
      select: { id: true, name: true }
    })
  ]);

  const closedLeads = wonLeads + lostLeads;
  const conversionRate =
    closedLeads > 0 ? Math.round((wonLeads / closedLeads) * 100) : 0;
  const lostRate = closedLeads > 0 ? 100 - conversionRate : 0;

  const pipelineMap = new Map(
    pipelineCounts.map((item) => [item.status, item._count.status])
  );

  const sourceNameById = new Map(sources.map((source) => [source.id, source.name]));
  const sourceBreakdown = sourceCounts.map((item) => ({
    id: item.sourceId,
    name: sourceNameById.get(item.sourceId) ?? "Onbekend",
    count: item._count.sourceId
  }));
  const sourceTotal = sourceBreakdown.reduce((total, item) => total + item.count, 0);

  const assignedUserLabel = assignedUserId
    ? (() => {
        const user = users.find((candidate) => candidate.id === assignedUserId);
        return user ? `${user.firstName} ${user.lastName}` : undefined;
      })()
    : undefined;

  const overviewFilterDescription = describeLeadFilters(filters, assignedUserLabel);

  const overviewPdfParams = new URLSearchParams({ type: "overview" });
  if (query) overviewPdfParams.set("q", query);
  if (status) overviewPdfParams.set("status", status);
  if (priority) overviewPdfParams.set("priority", priority);
  if (assignedUserId) overviewPdfParams.set("assignedUserId", assignedUserId);
  if (openOnly) overviewPdfParams.set("openOnly", "1");
  if (overviewFilterDescription) {
    overviewPdfParams.set("label", overviewFilterDescription);
  }
  const overviewPdfHref = `/api/leads/pdf?${overviewPdfParams.toString()}`;

  return (
    <main className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
            Pipeline
          </p>

          <h1 className="mt-4 text-3xl font-bold text-black">
            Verkoopfunnel leads
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">
            Volg open leads, opvolgingen, conversie en gewonnen deals vanuit één
            verkoopoverzicht.
          </p>
        </div>

        <div className="flex items-center gap-3">
  <Link
    href="/leads/pipeline"
    className="inline-flex items-center justify-center rounded-2xl border border-black/15 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
  >
    Pipeline
  </Link>

  <Link
    href="/leads/new"
    className="inline-flex items-center justify-center rounded-2xl border border-black/15 bg-[#fafafa] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ececec]"
  >
    Nieuwe lead
  </Link>
</div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <StatCard label="Totaal leads" value={String(totalLeads)} />
        <StatCard label="Open leads" value={String(openLeads)} />
        <StatCard label="Te late opvolging" value={String(overdueLeads)} />
        <StatCard label="Gewonnen deze maand" value={String(wonThisMonth)} />
        <StatCard label="Conversie" value={`${conversionRate}%`} />
      </section>

      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-black">Funnel fases</h2>
          <p className="mt-1 text-sm text-black/60">
            Klik op een fase om het overzicht te filteren.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {leadStatuses.map((pipelineStatus) => (
            <Link
              key={pipelineStatus}
              href={`/leads?status=${pipelineStatus}`}
              className="rounded-2xl border border-black/10 bg-white p-4 transition hover:bg-[#ececec]"
            >
              <StatusBadge status={pipelineStatus} />

              <p className="mt-3 text-2xl font-bold text-black">
                {pipelineMap.get(pipelineStatus) || 0}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-black">
                Resultaat: gewonnen vs. verloren
              </h2>
              <p className="mt-1 text-sm text-black/60">
                Van alle leads waar een uitkomst op zit ({closedLeads}).
              </p>
            </div>

            <PdfButton href="/api/leads/pdf?type=result" />
          </div>

          {closedLeads === 0 ? (
            <p className="text-sm text-black/55">
              Nog geen gewonnen of verloren leads om te tonen.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <ResultBar
                label="Gewonnen"
                count={wonLeads}
                percentage={conversionRate}
                colorClassName="bg-green-600"
              />
              <ResultBar
                label="Verloren"
                count={lostLeads}
                percentage={lostRate}
                colorClassName="bg-red-600"
              />
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-black/10 pt-5">
            <MiniStat label="Gewonnen" value={String(wonLeads)} />
            <MiniStat label="Verloren" value={String(lostLeads)} />
            <MiniStat label="Conversie" value={`${conversionRate}%`} />
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-black">Leads per bron</h2>
              <p className="mt-1 text-sm text-black/60">
                Waar komen je leads vandaan (alle leads, ooit aangemaakt).
              </p>
            </div>

            <PdfButton href="/api/leads/pdf?type=source" />
          </div>

          {sourceBreakdown.length === 0 ? (
            <p className="text-sm text-black/55">Nog geen leads met een bron.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sourceBreakdown.map((source) => {
                const sharePercentage =
                  sourceTotal > 0 ? Math.round((source.count / sourceTotal) * 100) : 0;

                return (
                  <div key={source.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-black">{source.name}</span>
                      <span className="text-black/55">
                        {source.count} ({sharePercentage}%)
                      </span>
                    </div>

                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10">
                      <div
                        className="h-full rounded-full bg-black"
                        style={{ width: `${sharePercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <form className="grid gap-4 xl:grid-cols-[1fr_0.35fr_0.35fr_0.35fr_auto]">
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

          <select
            name="assignedUserId"
            defaultValue={assignedUserId}
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-black/30"
          >
            <option value="">Alle verkopers</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-2xl border border-black/15 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
          >
            Filter
          </button>

          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/70 xl:col-span-5">
            <input
              type="checkbox"
              name="openOnly"
              value="1"
              defaultChecked={openOnly}
              className="h-4 w-4"
            />
            Alleen open leads tonen
          </label>
        </form>

        {(query || status || priority || assignedUserId || openOnly) ? (
          <Link
            href="/leads"
            className="mt-4 inline-flex text-sm font-semibold text-black/60 hover:text-black"
          >
            Filters wissen
          </Link>
        ) : null}

        {!status && !openOnly ? (
          <p className="mt-4 text-sm text-black/55">
            Verloren leads worden hier niet standaard getoond, zodat het overzicht
            overzichtelijk blijft.{" "}
            <Link
              href="/leads?status=LOST"
              className="font-semibold text-black underline underline-offset-2 hover:text-black/70"
            >
              Verloren leads bekijken
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#f5f5f5] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-lg font-bold text-black">Overzicht leads</h2>
            <p className="mt-1 text-sm text-black/60">{overviewFilterDescription}</p>
          </div>

          <PdfButton href={overviewPdfHref} />
        </div>

        {isShowingLost ? (
          <div className="mt-4 border-y border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">
            Je bekijkt de <strong>verloren leads</strong>. Op de fiche van een verloren
            lead kan je die definitief verwijderen.
          </div>
        ) : (
          <div className="h-4" />
        )}

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

                  const interestText = [lead.interestedBrand, lead.interestedModel]
                    .filter(Boolean)
                    .join(" ");

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
                        <StatusBadge status={lead.status} />
                      </td>

                      <td className="px-6 py-5">
                        {lead.primaryVehicle ? (
                          `${lead.primaryVehicle.brand} ${lead.primaryVehicle.model}`
                        ) : interestText ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="italic text-black/70">{interestText}</span>
                            <span className="inline-flex rounded-full border border-black/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/45">
                              Interesse
                            </span>
                          </span>
                        ) : (
                          "Nog niet gekoppeld"
                        )}
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
                        <PriorityBadge priority={lead.priority} />
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

function getStatusClassName(status: string) {
  if (status === "NEW") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "CONTACTED") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (status === "NEGOTIATION") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "WON") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "LOST") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-black/10 bg-white text-black/70";
}

function getPriorityClassName(priority: string) {
  if (priority === "HIGH") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (priority === "LOW") {
    return "border-black/10 bg-white text-black/50";
  }

  return "border-black/10 bg-white text-black/70";
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
      <p className="text-sm font-semibold text-black/55">{label}</p>
      <p className="mt-4 text-4xl font-bold text-black">{value}</p>
    </div>
  );
}

function PdfButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex flex-none items-center justify-center rounded-2xl border border-black/15 bg-[#fafafa] px-4 py-2 text-xs font-semibold text-black/80 transition hover:bg-[#e7e7e7] hover:text-black"
    >
      PDF afdrukken
    </a>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-3 py-3 text-center">
      <p className="text-2xl font-bold text-black">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
        {label}
      </p>
    </div>
  );
}

function ResultBar({
  label,
  count,
  percentage,
  colorClassName
}: {
  label: string;
  count: number;
  percentage: number;
  colorClassName: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-black">{label}</span>
        <span className="text-black/55">
          {count} ({percentage}%)
        </span>
      </div>

      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/10">
        <div
          className={`h-full rounded-full ${colorClassName}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(
        status
      )}`}
    >
      {getLeadStatusLabel(status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClassName(
        priority
      )}`}
    >
      {getLeadPriorityLabel(priority)}
    </span>
  );
}