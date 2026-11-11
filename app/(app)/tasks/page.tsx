import Link from "next/link";
import type { Route } from "next";

import { ConfirmActionForm } from "@/components/confirm-action-form";
import { requireUser } from "@/lib/auth";
import { wallClockNow } from "@/lib/lead-tasks";
import { prisma } from "@/lib/prisma";
import { completeTask, deleteCompletedTasks, deleteTask } from "../leads/actions";

type View = "open" | "completed";
type GroupKey = "overdue" | "today" | "tomorrow" | "week" | "nextWeek" | "later";

type TaskRow = {
  id: string;
  title: string;
  dueAt: Date;
  notes: string | null;
  status: string;
  leadId: string;
  lead: {
    firstName: string;
    lastName: string;
    interestedBrand: string | null;
    interestedModel: string | null;
    primaryVehicle: { brand: string; model: string } | null;
  };
  assignedUser: { firstName: string };
};

const DAY_MS = 24 * 60 * 60 * 1000;

const dayFormatter = new Intl.DateTimeFormat("nl-BE", { weekday: "short", day: "numeric", month: "short" });
const timeFormatter = new Intl.DateTimeFormat("nl-BE", { hour: "2-digit", minute: "2-digit" });
const completedFormatter = new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium", timeStyle: "short" });

const groupMeta: Record<GroupKey, { title: string; hint: string }> = {
  overdue: { title: "Te laat", hint: "Hier had je al aan moeten beginnen" },
  today: { title: "Vandaag", hint: "" },
  tomorrow: { title: "Morgen", hint: "" },
  week: { title: "Rest van deze week", hint: "" },
  nextWeek: { title: "Volgende week", hint: "" },
  later: { title: "Later", hint: "" }
};

const groupOrder: GroupKey[] = ["overdue", "today", "tomorrow", "week", "nextWeek", "later"];

