import Link from "next/link";
import type { Route } from "next";

import { LeadViewToggle } from "@/components/lead-view-toggle";
import {
  leadStatuses,
  leadStatusLabels,
  leadPriorityLabels,
  type LeadPriority,
  type LeadStatus
} from "@/lib/lead-status";
import { prisma } from "@/lib/prisma";
import { PipelineBoard, type BoardLead } from "./pipeline-board";

const followUpFormatter = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
});

const DAY_MS = 24 * 60 * 60 * 1000;

type PipelineFilter = "all" | "overdue" | "none" | "hot";

export default async function LeadPipelinePage({
  searchParams
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const activeFilter = getFilter(params?.filter);

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

  const now = new Date();

  const isOverdue = (lead: (typeof leads)[number]) =>
    lead.nextFollowUpAt !== null && lead.nextFollowUpAt < now;
  const isHot = (lead: (typeof leads)[number]) =>
    lead.priority === "HOT" || lead.priority === "HIGH";

  const overdueCount = leads.filter(isOverdue).length;
  const noFollowUpCount = leads.filter((lead) => lead.nextFollowUpAt === null).length;
  const hotCount = leads.filter(isHot).length;

  const visibleLeads = leads.filter((lead) => {
    if (activeFilter === "overdue") return isOverdue(lead);
    if (activeFilter === "none") return lead.nextFollowUpAt === null;
    if (activeFilter === "hot") return isHot(lead);
    return true;
  });

  const boardLeads: BoardLead[] = visibleLeads.map((lead) => ({
    id: lead.id,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    status: lead.status,
    vehicle: getVehicleLabel(lead),
    priority: lead.priority,
    priorityLabel: leadPriorityLabels[lead.priority as LeadPriority] ?? lead.priority,
    source: lead.source.name,
    seller: lead.assignedUser ? lead.assignedUser.firstName : null,
    followUpLabel: lead.nextFollowUpAt ? followUpFormatter.format(lead.nextFollowUpAt) : null,
    overdueDays: lead.nextFollowUpAt && lead.nextFollowUpAt < now
      ? Math.floor((now.getTime() - lead.nextFollowUpAt.getTime()) / DAY_MS)
      : null
  }));

  const columns = leadStatuses
    .filter((status) => status !== "WON" && status !== "LOST")
    .map((status) => ({
      status,
      label: leadStatusLabels[status as LeadStatus] ?? status,
      badgeClassName: getStatusClassName(status)
    }));

  return (
    <main className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-[28px] border border-black/10 bg-card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Pipeline</h1>
          <p className="mt-1 text-sm text-black/60">
            {leads.length} open {leads.length === 1 ? "lead" : "leads"}. Sleep een kaart naar een andere
            fase, of gebruik het menu op de kaart.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LeadViewToggle active="pipeline" />

          <Link
            href="/leads/new"
            className="inline-flex items-center justify-center rounded-2xl border border-black/15 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
          >
            Nieuwe lead
          </Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <FilterChip href="/leads/pipeline" label="Alle open leads" count={leads.length} active={activeFilter === "all"} />
        <FilterChip
          href={"/leads/pipeline?filter=overdue" as Route}
          label="Te late opvolging"
          count={overdueCount}
          active={activeFilter === "overdue"}
          alert={overdueCount > 0}
        />
        <FilterChip
          href={"/leads/pipeline?filter=none" as Route}
          label="Zonder opvolging"
          count={noFollowUpCount}
          active={activeFilter === "none"}
        />
        <FilterChip
          href={"/leads/pipeline?filter=hot" as Route}
          label="Warm / hoog"
          count={hotCount}
          active={activeFilter === "hot"}
        />
      </div>

      <PipelineBoard columns={columns} leads={boardLeads} />
    </main>
  );
}

function getFilter(value?: string): PipelineFilter {
  if (value === "overdue" || value === "none" || value === "hot") return value;
  return "all";
}

function getVehicleLabel(lead: {
  primaryVehicle: { brand: string; model: string } | null;
  interestedBrand: string | null;
  interestedModel: string | null;
}) {
  if (lead.primaryVehicle) {
    return `${lead.primaryVehicle.brand} ${lead.primaryVehicle.model}`;
  }

  const interest = [lead.interestedBrand, lead.interestedModel].filter(Boolean).join(" ");

  return interest || null;
}

function FilterChip({
  href,
  label,
  count,
  active,
  alert
}: {
  href: Route;
  label: string;
  count: number;
  active: boolean;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-black bg-black text-white"
          : "border-black/15 bg-raised text-black hover:bg-hover2"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
          active
            ? "bg-white/20 text-white"
            : alert
              ? "bg-red-100 text-red-700"
              : "bg-white text-black/55"
        }`}
      >
        {count}
      </span>
    </Link>
  );
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
