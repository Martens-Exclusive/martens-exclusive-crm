import Link from "next/link";

import {
  leadStatuses,
  leadStatusLabels,
  leadPriorityLabels,
  type LeadPriority,
  type LeadStatus
} from "@/lib/lead-status";
import { prisma } from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  dateStyle: "medium",
  timeStyle: "short"
});

export default async function LeadPipelinePage() {
  const leads = await prisma.lead.findMany({
    where: {
      status: {
        notIn: ["WON", "LOST"]
      }
    },
    include: {
      source: true,
      assignedUser: true,
      primaryVehicle: true
    },
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }]
  });

  const leadsByStatus = new Map<string, typeof leads>();

  for (const status of leadStatuses) {
    leadsByStatus.set(
      status,
      leads.filter((lead) => lead.status === status)
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
            Kanban pipeline
          </p>

          <h1 className="mt-4 text-3xl font-bold text-black">
            Leads per verkoopfase
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">
            Visueel overzicht van alle open leads per fase. Gewonnen en verloren
            leads blijven uit deze pipeline.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/leads"
            className="inline-flex items-center justify-center rounded-2xl border border-black/15 bg-[#fafafa] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ececec]"
          >
            Lijstweergave
          </Link>

          <Link
            href="/leads/new"
            className="inline-flex items-center justify-center rounded-2xl border border-black/15 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
          >
            Nieuwe lead
          </Link>
        </div>
      </section>

      <section className="overflow-x-auto pb-4">
        <div className="grid min-w-[1400px] grid-cols-6 gap-4">
          {leadStatuses
            .filter((status) => status !== "WON" && status !== "LOST")
            .map((status) => {
              const columnLeads = leadsByStatus.get(status) || [];

              return (
                <div
                  key={status}
                  className="rounded-[24px] border border-black/10 bg-[#f5f5f5] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.06)]"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <StatusBadge status={status} />

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black/60">
                      {columnLeads.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {columnLeads.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-black/12 bg-[#ececec] p-4 text-sm text-black/50">
                        Geen leads in deze fase.
                      </div>
                    ) : (
                      columnLeads.map((lead) => {
                        const isOverdue =
                          lead.nextFollowUpAt &&
                          lead.nextFollowUpAt < new Date();

                        return (
                          <Link
                            key={lead.id}
                            href={`/leads/${lead.id}`}
                            className="rounded-2xl border border-black/10 bg-white p-4 transition hover:bg-[#ececec]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-black">
                                  {lead.firstName} {lead.lastName}
                                </p>

                                <p className="mt-1 text-xs text-black/50">
                                  {lead.phone ||
                                    lead.email ||
                                    "Geen contactgegevens"}
                                </p>
                              </div>

                              <PriorityBadge priority={lead.priority} />
                            </div>

                            <div className="mt-4 flex flex-col gap-2 text-xs text-black/60">
                              <p>
                                Verkoper:{" "}
                                <span className="font-semibold text-black">
                                  {lead.assignedUser
                                    ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}`
                                    : "Niet toegewezen"}
                                </span>
                              </p>

                              <p>
                                Bron:{" "}
                                <span className="font-semibold text-black">
                                  {lead.source.name}
                                </span>
                              </p>

                              <p>
                                Wagen:{" "}
                                <span className="font-semibold text-black">
                                  {lead.primaryVehicle
                                    ? `${lead.primaryVehicle.brand} ${lead.primaryVehicle.model}`
                                    : "Niet gekoppeld"}
                                </span>
                              </p>

                              <p
                                className={
                                  isOverdue
                                    ? "font-semibold text-red-700"
                                    : "text-black/60"
                                }
                              >
                                Opvolging:{" "}
                                {lead.nextFollowUpAt
                                  ? dateFormatter.format(lead.nextFollowUpAt)
                                  : "Niet ingepland"}
                              </p>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
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
  if (status === "NEW") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "CONTACT_ATTEMPTED") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "CONTACTED") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (status === "QUALIFIED") return "border-purple-200 bg-purple-50 text-purple-700";
  if (status === "APPOINTMENT_SCHEDULED") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (status === "SHOWROOM_VISITED") return "border-teal-200 bg-teal-50 text-teal-700";
  if (status === "TEST_DRIVE_DONE") return "border-lime-200 bg-lime-50 text-lime-700";
  if (status === "OFFER_SENT") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "NEGOTIATION") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "NURTURE") return "border-zinc-200 bg-zinc-50 text-zinc-700";

  return "border-black/10 bg-white text-black/70";
}

function getPriorityClassName(priority: string) {
  if (priority === "HOT") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "HIGH") return "border-orange-200 bg-orange-50 text-orange-700";
  if (priority === "LOW") return "border-black/10 bg-white text-black/50";

  return "border-black/10 bg-white text-black/70";
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
      className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getPriorityClassName(
        priority
      )}`}
    >
      {getLeadPriorityLabel(priority)}
    </span>
  );
}