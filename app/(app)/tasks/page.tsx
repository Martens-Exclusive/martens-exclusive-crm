import Link from "next/link";

import { completeTask } from "../leads/actions";
import { prisma } from "@/lib/prisma";

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    include: {
      lead: true,
      assignedUser: true
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 200
  });

  const now = new Date();
  const openTasks = tasks.filter((task) => task.status === "OPEN" && task.dueAt >= now);
  const overdueTasks = tasks.filter((task) => task.status === "OPEN" && task.dueAt < now);
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED");

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
          Hier zie je open, te late en voltooide taken voor dagelijkse salesopvolging.
        </p>
      </section>

      <TaskSection
        title="Te late taken"
        tasks={overdueTasks}
        emptyText="Geen te late taken."
        highlight="overdue"
      />

      <TaskSection
        title="Open taken"
        tasks={openTasks}
        emptyText="Geen open taken."
      />

      <TaskSection
        title="Voltooide taken"
        tasks={completedTasks}
        emptyText="Nog geen voltooide taken."
      />
    </main>
  );
}

function TaskSection({
  title,
  tasks,
  emptyText,
  highlight
}: {
  title: string;
  tasks: Array<{
    id: string;
    title: string;
    dueAt: Date;
    notes: string | null;
    status: string;
    leadId: string;
    lead: { firstName: string; lastName: string };
    assignedUser: { firstName: string; lastName: string };
  }>;
  emptyText: string;
  highlight?: "overdue";
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
          tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-[22px] border p-5 ${
                highlight === "overdue"
                  ? "border-red-300 bg-red-50"
                  : "border-black/10 bg-[#efefef]"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-black">{task.title}</p>

                  <p className="mt-1 text-sm text-black/70">
                    Lead:{" "}
                    <Link href={`/leads/${task.leadId}`} className="font-medium text-black">
                      {task.lead.firstName} {task.lead.lastName}
                    </Link>
                  </p>

                  <p className="mt-1 text-xs text-black/50">
                    Verkoper: {task.assignedUser.firstName} {task.assignedUser.lastName}
                  </p>

                  <p className="mt-1 text-xs text-black/50">
                    Vervaldatum:{" "}
                    {new Intl.DateTimeFormat("nl-BE", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(task.dueAt)}
                  </p>

                  <p className="mt-1 text-xs text-black/50">
                    Status: {getTaskStatusLabel(task.status)}
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
          ))
        )}
      </div>
    </section>
  );
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