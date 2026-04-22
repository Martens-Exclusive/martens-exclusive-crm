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
      <section className="rounded-[28px] border border-white/10 bg-[#0f0f10] p-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/45">
          Taken
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white">
          Dagelijkse opvolgtaken.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
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
    <section className="rounded-[28px] border border-white/10 bg-[#0f0f10] p-8">
      <h2 className="text-xl font-bold text-white">{title}</h2>

      <div className="mt-6 flex flex-col gap-4">
        {tasks.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-white/12 bg-[#101010] p-4 text-sm text-white/50">
            {emptyText}
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-[22px] border p-5 ${
                highlight === "overdue"
                  ? "border-red-500/40 bg-red-500/5"
                  : "border-white/10 bg-[#131313]"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{task.title}</p>

                  <p className="mt-1 text-sm text-white/66">
                    Lead:{" "}
                    <Link href={`/leads/${task.leadId}`} className="font-medium text-white">
                      {task.lead.firstName} {task.lead.lastName}
                    </Link>
                  </p>

                  <p className="mt-1 text-xs text-white/42">
                    Verkoper: {task.assignedUser.firstName} {task.assignedUser.lastName}
                  </p>

                  <p className="mt-1 text-xs text-white/42">
                    Vervaldatum:{" "}
                    {new Intl.DateTimeFormat("nl-BE", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(task.dueAt)}
                  </p>

                  <p className="mt-1 text-xs text-white/42">
                    Status: {getTaskStatusLabel(task.status)}
                  </p>

                  {task.notes ? (
                    <p className="mt-2 text-sm leading-6 text-white/66">
                      {task.notes}
                    </p>
                  ) : null}
                </div>

                {task.status === "OPEN" ? (
                  <form action={completeTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button
                      type="submit"
                      className="rounded-2xl border border-white/20 bg-white px-4 py-2 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#d8d8d8]"
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