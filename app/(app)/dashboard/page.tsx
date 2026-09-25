import Link from "next/link";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";

const numberFormatter = new Intl.NumberFormat("nl-BE");

export default async function DashboardPage() {
  const now = new Date();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [
    newLeads,
    overdueLeads,
    openTasks,
    overdueTasks,
    appointmentsToday,
    platforms
  ] = await Promise.all([
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({
      where: {
        nextFollowUpAt: { lt: now },
        status: {
          notIn: ["WON", "LOST"]
        }
      }
    }),
    prisma.task.count({
      where: {
        status: "OPEN",
        dueAt: { gte: now }
      }
    }),
    prisma.task.count({
      where: {
        status: "OPEN",
        dueAt: { lt: now }
      }
    }),
    prisma.appointment.count({
      where: {
        scheduledAt: {
          gte: startOfToday,
          lt: endOfToday
        }
      }
    }),
    prisma.platform.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    })
  ]);

  const cards: Array<{
    label: string;
    value: number;
    href: Route;
  }> = [
    { label: "Nieuwe leads", value: newLeads, href: "/leads" },
    { label: "Te late opvolging", value: overdueLeads, href: "/leads" },
    { label: "Open taken", value: openTasks, href: "/tasks?status=open" },
    { label: "Te late taken", value: overdueTasks, href: "/tasks?status=overdue" },
    { label: "Afspraken vandaag", value: appointmentsToday, href: "/appointments" }
  ];

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
          Dashboard
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-black">
          Dagelijks overzicht van leads en opvolging.
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">
          Dit dashboard houdt de focus op wat vandaag telt: nieuwe leads,
          open taken, te late opvolging en afspraken.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-[24px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)] transition hover:bg-[#ececec]"
          >
            <p className="text-sm font-semibold text-black/55">{card.label}</p>
            <p className="mt-4 text-4xl font-bold text-black">
              {numberFormatter.format(card.value)}
            </p>
          </Link>
        ))}
      </section>

      {platforms.length > 0 ? (
        <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-black">Platformen</h2>

            <Link
              href="/platforms"
              className="text-sm font-semibold text-black/55 hover:text-black"
            >
              Alles bekijken →
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((platform) => (
              <a
                key={platform.id}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-sm font-semibold text-black transition hover:border-black/25 hover:bg-[#ececec]"
              >
                {platform.name}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}