export default async function TasksPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string; owner?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  const view: View = params?.status === "completed" ? "completed" : "open";
  const onlyOverdue = params?.status === "overdue";
  const showAll = params?.owner === "all";
  const ownerWhere = showAll ? {} : { assignedUserId: user.id };

  const include = {
    lead: {
      select: {
        firstName: true,
        lastName: true,
        interestedBrand: true,
        interestedModel: true,
        primaryVehicle: { select: { brand: true, model: true } }
      }
    },
    assignedUser: { select: { firstName: true } }
  } as const;

  const [openTasks, completedTasks, openMine, openAll, completedCount] = await Promise.all([
    view === "open"
      ? prisma.task.findMany({
          where: { status: "OPEN", ...ownerWhere },
          include,
          orderBy: { dueAt: "asc" },
          take: 300
        })
      : Promise.resolve([] as TaskRow[]),
    view === "completed"
      ? prisma.task.findMany({
          where: { status: "COMPLETED", ...ownerWhere },
          include,
          orderBy: { completedAt: "desc" },
          take: 100
        })
      : Promise.resolve([] as TaskRow[]),
    prisma.task.count({ where: { status: "OPEN", assignedUserId: user.id } }),
    prisma.task.count({ where: { status: "OPEN" } }),
    prisma.task.count({ where: { status: "COMPLETED", ...ownerWhere } })
  ]);

  const now = wallClockNow();
  const bounds = getBounds(now);

  const groups = new Map<GroupKey, TaskRow[]>(groupOrder.map((key) => [key, []]));

  for (const task of openTasks as TaskRow[]) {
    groups.get(getGroup(task.dueAt, now, bounds))!.push(task);
  }

  const count = (key: GroupKey) => groups.get(key)!.length;
  const visibleGroups = groupOrder.filter((key) => count(key) > 0 && (!onlyOverdue || key === "overdue"));
  const openCount = openTasks.length;

  const summary = [
    count("overdue") > 0 ? `${count("overdue")} te laat` : null,
    count("today") > 0 ? `${count("today")} vandaag` : null,
    count("tomorrow") > 0 ? `${count("tomorrow")} morgen` : null
  ].filter(Boolean);

  const baseQuery = (status: string | null, owner: boolean) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (owner) query.set("owner", "all");
    const text = query.toString();

    return (text ? `/tasks?${text}` : "/tasks") as Route;
  };

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">Taken</p>
            <h1 className="mt-3 text-3xl font-bold text-black">{showAll ? "Alle taken" : "Mijn taken"}</h1>
            <p className="mt-2 text-sm text-black/65">
              {view === "completed"
                ? `${completedCount} voltooide ${completedCount === 1 ? "taak" : "taken"}`
                : openCount === 0
                  ? "Niets meer te doen. Goed bezig."
                  : summary.length > 0
                    ? summary.join(" · ")
                    : `${openCount} open ${openCount === 1 ? "taak" : "taken"}, niets dat dringt`}
            </p>
          </div>

          <div className="flex rounded-2xl border border-black/10 bg-raised p-1">
            <ScopeLink href={baseQuery(view === "completed" ? "completed" : null, false)} active={!showAll}>
              Mijn taken
            </ScopeLink>
            <ScopeLink href={baseQuery(view === "completed" ? "completed" : null, true)} active={showAll}>
              Iedereen
            </ScopeLink>
          </div>
        </div>

        {view === "open" ? (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Te laat" value={count("overdue")} tone={count("overdue") > 0 ? "alert" : "normal"} />
            <Stat label="Vandaag" value={count("today")} />
            <Stat label="Morgen" value={count("tomorrow")} />
            <Stat label="Later" value={count("week") + count("nextWeek") + count("later")} />
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <TabLink href={baseQuery(null, showAll)} active={view === "open" && !onlyOverdue}>
            Open ({showAll ? openAll : openMine})
          </TabLink>
          <TabLink href={baseQuery("overdue", showAll)} active={onlyOverdue}>
            Enkel te laat
          </TabLink>
          <TabLink href={baseQuery("completed", showAll)} active={view === "completed"}>
            Voltooid ({completedCount})
          </TabLink>
        </div>
      </section>

      {view === "open" ? (
        visibleGroups.length === 0 ? (
          <section className="rounded-[28px] border border-black/10 bg-card p-8 text-center text-sm text-black/55 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            {onlyOverdue ? "Niets te laat." : "Geen open taken."}
          </section>
        ) : (
          visibleGroups.map((key) => (
            <section
              key={key}
              className={`rounded-[28px] border bg-card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-6 ${
                key === "overdue" ? "border-red-300" : "border-black/10"
              }`}
            >
              <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                <h2 className={`text-lg font-bold ${key === "overdue" ? "text-red-700" : "text-black"}`}>
                  {groupMeta[key].title}
                </h2>
                <span className="text-xs font-semibold text-black/45">{count(key)}</span>
              </div>

              <ul className="flex flex-col gap-2">
                {groups.get(key)!.map((task) => (
                  <OpenTaskRow key={task.id} task={task} group={key} now={now} showSeller={showAll} />
                ))}
              </ul>
            </section>
          ))
        )
      ) : (
        <section className="rounded-[28px] border border-black/10 bg-card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <h2 className="text-lg font-bold text-black">Voltooide taken</h2>

            {completedCount > 0 ? (
              <ConfirmActionForm
                action={deleteCompletedTasks}
                size="md"
                label={`Alle voltooide taken verwijderen (${completedCount})`}
                message={`${completedCount} voltooide taken definitief verwijderen? Dit kan niet ongedaan gemaakt worden.`}
              />
            ) : null}
          </div>

          {completedTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-black/55">Nog geen voltooide taken.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(completedTasks as Array<TaskRow & { completedAt: Date | null }>).map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-panel px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-black/70 line-through decoration-black/30">{task.title}</p>
                    <p className="mt-0.5 text-xs text-black/50">
                      <LeadLink task={task} />
                      {task.completedAt ? ` · afgewerkt ${completedFormatter.format(task.completedAt)}` : ""}
                    </p>
                  </div>

                  <ConfirmActionForm
                    action={deleteTask}
                    hidden={{ taskId: task.id }}
                    label="Verwijderen"
                    message="Deze taak definitief verwijderen?"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

function OpenTaskRow({
  task,
  group,
  now,
  showSeller
}: {
  task: TaskRow;
  group: GroupKey;
  now: Date;
  showSeller: boolean;
}) {
  const overdue = group === "overdue";
  const days = Math.floor((now.getTime() - task.dueAt.getTime()) / DAY_MS);

  // Vandaag en morgen: enkel het uur. Verder weg: de dag, met het uur eronder.
  const primary =
    group === "today" || group === "tomorrow" ? timeFormatter.format(task.dueAt) : dayFormatter.format(task.dueAt);
  const secondary = overdue
    ? days <= 0
      ? "vandaag te laat"
      : `${days} ${days === 1 ? "dag" : "dagen"} te laat`
    : group === "today" || group === "tomorrow"
      ? null
      : timeFormatter.format(task.dueAt);

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border px-4 py-3 sm:flex-nowrap ${
        overdue ? "border-red-200 bg-red-50" : "border-black/10 bg-panel"
      }`}
    >
      <div className="w-24 shrink-0">
        <p className={`text-sm font-bold ${overdue ? "text-red-700" : "text-black"}`}>{primary}</p>
        {secondary ? (
          <p className={`text-xs ${overdue ? "font-semibold text-red-700" : "text-black/50"}`}>
            {secondary}
          </p>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-black">{task.title}</p>
        <p className="mt-0.5 text-xs text-black/55">
          <LeadLink task={task} />
          {showSeller ? ` · ${task.assignedUser.firstName}` : ""}
        </p>
        {task.notes ? <p className="mt-1 line-clamp-1 text-xs text-black/50">{task.notes}</p> : null}
      </div>

      <form action={completeTask} className="shrink-0">
        <input type="hidden" name="taskId" value={task.id} />
        <button
          type="submit"
          className="rounded-xl border border-black/15 bg-white px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-hover"
        >
          Afgewerkt
        </button>
      </form>
    </li>
  );
}

function LeadLink({ task }: { task: TaskRow }) {
  const vehicle = task.lead.primaryVehicle
    ? `${task.lead.primaryVehicle.brand} ${task.lead.primaryVehicle.model}`
    : [task.lead.interestedBrand, task.lead.interestedModel].filter(Boolean).join(" ");

  return (
    <>
      <Link
        href={`/leads/${task.leadId}` as Route}
        className="font-semibold text-black/80 underline decoration-black/20 underline-offset-4 hover:text-black"
      >
        {task.lead.firstName} {task.lead.lastName}
      </Link>
      {vehicle ? ` · ${vehicle}` : ""}
    </>
  );
}

function Stat({ label, value, tone = "normal" }: { label: string; value: number; tone?: "normal" | "alert" }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${tone === "alert" ? "border-red-300 bg-red-50" : "border-black/10 bg-panel"}`}
    >
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${tone === "alert" ? "text-red-700" : "text-black/45"}`}>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${tone === "alert" ? "text-red-700" : "text-black"}`}>{value}</p>
    </div>
  );
}

function ScopeLink({ href, active, children }: { href: Route; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-black text-white" : "text-black/70 hover:text-black"
      }`}
    >
      {children}
    </Link>
  );
}

function TabLink({ href, active, children }: { href: Route; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
        active ? "border-black bg-black text-white" : "border-black/15 bg-raised text-black hover:bg-hover2"
      }`}
    >
      {children}
    </Link>
  );
}

// Grenzen op de muurklok: begin van vandaag, morgen, overmorgen, volgende maandag en de maandag erna.
function getBounds(now: Date) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = (startOfToday.getDay() + 6) % 7; // maandag = 0

  return {
    tomorrow: new Date(startOfToday.getTime() + DAY_MS),
    dayAfter: new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() + 2),
    nextMonday: new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() + (7 - dayOfWeek)),
    mondayAfter: new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() + (14 - dayOfWeek))
  };
}

function getGroup(dueAt: Date, now: Date, bounds: ReturnType<typeof getBounds>): GroupKey {
  if (dueAt < now) return "overdue";
  if (dueAt < bounds.tomorrow) return "today";
  if (dueAt < bounds.dayAfter) return "tomorrow";
  if (dueAt < bounds.nextMonday) return "week";
  if (dueAt < bounds.mondayAfter) return "nextWeek";

  return "later";
}
