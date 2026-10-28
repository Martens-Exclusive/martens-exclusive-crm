"use client";

import { useActionState, useEffect, useState } from "react";

import { updateNeedsAnalysis, type UpdateNeedsAnalysisState } from "../actions";
import { NeedsAnalysisFields } from "../needs-analysis-fields";
import { Button } from "@/components/ui/button";
import {
  getOwnershipLabel,
  getTimelineLabel,
  hasNeedsAnalysisContent,
  splitList,
  type NeedsAnalysisValues
} from "@/lib/needs-analysis";

type NeedsAnalysisCardProps = {
  leadId: string;
  values: NeedsAnalysisValues;
  // Tekst zoals "Ingevuld op 15 oktober 2026" (op de server opgemaakt); leeg als er nog geen analyse is.
  savedLabel: string;
};

const initialState: UpdateNeedsAnalysisState = {};

function DocRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-black/10 py-4 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[200px_1fr] md:gap-6">
      <p className="pt-0.5 text-xs font-bold uppercase tracking-[0.12em] text-black/45">{label}</p>
      <div className="text-sm leading-6 text-black">{children}</div>
    </div>
  );
}

function Text({ value }: { value: string }) {
  return value ? (
    <p className="whitespace-pre-line">{value}</p>
  ) : (
    <p className="text-black/35">–</p>
  );
}

function Chips({ value, tone }: { value: string; tone: "neutral" | "negative" }) {
  const items = splitList(value);

  if (items.length === 0) return <p className="text-black/35">–</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={`rounded-full px-3 py-1 text-sm ${
            tone === "negative" ? "bg-red-100 text-red-800" : "bg-hover3 text-black"
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function NeedsAnalysisCard({ leadId, values, savedLabel }: NeedsAnalysisCardProps) {
  const hasContent = hasNeedsAnalysisContent(values);

  // Zonder analyse staat het blok dicht; met analyse staat het open.
  const [isOpen, setIsOpen] = useState(hasContent);
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateNeedsAnalysis, initialState);

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
      setIsOpen(true);
    }
  }, [state.success]);

  const timelineLabel = getTimelineLabel(values.timeline);
  const ownershipLabel = getOwnershipLabel(values.ownership);

  return (
    <div className="rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black">Behoefteanalyse</h2>
          <p className="mt-1 text-sm text-black/55">
            {hasContent ? savedLabel : "Nog niet ingevuld. Noteer hier wat de klant nodig heeft."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOpen && !isEditing && hasContent ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-hover"
            >
              Wijzig
            </button>
          ) : null}

          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => {
              // Nog niets ingevuld: openklappen betekent meteen het formulier tonen.
              if (!isOpen && !hasContent) setIsEditing(true);
              setIsOpen(!isOpen);
            }}
            className="rounded-xl border border-black/15 bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/80"
          >
            {isOpen ? "– Inklappen" : hasContent ? "+ Uitklappen" : "+ Behoefteanalyse invullen"}
          </button>
        </div>
      </div>

      <div className={isOpen ? undefined : "hidden"}>
        {isEditing ? (
          <form action={formAction} className="mt-6 rounded-2xl border border-black/10 bg-panel p-6">
            <input type="hidden" name="leadId" value={leadId} />

            <NeedsAnalysisFields defaults={values} />

            {state.message ? (
              <div
                className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                  state.success
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {state.message}
              </div>
            ) : null}

            <div className="mt-6 flex items-center gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Opslaan..." : "Opslaan"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  if (!hasContent) setIsOpen(false);
                }}
                className="rounded-2xl border border-black/15 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-hover"
              >
                Annuleren
              </button>
            </div>
          </form>
        ) : hasContent ? (
          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
            <DocRow label="Aanleiding">
              <Text value={values.reasonAndCurrentCar} />
            </DocRow>
            <DocRow label="Gebruik">
              <Text value={values.usage} />
            </DocRow>
            <DocRow label="Privé of zaak">
              <Text value={ownershipLabel} />
            </DocRow>
            <DocRow label="Budget en betaling">
              <Text value={values.budget} />
            </DocRow>
            <DocRow label="Must-haves">
              <Chips value={values.mustHaves} tone="neutral" />
            </DocRow>
            <DocRow label="No-gos">
              <Chips value={values.noGos} tone="negative" />
            </DocRow>
            <DocRow label="Timing">
              {timelineLabel ? (
                <span className="inline-block rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                  {timelineLabel}
                </span>
              ) : (
                <p className="text-black/35">–</p>
              )}
            </DocRow>
            <DocRow label="Beslissing">
              <Text value={values.decision} />
            </DocRow>
            <DocRow label="Notities">
              <Text value={values.notes} />
            </DocRow>
          </div>
        ) : null}
      </div>
    </div>
  );
}
