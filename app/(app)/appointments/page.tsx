import Link from "next/link";

import { getAppointmentVehicleLabel } from "@/lib/appointment-calendar";
import { getRequestOrigin } from "@/lib/request-origin";
import { prisma } from "@/lib/prisma";
import { AddToCalendar } from "./add-to-calendar";
import { AppointmentActions } from "./appointment-actions";

export default async function AppointmentsPage() {
  const origin = await getRequestOrigin();
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { not: "COMPLETED" }
    },
    include: {
      lead: { include: { primaryVehicle: true } },
      assignedUser: true,
      vehicle: true
    },
    orderBy: { scheduledAt: "asc" },
    take: 100
  });

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
          Afspraken
        </p>
        <h1 className="mt-4 text-3xl font-bold text-black">
          Alle geplande afspraken.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">
          Dit overzicht toont echte afspraken die handmatig aan een lead zijn gekoppeld.
          Voltooide afspraken verdwijnen automatisch uit dit overzicht.
        </p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#f5f5f5] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-black/10 bg-[#ececec] text-left text-xs uppercase tracking-[0.2em] text-black/45">
                <th className="px-6 py-4">Lead</th>
                <th className="px-6 py-4">Type afspraak</th>
                <th className="px-6 py-4">Datum en tijd</th>
                <th className="px-6 py-4">Verkoper</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Notities</th>
                <th className="px-6 py-4">Agenda</th>
                <th className="px-6 py-4">Acties</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm text-black/55"
                  >
                    Nog geen afspraken ingepland.
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-black/10 text-sm text-black transition hover:bg-[#ececec]"
                  >
                    <td className="px-6 py-5">
                      <Link
                        href={`/leads/${appointment.leadId}`}
                        className="font-semibold text-black"
                      >
                        {appointment.lead.firstName} {appointment.lead.lastName}
                      </Link>
                    </td>

                    <td className="px-6 py-5">
                      <p>{getAppointmentTypeLabel(appointment.type)}</p>
                      {getAppointmentVehicleLabel(appointment) ? (
                        <p className="mt-1 text-xs font-semibold text-black/60">
                          {getAppointmentVehicleLabel(appointment)}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-6 py-5">
                      {new Intl.DateTimeFormat("nl-BE", {
                        dateStyle: "medium",
                        timeStyle: "short"
                      }).format(appointment.scheduledAt)}
                    </td>

                    <td className="px-6 py-5">
                      {appointment.assignedUser.firstName}{" "}
                      {appointment.assignedUser.lastName}
                    </td>

                    <td className="px-6 py-5">
                      {getAppointmentStatusLabel(appointment.status)}
                    </td>

                    <td className="px-6 py-5 text-black/70">
                      {appointment.notes || "-"}
                    </td>

                    <td className="px-6 py-5">
                      <AddToCalendar appointment={appointment} origin={origin} />
                    </td>

                    <td className="px-6 py-5">
                      <AppointmentActions
                        appointmentId={appointment.id}
                        status={appointment.status}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 lg:hidden">
          {appointments.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-black/55 md:col-span-2">
              Nog geen afspraken ingepland.
            </p>
          ) : (
            appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-black/10 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/leads/${appointment.leadId}`}
                      className="font-semibold text-black"
                    >
                      {appointment.lead.firstName} {appointment.lead.lastName}
                    </Link>
                    <p className="mt-1 text-sm text-black/70">
                      {getAppointmentTypeLabel(appointment.type)}
                    </p>
                    {getAppointmentVehicleLabel(appointment) ? (
                      <p className="mt-0.5 text-xs font-semibold text-black/60">
                        {getAppointmentVehicleLabel(appointment)}
                      </p>
                    ) : null}
                  </div>

                  <span className="shrink-0 rounded-full bg-[#ececec] px-3 py-1 text-xs font-semibold text-black/70">
                    {getAppointmentStatusLabel(appointment.status)}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-black">
                  {new Intl.DateTimeFormat("nl-BE", {
                    dateStyle: "medium",
                    timeStyle: "short"
                  }).format(appointment.scheduledAt)}
                </p>
                <p className="mt-0.5 text-xs text-black/50">
                  {appointment.assignedUser.firstName} {appointment.assignedUser.lastName}
                </p>

                {appointment.notes ? (
                  <p className="mt-3 text-sm leading-6 text-black/70">{appointment.notes}</p>
                ) : null}

                <div className="mt-4 flex flex-col gap-3 border-t border-black/10 pt-4">
                  <AddToCalendar appointment={appointment} origin={origin} />
                  <AppointmentActions
                    appointmentId={appointment.id}
                    status={appointment.status}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function getAppointmentTypeLabel(type: string) {
  if (type === "SHOWROOM_VISIT") return "Showroombezoek";
  if (type === "TEST_DRIVE") return "Testrit";
  if (type === "PHONE_CALL") return "Telefonische afspraak";
  return type;
}

function getAppointmentStatusLabel(status: string) {
  if (status === "SCHEDULED") return "Ingepland";
  if (status === "COMPLETED") return "Voltooid";
  if (status === "CANCELLED") return "Geannuleerd";
  if (status === "NO_SHOW") return "Niet komen opdagen";
  return status;
}