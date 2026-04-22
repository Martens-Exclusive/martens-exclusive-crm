import Link from "next/link";

import { leadPriorityLabels, leadStatusLabels } from "@/lib/lead-status";
import { prisma } from "@/lib/prisma";

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    include: {
      source: true,
      assignedUser: true,
      primaryVehicle: true
    },
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
    take: 50
  });

  return (
    <main className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[#0f0f10] p-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/45">
            Leads
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">
            Alle leads op één plaats.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            Eerste versie van de leadmodule: lijst, aanmaak en detail. Filters en
            extra acties volgen in de volgende iteraties.
          </p>
        </div>

        <Link
          href="/leads/new"
          className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white px-5 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#d8d8d8]"
        >
          Nieuwe lead
        </Link>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0f0f10]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#111111] text-left text-xs uppercase tracking-[0.2em] text-white/38">
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
                    className="px-6 py-12 text-center text-sm text-white/50"
                  >
                    Nog geen leads. Voeg de eerste lead toe om te starten.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-white/10 text-sm text-white transition hover:bg-white/5"
                  >
                    <td className="px-6 py-5">
                      <Link href={`/leads/${lead.id}`} className="font-semibold text-white">
                        {lead.firstName} {lead.lastName}
                      </Link>
                      <p className="mt-1 text-xs text-white/45">
                        {lead.phone || lead.email || "Geen contactgegevens"}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      {leadStatusLabels[lead.status as keyof typeof leadStatusLabels] ?? lead.status}
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
                      {lead.nextFollowUpAt
                        ? new Intl.DateTimeFormat("nl-BE", {
                            dateStyle: "medium",
                            timeStyle: "short"
                          }).format(lead.nextFollowUpAt)
                        : "Nog niet ingepland"}
                    </td>

                    <td className="px-6 py-5">
                      {leadPriorityLabels[lead.priority as keyof typeof leadPriorityLabels] ??
                        lead.priority}
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