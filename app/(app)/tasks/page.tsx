import Link from "next/link";
import type { Route } from "next";

import { completeTask } from "../leads/actions";
import { prisma } from "@/lib/prisma";

type TaskFilter = "open" | "overdue" | "completed" | "all";

export default async function TasksPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const activeFilter = getTaskFilter(params?.status);

  const tasks = await prisma.task.findMany({
    include: {
      lead: true,
      assignedUser: true
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 200
  });

  const now = new Date();

  const overdueTasks = tasks.filter(
    (task) => task.status === "OPEN" && task.dueAt && task.dueAt < now
  );

  const openTasks = tasks.filter(
    (task) => task.status === "OPEN" && (!task.dueAt || task.dueAt >= now)
  );

  const completedTasks = tasks.filter((task) => task.status === "COMPLETED");

  const visibleTasks =
    activeFilter === "overdue"
      ? overdueTasks
      : activeFilter === "completed"
        ? completedTasks
        : activeFilter === "open"
          ? openTasks
          : tasks;

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
          Taken
        </p>

        <h1 className="mt-4 text-3xl font-bold text-black">
          Dagelijkse opvolgtaken.
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">
          Zie onmiddellijk welke opvolging vandaag aandacht nodig heeft, wat te laat is
          en welke taken al voltooid zijn.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <StatCard label="Te laat" value={overdueTasks.length} href="/tasks?status=overdue" />
          <StatCard label="Open" value={openTasks.length} href="/tasks?status=open" />
          <StatCard label="Voltooid" value={completedTasks.length} href="/tasks?status=completed" />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <FilterLink href="/tasks" label="Alle" active={activeFilter === "all"} />
          <FilterLink href="/tasks?status=overdue" label="Te laat" active={activeFilter === "overdue"} />
          <FilterLink href="/tasks?status=open" label="Open" active={activeFilter === "open"} />
          <FilterLink href="/tasks?status=completed" label="Voltooid" active={activeFilter === "completed"} />
        </div>
      </section>

      <TaskSection
        title={getSectionTitle(activeFilter)}
        tasks={visibleTasks}
        emptyText="Geen taken gevonden voor deze filter."
        now={now}
      />
    </main>
  );
}

function StatCard({
  label,
  value,
  href
}: {
  label: string;
  value: number;
  href: Route;
}) {
  return (
    <Link
      href={href}
      className="rounded-[22px] border border-black/10 bg-[#efefef] p-5 transition hover:bg-[#e7e7e7]"
    >
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-black/45">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-black">{value}</p>
    </Link>
  );
}

function FilterLink({
  href,
  label,
  active
}: {
  href: Route;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-black bg-black text-white"
          : "border-black/15 bg-[#fafafa] text-black hover:bg-[#e7e7e7]"
      }`}
    >
      {label}
    </Link>
  );
}

function TaskSection({
  title,
  tasks,
  emptyText,
  now
}: {
  title: string;
  tasks: Array<{
    id: string;
    title: string;
    dueAt: Date | null;
    notes: string | null;
    status: string;
    leadId: string;
    lead: { firstName: string; lastName: string };
    assignedUser: { firstName: string; lastName: string };
  }>;
  emptyText: string;
  now: Date;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <h2 className="text-xl font-bold text-black">{title}</h2>

      <div className="mt-6 flex flex-col gap-4">
        {tasks.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-black/12 bg-[#ececec] p-4 text-sm text-black/55">
            {emptyText}
          </div>
        ) : (
          tasks.map((task) => {
            const isOverdue =
              task.status === "OPEN" && task.dueAt !== null && task.dueAt < now;

            return (
              <div
                key={task.id}
                className={`rounded-[22px] border p-5 ${
                  isOverdue
                    ? "border-red-300 bg-red-50"
                    : "border-black/10 bg-[#efefef]"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black">{task.title}</p>

                    <p className="mt-1 text-sm text-black/70">
                      Lead:{" "}
                      <Link
                        href={`/leads/${task.leadId}` as Route}
                        className="font-medium text-black underline decoration-black/20 underline-offset-4"
                      >
                        {task.lead.firstName} {task.lead.lastName}
                      </Link>
                    </p>

                    <p className="mt-1 text-xs text-black/50">
                      Verkoper: {task.assignedUser.firstName} {task.assignedUser.lastName}
                    </p>

                    <p className="mt-1 text-xs text-black/50">
                      Vervaldatum: {formatDueAt(task.dueAt)}
                    </p>

                    <p className="mt-1 text-xs text-black/50">
                      Status: {isOverdue ? "Te laat" : getTaskStatusLabel(task.status)}
                    </p>

                    {task.notes ? (
                      <p className="mt-2 text-sm leading-6 text-black/70">
                        {task.notes}
                      </p>
                    ) : null}
                  </div>

                  {task.status === "OPEN" ? (
                    <form action={completeTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        className="rounded-2xl border border-black/15 bg-[#fafafa] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#e7e7e7]"
                      >
                        Markeer als voltooid
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function getTaskFilter(status?: string): TaskFilter {
  if (status === "open") return "open";
  if (status === "overdue") return "overdue";
  if (status === "completed") return "completed";

  return "all";
}

function getSectionTitle(filter: TaskFilter) {
  if (filter === "open") return "Open taken";
  if (filter === "overdue") return "Te late taken";
  if (filter === "completed") return "Voltooide taken";

  return "Alle taken";
}

function formatDueAt(dueAt: Date | null) {
  if (!dueAt) return "Geen vervaldatum";

  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(dueAt);
}

function getTaskStatusLabel(status: string) {
  if (status === "OPEN") return "Open";
  if (status === "COMPLETED") return "Voltooid";
  if (status === "CANCELLED") return "Geannuleerd";

  return status;
}