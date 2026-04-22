import Link from "next/link";

import { prisma } from "@/lib/prisma";

const numberFormatter = new Intl.NumberFormat("nl-BE");

export default async function DashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [newLeads, overdueLeads, todayTasks, appointmentsToday] = await Promise.all([
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({
      where: {
        nextFollowUpAt: { lt: new Date() },
        status: {
          notIn: ["WON", "LOST"]
        }
      }
    }),
    prisma.task.count({
      where: {
        status: "OPEN"
      }
    }),
    prisma.appointment.count({
      where: {
        scheduledAt: {
          gte: startOfToday,
          lt: endOfToday
        }
      }
    })
  ]);

  const cards = [
    { label: "Nieuwe leads", value: newLeads, href: "/leads" },
    { label: "Te late opvolging", value: overdueLeads, href: "/leads" },
    { label: "Open taken", value: todayTasks, href: "/tasks" },
    { label: "Afspraken vandaag", value: appointmentsToday, href: "/appointments" }
  ];

  return (
    <main className="flex flex-col gap-6">
      {/* HEADER */}
      <section className="rounded-[28px] border border-white/10 bg-[#0f0f10] p-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/45">
          Dashboard
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
          Dagelijks overzicht van leads en opvolging.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
          Dit eerste dashboard houdt de focus op wat vandaag telt: nieuwe leads,
          open opvolging en afspraken.
        </p>
      </section>

      {/* CARDS */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-[24px] border border-white/10 bg-[#111111] p-6 transition hover:border-white/20 hover:bg-[#151515]"
          >
            <p className="text-sm font-semibold text-white/55">{card.label}</p>
            <p className="mt-4 text-4xl font-bold text-white">
              {numberFormatter.format(card.value)}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}