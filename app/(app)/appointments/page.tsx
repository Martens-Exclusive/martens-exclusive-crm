import Link from "next/link";

import { prisma } from "@/lib/prisma";

export default async function AppointmentsPage() {
  const appointments = await prisma.appointment.findMany({
    include: {
      lead: true,
      assignedUser: true
    },
    orderBy: { scheduledAt: "asc" },
    take: 100
  });

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
          Afspraken
        </p>
        <h1 className="mt-4 text-3xl font-bold text-black">
          Alle geplande afspraken.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">
          Dit overzicht toont echte afspraken die handmatig aan een lead zijn gekoppeld.
        </p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#f5f5f5] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-black/10 bg-[#ececec] text-left text-xs uppercase tracking-[0.2em] text-black/45">
                <th className="px-6 py-4">Lead</th>
                <th className="px-6 py-4">Type afspraak</th>
                <th className="px-6 py-4">Datum en tijd</th>
                <th className="px-6 py-4">Verkoper</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Notities</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
                      {getAppointmentTypeLabel(appointment.type)}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
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