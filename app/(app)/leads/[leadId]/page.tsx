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

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  dateStyle: "medium",
  timeStyle: "short"
});

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
        take: 8,
        include: {
          assignedUser: true
        }
      },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 25,
        include: {
          user: true
        }
      },
      appointments: {
        orderBy: { scheduledAt: "asc" },
        take: 8,
        include: {
          assignedUser: true
        }
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
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
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

  const openTasks = lead.tasks.filter((task) => task.status !== "COMPLETED");
  const plannedAppointments = lead.appointments.filter(
    (appointment) => appointment.status !== "CANCELLED"
  );

  return (
    <main className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="flex flex-col gap-6">
        <div className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
                Lead detail
              </p>

              <h1 className="mt-3 text-3xl font-bold text-black">
                {lead.firstName} {lead.lastName}
              </h1>

              <p className="mt-2 text-sm text-black/60">
                {lead.phone || "Geen telefoon"} • {lead.email || "Geen e-mail"}
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black">
              {getLeadStatusLabel(lead.status)}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Status" value={getLeadStatusLabel(lead.status)} />
            <StatCard
              label="Prioriteit"
              value={getLeadPriorityLabel(lead.priority)}
            />
            <StatCard label="Open taken" value={String(openTasks.length)} />
            <StatCard
              label="Afspraken"
              value={String(plannedAppointments.length)}
            />
          </div>

          <div className="mt-10">
            <SectionTitle title="Contactgegevens" />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoRow label="Telefoon" value={lead.phone || "-"} />
              <InfoRow label="E-mail" value={lead.email || "-"} />
            </div>
          </div>

          <div className="mt-10">
            <SectionTitle title="Adres" />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoRow label="Straat" value={lead.street || "-"} />
              <InfoRow label="Huisnummer" value={lead.houseNumber || "-"} />
              <InfoRow label="Postcode" value={lead.postalCode || "-"} />
              <InfoRow label="Gemeente" value={lead.city || "-"} />
              <InfoRow label="Land" value={lead.country || "-"} />
            </div>
          </div>

          <div className="mt-10">
            <SectionTitle title="Leadinformatie" />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoRow label="Bron" value={lead.source.name} />

              <InfoRow
                label="Verkoper"
                value={
                  lead.assignedUser
                    ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}`
                    : "Niet toegewezen"
                }
              />

              <InfoRow
                label="Volgende opvolging"
                value={
                  lead.nextFollowUpAt ? dateFormatter.format(lead.nextFollowUpAt) : "-"
                }
              />

              <InfoRow
                label="Laatste contact"
                value={
                  lead.lastContactedAt ? dateFormatter.format(lead.lastContactedAt) : "-"
                }
              />
            </div>
          </div>

          <div className="mt-10">
            <SectionTitle title="Interesse" />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoRow label="Financiering" value={lead.financeInterest ? "Ja" : "Nee"} />
              <InfoRow label="Overname" value={lead.tradeInInterest ? "Ja" : "Nee"} />

              <InfoRow
                label="Gekoppelde wagen"
                value={
                  lead.primaryVehicle
                    ? `${lead.primaryVehicle.brand} ${lead.primaryVehicle.model}`
                    : "Geen gekoppelde wagen"
                }
              />
            </div>
          </div>

          {lead.customerMessage ? (
            <TextBlock title="Bericht van klant" text={lead.customerMessage} />
          ) : null}

          {lead.internalNotes ? (
            <TextBlock title="Interne notities" text={lead.internalNotes} />
          ) : null}
        </div>

        <OverviewBlock title="Open taken">
          {lead.tasks.length === 0 ? (
            <EmptyState text="Nog geen taken voor deze lead." />
          ) : (
            lead.tasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-black/10 bg-[#efefef] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-black">{task.title}</p>
                    <p className="mt-1 text-sm text-black/60">
                      {task.assignedUser.firstName} {task.assignedUser.lastName}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black/60">
                    {task.status}
                  </span>
                </div>

                {task.notes ? (
                  <p className="mt-3 text-sm leading-6 text-black/70">{task.notes}</p>
                ) : null}

                <p className="mt-3 text-xs text-black/45">
                  Vervalt op {dateFormatter.format(task.dueAt)}
                </p>
              </div>
            ))
          )}
        </OverviewBlock>

        <OverviewBlock title="Afspraken">
          {lead.appointments.length === 0 ? (
            <EmptyState text="Nog geen afspraken ingepland." />
          ) : (
            lead.appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-black/10 bg-[#efefef] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-black">
                      {formatAppointmentType(appointment.type)}
                    </p>
                    <p className="mt-1 text-sm text-black/60">
                      {appointment.assignedUser.firstName}{" "}
                      {appointment.assignedUser.lastName}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black/60">
                    {appointment.status}
                  </span>
                </div>

                {appointment.notes ? (
                  <p className="mt-3 text-sm leading-6 text-black/70">
                    {appointment.notes}
                  </p>
                ) : null}

                <p className="mt-3 text-xs text-black/45">
                  {dateFormatter.format(appointment.scheduledAt)}
                </p>
              </div>
            ))
          )}
        </OverviewBlock>

        <OverviewBlock title="Activiteiten timeline">
          {lead.activities.length === 0 ? (
            <EmptyState text="Nog geen activiteiten geregistreerd." />
          ) : (
            lead.activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-2xl border border-black/10 bg-[#efefef] p-5"
              >
                <p className="font-semibold text-black">{activity.summary}</p>

                {activity.details ? (
                  <p className="mt-2 text-sm leading-6 text-black/70">
                    {activity.details}
                  </p>
                ) : null}

                <p className="mt-3 text-xs text-black/45">
                  {dateFormatter.format(activity.occurredAt)}
                  {activity.user
                    ? ` • ${activity.user.firstName} ${activity.user.lastName}`
                    : ""}
                </p>
              </div>
            ))
          )}
        </OverviewBlock>
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
            <div className="mt-6 rounded-2xl border border-black/10 bg-[#efefef] p-5">
              <p className="text-lg font-bold text-black">
                {lead.primaryVehicle.brand} {lead.primaryVehicle.model}
              </p>

              <p className="mt-1 text-sm text-black/65">
                {lead.primaryVehicle.variant || "Geen variant"} •{" "}
                {lead.primaryVehicle.stockNumber}
              </p>

              {lead.primaryVehicle.priceCents ? (
                <p className="mt-4 font-semibold text-black">
                  {formatCurrencyFromCents(
                    lead.primaryVehicle.priceCents,
                    lead.primaryVehicle.currency
                  )}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState text="Nog geen wagen gekoppeld." />
            </div>
          )}
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

function formatAppointmentType(type: string) {
  if (type === "SHOWROOM_VISIT") return "Showroombezoek";
  if (type === "TEST_DRIVE") return "Testrit";
  if (type === "PHONE_CALL") return "Telefonische afspraak";
  return type;
}

function toDateTimeLocalValue(value: Date | null) {
  if (!value) {
    return "";
  }

  const offset = value.getTimezoneOffset();
  const localDate = new Date(value.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-lg font-bold text-black">{title}</h2>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-black/8 pb-3">
      <p className="text-xs uppercase tracking-[0.2em] text-black/45">{label}</p>
      <p className="mt-1 text-sm font-medium text-black">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#efefef] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-black/45">{label}</p>
      <p className="mt-2 text-lg font-bold text-black">{value}</p>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-10">
      <SectionTitle title={title} />

      <div className="mt-4 rounded-2xl border border-black/10 bg-[#efefef] p-5">
        <p className="text-sm leading-7 text-black/75">{text}</p>
      </div>
    </div>
  );
}

function OverviewBlock({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <h2 className="text-xl font-bold text-black">{title}</h2>
      <div className="mt-6 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/12 bg-[#ececec] p-4 text-sm text-black/55">
      {text}
    </div>
  );
}