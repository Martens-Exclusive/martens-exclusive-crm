"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { moveLeadStatus } from "../actions";

export type BoardLead = {
  id: string;
  name: string;
  status: string;
  vehicle: string | null;
  priority: string;
  priorityLabel: string;
  source: string;
  seller: string | null;
  followUpLabel: string | null;
  // Aantal dagen te laat; null = niet te laat (of geen opvolging).
  overdueDays: number | null;
};

export type BoardColumn = {
  status: string;
  label: string;
  badgeClassName: string;
};

type PipelineBoardProps = {
  columns: BoardColumn[];
  leads: BoardLead[];
};

export function PipelineBoard({ columns, leads: initialLeads }: PipelineBoardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Na een verplaatsing haalt de server de lijst opnieuw op; die is dan de waarheid.
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  function showError(message: string) {
    setError(message);

    if (errorTimer.current) {
      clearTimeout(errorTimer.current);
    }

    errorTimer.current = setTimeout(() => setError(null), 5000);
  }

  function moveLead(leadId: string, status: string) {
    const lead = leads.find((item) => item.id === leadId);

    if (!lead || lead.status === status) {
      return;
    }

    const previousStatus = lead.status;

    setLeads((current) =>
      current.map((item) => (item.id === leadId ? { ...item, status } : item))
    );

    startTransition(async () => {
      const result = await moveLeadStatus(leadId, status);

      if (!result.success) {
        setLeads((current) =>
          current.map((item) =>
            item.id === leadId ? { ...item, status: previousStatus } : item
          )
        );
        showError(result.message ?? "Verplaatsen is mislukt.");
      }
    });
  }

  return (
    <div>
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {columns.map((column, columnIndex) => {
          const columnLeads = leads.filter((lead) => lead.status === column.status);
          const isEmpty = columnLeads.length === 0;
          const isOver = overStatus === column.status && draggingId !== null;

          return (
            <section
              key={column.status}
              onDragOver={(event) => {
                if (draggingId) {
                  event.preventDefault();
                  setOverStatus(column.status);
                }
              }}
              onDragLeave={() => setOverStatus((current) => (current === column.status ? null : current))}
              onDrop={(event) => {
                event.preventDefault();

                if (draggingId) {
                  moveLead(draggingId, column.status);
                }

                setDraggingId(null);
                setOverStatus(null);
              }}
              className={`rounded-[22px] border p-3 transition ${
                isOver
                  ? "border-black/40 bg-hover2"
                  : "border-black/10 bg-card"
              }`}
            >
              <div className={`flex items-center justify-between gap-2 px-1 ${isEmpty ? "" : "pb-3"}`}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-xs font-bold text-black/35">{columnIndex + 1}</span>
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${column.badgeClassName}`}
                  >
                    {column.label}
                  </span>
                </span>

                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-black/55">
                  {columnLeads.length}
                </span>
              </div>

              {isEmpty ? (
                <p className="px-1 pt-2 text-xs text-black/40 max-sm:hidden">Sleep een lead hierheen</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {columnLeads.map((lead) => (
                    <article
                      key={lead.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", lead.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(lead.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverStatus(null);
                      }}
                      className={`rounded-2xl border bg-white transition lg:cursor-grab ${
                        lead.overdueDays !== null ? "border-red-300" : "border-black/10"
                      } ${draggingId === lead.id ? "opacity-40" : ""}`}
                    >
                      <Link href={`/leads/${lead.id}`} draggable={false} className="block p-3.5 pb-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 text-sm font-bold leading-5 text-black">{lead.name}</p>

                          {lead.priority === "HOT" || lead.priority === "HIGH" ? (
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                lead.priority === "HOT"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-orange-200 bg-orange-50 text-orange-700"
                              }`}
                            >
                              {lead.priorityLabel}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-xs leading-5 text-black/60">
                          {lead.vehicle ?? "Geen wagen"}
                        </p>

                        <p
                          className={`mt-2 text-xs font-semibold ${
                            lead.overdueDays !== null
                              ? "text-red-700"
                              : lead.followUpLabel
                                ? "text-black/65"
                                : "text-black/40"
                          }`}
                        >
                          {lead.overdueDays !== null
                            ? lead.overdueDays === 0
                              ? "Opvolging te laat"
                              : `${lead.overdueDays} ${lead.overdueDays === 1 ? "dag" : "dagen"} te laat`
                            : lead.followUpLabel
                              ? `Opvolging ${lead.followUpLabel}`
                              : "Geen opvolging gepland"}
                        </p>
                      </Link>

                      <div className="flex items-center justify-between gap-2 border-t border-black/8 px-3.5 py-2">
                        <p
                          title={`Bron: ${lead.source}`}
                          className="max-w-[5.5rem] shrink-0 truncate text-[11px] text-black/45"
                        >
                          {lead.seller ?? "Geen verkoper"}
                        </p>

                        <select
                          aria-label={`Verplaats ${lead.name} naar een andere fase`}
                          value={lead.status}
                          onChange={(event) => moveLead(lead.id, event.target.value)}
                          className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-1.5 py-1 text-[11px] font-semibold text-black/70"
                        >
                          {columns.map((option) => (
                            <option key={option.status} value={option.status}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
