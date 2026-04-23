import { notFound } from "next/navigation";

import {
  leadPriorityLabels,
  leadStatuses,
  leadStatusLabels,
  type LeadPriority,
  type LeadStatus
} from "@/lib/lead-status";
import { formatCurrencyFromCents } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { AssignVehicleForm } from "./assign-vehicle-form";
import { CreateActivityForm } from "./create-activity-form";
import { CreateAppointmentForm } from "./create-appointment-form";
import { CreateTaskForm } from "./create-task-form";
import { DeleteLeadButton } from "./delete-lead-button";
import { EditLeadForm } from "./editLeadForm";

export default async function LeadDetailPage({
  params
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      source: true,
      assignedUser: true,
      primaryVehicle: true,
      lostReason: true,
      tasks: {
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        take: 5
      },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 20
      },
      appointments: {
        orderBy: { scheduledAt: "asc" },
        take: 5
      }
    }
  });

  if (!lead) {
    notFound();
  }

  const statuses = leadStatuses.map((value) => ({
    value,
    label: leadStatusLabels[value]
  }));

  const [users, vehicles] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true }
    }),
    prisma.vehicle.findMany({
      where: {
        status: {
          not: "SOLD"
        }
      },
      orderBy: [{ brand: "asc" }, { model: "asc" }, { stockNumber: "asc" }],
      select: {
        id: true,
        brand: true,
        model: true,
        variant: true,
        stockNumber: true
      }
    })
  ]);

  return (
    <main className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="flex flex-col gap-6">
        <div className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
            Lead detail
          </p>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-black">
                {lead.firstName} {lead.lastName}
              </h1>
              <p className="mt-2 text-sm text-black/65">
                {lead.phone || "Geen telefoon"} • {lead.email || "Geen e-mail"}
              </p>
            </div>

            <div className="rounded-2xl border border-black/12 bg-[#fafafa] px-4 py-2 text-sm font-semibold text-black">
              {getLeadStatusLabel(lead.status)}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <InfoCard label="Bron" value={lead.source.name} />
            <InfoCard
              label="Verkoper"
              value={
                lead.assignedUser
                  ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}`
                  : "Nog niet toegewezen"
              }
            />
            <InfoCard label="Prioriteit" value={getLeadPriorityLabel(lead.priority)} />
            <InfoCard
              label="Volgende opvolging"
              value={
                lead.nextFollowUpAt
                  ? new Intl.DateTimeFormat("nl-BE", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(lead.nextFollowUpAt)
                  : "Nog niet ingepland"
              }
            />
            <InfoCard
              label="Laatste contact"
              value={
                lead.lastContactedAt
                  ? new Intl.DateTimeFormat("nl-BE", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(lead.lastContactedAt)
                  : "Nog geen contact geregistreerd"
              }
            />
            <InfoCard
              label="Financiering"
              value={lead.financeInterest ? "Ja" : "Nee"}
            />
            <InfoCard label="Overname" value={lead.tradeInInterest ? "Ja" : "Nee"} />
            <InfoCard
              label="Gekoppelde wagen"
              value={
                lead.primaryVehicle
                  ? `${lead.primaryVehicle.brand} ${lead.primaryVehicle.model}`
                  : "Nog geen wagen gekoppeld"
              }
            />
          </div>

          {lead.customerMessage ? (
            <div className="mt-8 rounded-[24px] border border-black/10 bg-[#efefef] p-5">
              <p className="text-sm font-semibold text-black">Bericht van klant</p>
              <p className="mt-2 text-sm leading-6 text-black/70">
                {lead.customerMessage}
              </p>
            </div>
          ) : null}

          {lead.internalNotes ? (
            <div className="mt-4 rounded-[24px] border border-black/10 bg-[#efefef] p-5">
              <p className="text-sm font-semibold text-black">Interne notities</p>
              <p className="mt-2 text-sm leading-6 text-black/70">
                {lead.internalNotes}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-bold text-black">Activiteiten</h2>

          <div className="mt-6 flex flex-col gap-4">
            {lead.activities.length === 0 ? (
              <EmptyState text="Nog geen activiteiten geregistreerd." />
            ) : (
              lead.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-[22px] border border-black/10 bg-[#efefef] p-4"
                >
                  <p className="text-sm font-semibold text-black">{activity.summary}</p>

                  {activity.details ? (
                    <p className="mt-2 text-sm leading-6 text-black/70">
                      {activity.details}
                    </p>
                  ) : null}

                  <p className="mt-2 text-xs text-black/50">
                    {new Intl.DateTimeFormat("nl-BE", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(activity.occurredAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <EditLeadForm
          leadId={lead.id}
          currentStatus={lead.status}
          currentNextFollowUpAt={toDateTimeLocalValue(lead.nextFollowUpAt)}
          currentInternalNotes={lead.internalNotes || ""}
          statuses={statuses}
        />

        <CreateActivityForm leadId={lead.id} />

        <AssignVehicleForm
          leadId={lead.id}
          currentVehicleId={lead.primaryVehicleId}
          vehicles={vehicles}
        />

        {lead.status === "LOST" ? <DeleteLeadButton leadId={lead.id} /> : null}

        <CreateAppointmentForm leadId={lead.id} />

        <CreateTaskForm
          leadId={lead.id}
          users={users}
          defaultAssignedUserId={lead.assignedUserId || users[0]?.id || ""}
        />

        <div className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-bold text-black">Wagen</h2>

          {lead.primaryVehicle ? (
            <div className="mt-6 rounded-[24px] border border-black/10 bg-[#efefef] p-5">
              <p className="text-lg font-bold text-black">
                {lead.primaryVehicle.brand} {lead.primaryVehicle.model}
              </p>
              <p className="mt-1 text-sm text-black/65">
                {lead.primaryVehicle.variant || "Variant niet ingevuld"} •{" "}
                {lead.primaryVehicle.stockNumber}
              </p>

              {lead.primaryVehicle.priceCents ? (
                <p className="mt-4 text-sm font-semibold text-black">
                  {formatCurrencyFromCents(
                    lead.primaryVehicle.priceCents,
                    lead.primaryVehicle.currency
                  )}
                </p>
              ) : null}
            </div>
          ) : (
            <EmptyState text="Nog geen wagen gekoppeld." />
          )}
        </div>

        <div className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-bold text-black">Open taken</h2>

          <div className="mt-6 flex flex-col gap-4">
            {lead.tasks.length === 0 ? (
              <EmptyState text="Nog geen taken toegevoegd." />
            ) : (
              lead.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-[22px] border border-black/10 bg-[#efefef] p-4"
                >
                  <p className="text-sm font-semibold text-black">{task.title}</p>
                  <p className="mt-2 text-xs text-black/50">
                    Vervaldatum:{" "}
                    {new Intl.DateTimeFormat("nl-BE", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(task.dueAt)}
                  </p>
                  <p className="mt-2 text-xs text-black/50">
                    Status: {getTaskStatusLabel(task.status)}
                  </p>

                  {task.notes ? (
                    <p className="mt-2 text-sm leading-6 text-black/70">
                      {task.notes}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-bold text-black">Afspraken</h2>

          <div className="mt-6 flex flex-col gap-4">
            {lead.appointments.length === 0 ? (
              <EmptyState text="Nog geen afspraken ingepland." />
            ) : (
              lead.appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-[22px] border border-black/10 bg-[#efefef] p-4"
                >
                  <p className="text-sm font-semibold text-black">
                    {getAppointmentTypeLabel(appointment.type)}
                  </p>
                  <p className="mt-2 text-xs text-black/50">
                    {new Intl.DateTimeFormat("nl-BE", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(appointment.scheduledAt)}
                  </p>

                  {appointment.notes ? (
                    <p className="mt-2 text-sm leading-6 text-black/70">
                      {appointment.notes}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
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

function getAppointmentTypeLabel(type: string) {
  if (type === "SHOWROOM_VISIT") {
    return "Showroombezoek";
  }

  if (type === "TEST_DRIVE") {
    return "Testrit";
  }

  if (type === "PHONE_CALL") {
    return "Telefonische afspraak";
  }

  return type;
}

function getTaskStatusLabel(status: string) {
  if (status === "OPEN") {
    return "Open";
  }

  if (status === "COMPLETED") {
    return "Voltooid";
  }

  if (status === "CANCELLED") {
    return "Geannuleerd";
  }

  return status;
}

function toDateTimeLocalValue(value: Date | null) {
  if (!value) {
    return "";
  }

  const offset = value.getTimezoneOffset();
  const localDate = new Date(value.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-[#efefef] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-black/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-black">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-black/12 bg-[#ececec] p-4 text-sm text-black/55">
      {text}
    </div>
  );
}