"use client";

import { useState } from "react";

import { openFichePanel } from "./fiche-actions";
import {
  getOwnershipLabel,
  getTimelineLabel,
  hasNeedsAnalysisContent,
  type NeedsAnalysisValues
} from "@/lib/needs-analysis";
import {
  ANNUAL_KM_OPTIONS,
  CHARGING_OPTIONS,
  ELECTRIC_RANGE_OPTIONS,
  LONGEST_TRIP_OPTIONS,
  buildSearchLines,
  formatCandidate,
  formatCurrentCar,
  getCompleteness,
  getLabel,
  hasProfileContent,
  type NeedsProfile
} from "@/lib/needs-profile";

type NeedsAnalysisCardProps = {
  values: NeedsAnalysisValues;
  profile: NeedsProfile;
  // Tekst zoals "Ingevuld op 15 oktober 2026" (op de server opgemaakt); leeg als er nog geen analyse is.
  savedLabel: string;
};

function DocRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-black/10 py-3 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[150px_1fr] md:gap-5">
      <p className="pt-0.5 text-xs font-bold uppercase tracking-[0.12em] text-black/45">{label}</p>
      <div className="text-sm leading-6 text-black">{children}</div>
    </div>
  );
}

function Text({ value }: { value: string }) {
  return value ? <p className="whitespace-pre-line">{value}</p> : <p className="text-black/35">–</p>;
}

