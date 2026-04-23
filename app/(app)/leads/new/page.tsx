import { prisma } from "@/lib/prisma";
import {
  leadPriorities,
  leadPriorityLabels,
  leadStatuses,
  leadStatusLabels
} from "@/lib/lead-status";
import { CreateLeadForm } from "./create-lead-form";

export default async function NewLeadPage() {
  const [sources, users, vehicles] = await Promise.all([
    prisma.leadSource.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true }
    }),
    prisma.vehicle.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, brand: true, model: true, variant: true, stockNumber: true }
    })
  ]);

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[32px] border border-white/10 bg-white p-8 shadow-[0_20px_60px_rgba(33,32,29,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/60">
          Nieuwe lead
        </p>
        <h1 className="mt-4 text-3xl font-bold text-black">
          Voeg snel een nieuwe lead toe.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">
          We houden dit formulier bewust compact: alleen de informatie die het team
          nodig heeft voor een snelle eerste opvolging.
        </p>
      </section>

      <CreateLeadForm
        sources={sources.map((source) => ({
          value: source.id,
          label: source.name
        }))}
        users={users}
        vehicles={vehicles}
        priorities={leadPriorities.map((value) => ({
          value,
          label: leadPriorityLabels[value]
        }))}
        statuses={leadStatuses.map((value) => ({
          value,
          label: leadStatusLabels[value]
        }))}
      />
    </main>
  );
}