export function NeedsAnalysisCard({ values, profile, savedLabel }: NeedsAnalysisCardProps) {
  const [copied, setCopied] = useState(false);

  const hasContent = hasNeedsAnalysisContent(values) || hasProfileContent(profile);
  const completeness = getCompleteness(values, profile);
  const doneCount = completeness.filter((item) => item.done).length;
  const missing = completeness.filter((item) => !item.done);
  const searchLines = buildSearchLines(values, profile);

  async function copySummary() {
    const text = searchLines.map((line) => `${line.label}: ${line.value}`).join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Kopiëren niet toegestaan in deze browser: dan blijft de tekst gewoon zichtbaar om te selecteren.
    }
  }

  const timelineLabel = getTimelineLabel(values.timeline);
  const ownershipLabel = getOwnershipLabel(values.ownership);

  const currentCar = formatCurrentCar(profile);
  const usageBits = [
    getLabel(ANNUAL_KM_OPTIONS, profile.annualKm),
    profile.tripTypes.join(", "),
    profile.passengers.join(", "),
    profile.longestTrip ? `langste rit ${getLabel(LONGEST_TRIP_OPTIONS, profile.longestTrip).toLowerCase()}` : "",
    profile.minElectricRange && profile.minElectricRange !== "ANY"
      ? `elektrisch bereik: ${getLabel(ELECTRIC_RANGE_OPTIONS, profile.minElectricRange).toLowerCase()}`
      : profile.minElectricRange === "ANY"
        ? "elektrisch bereik maakt niet uit"
        : "",
    profile.charging ? `laden: ${getLabel(CHARGING_OPTIONS, profile.charging).toLowerCase()}` : ""
  ].filter(Boolean);

  return (
    <div className="rounded-[28px] border border-black/10 bg-card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black">Behoefteanalyse</h2>
          <p className="mt-1 text-sm text-black/55">
            {hasContent ? savedLabel : "Nog niet ingevuld. Vul ze in tijdens het gesprek."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openFichePanel("needs")}
          className="rounded-xl border border-black/15 bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/80"
        >
          {hasContent ? "Aanvullen of wijzigen" : "Invullen"}
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-black/10 bg-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">Besproken</p>
          <p className="text-sm font-bold text-black">
            {doneCount} van {completeness.length}
          </p>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-black" style={{ width: `${(doneCount / completeness.length) * 100}%` }} />
        </div>

        {missing.length > 0 ? (
          <p className="mt-3 text-xs leading-5 text-black/60">
            <span className="font-semibold text-black/75">Nog te vragen:</span>{" "}
            {missing.map((item) => item.label.toLowerCase()).join(" · ")}
          </p>
        ) : (
          <p className="mt-3 text-xs font-semibold text-green-700">Alles besproken. Je kan gericht beginnen zoeken.</p>
        )}
      </div>

      {searchLines.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">Zoekprofiel</p>
            <button
              type="button"
              onClick={copySummary}
              className="rounded-lg border border-black/15 bg-raised px-3 py-1 text-xs font-semibold text-black transition hover:bg-hover2"
            >
              {copied ? "Gekopieerd" : "Kopieer"}
            </button>
          </div>

          <dl className="flex flex-col gap-2 text-sm">
            {searchLines.map((line) => (
              <div key={line.label} className="grid gap-0.5 sm:grid-cols-[120px_1fr] sm:gap-4">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-black/45 sm:pt-0.5">{line.label}</dt>
                <dd className="font-semibold leading-6 text-black">{line.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {hasContent ? (
        <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
          {profile.candidates.length > 0 ? (
            <DocRow label="Interesse in">
              <ul className="flex flex-col gap-1">
                {profile.candidates.map((candidate, index) => (
                  <li key={index}>
                    <span className="font-semibold">{formatCandidate(candidate)}</span>
                    {candidate.note ? <span className="text-black/55"> · {candidate.note}</span> : null}
                  </li>
                ))}
              </ul>
            </DocRow>
          ) : null}

          <DocRow label="Aanleiding">
            {profile.reasons.length > 0 || values.reasonAndCurrentCar ? (
              <div className="flex flex-col gap-1">
                {profile.reasons.length > 0 ? <p className="font-semibold">{profile.reasons.join(" · ")}</p> : null}
                {values.reasonAndCurrentCar ? <p className="whitespace-pre-line">{values.reasonAndCurrentCar}</p> : null}
              </div>
            ) : (
              <p className="text-black/35">–</p>
            )}
          </DocRow>

          <DocRow label="Huidige wagen">
            {currentCar || profile.likes.length > 0 || profile.dislikes.length > 0 ? (
              <div className="flex flex-col gap-1">
                {currentCar ? <p className="font-semibold">{currentCar}</p> : null}
                {profile.likes.length > 0 ? (
                  <p>
                    <span className="text-black/50">Bevalt: </span>
                    {profile.likes.join(", ")}
                  </p>
                ) : null}
                {profile.dislikes.length > 0 ? (
                  <p>
                    <span className="text-black/50">Bevalt niet: </span>
                    {profile.dislikes.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-black/35">–</p>
            )}
          </DocRow>

          <DocRow label="Gebruik">
            {usageBits.length > 0 || values.usage ? (
              <div className="flex flex-col gap-1">
                {usageBits.length > 0 ? <p className="font-semibold">{usageBits.join(" · ")}</p> : null}
                {values.usage ? <p className="whitespace-pre-line">{values.usage}</p> : null}
              </div>
            ) : (
              <p className="text-black/35">–</p>
            )}
          </DocRow>

          <DocRow label="Budget">
            <div className="flex flex-col gap-1">
              {profile.budgetMax ? (
                <p className="font-semibold">Maximum €{new Intl.NumberFormat("nl-BE").format(Number(profile.budgetMax))}</p>
              ) : null}
              {profile.payment.length > 0 ? <p>{profile.payment.join(", ")}</p> : null}
              {values.budget ? <p className="whitespace-pre-line">{values.budget}</p> : null}
              {ownershipLabel ? <p className="text-black/60">{ownershipLabel}</p> : null}
              {!profile.budgetMax && !values.budget && !ownershipLabel && profile.payment.length === 0 ? <p className="text-black/35">–</p> : null}
            </div>
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
            {profile.decisionTags.length > 0 || values.decision ? (
              <div className="flex flex-col gap-1">
                {profile.decisionTags.length > 0 ? <p className="font-semibold">{profile.decisionTags.join(" · ")}</p> : null}
                {values.decision ? <p className="whitespace-pre-line">{values.decision}</p> : null}
              </div>
            ) : (
              <p className="text-black/35">–</p>
            )}
          </DocRow>

          <DocRow label="Houdt hem tegen">
            {profile.blockers.length > 0 ? <p className="font-semibold">{profile.blockers.join(" · ")}</p> : <p className="text-black/35">–</p>}
          </DocRow>

          <DocRow label="Notities">
            <Text value={values.notes} />
          </DocRow>
        </div>
      ) : null}
    </div>
  );
}
