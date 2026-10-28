"use client";

import { useState } from "react";

import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyNeedsAnalysis,
  NEEDS_FORM_PREFIX,
  NEEDS_OWNERSHIP_OPTIONS,
  NEEDS_OWNERSHIP_QUESTION,
  NEEDS_TEXT_FIELDS,
  NEEDS_TIMELINE_OPTIONS,
  NEEDS_TIMELINE_QUESTION,
  type NeedsAnalysisKey,
  type NeedsAnalysisValues
} from "@/lib/needs-analysis";

type NeedsAnalysisFieldsProps = {
  defaults?: NeedsAnalysisValues;
};

function textField(name: NeedsAnalysisKey) {
  const field = NEEDS_TEXT_FIELDS.find((item) => item.name === name);

  if (!field) {
    throw new Error(`Onbekend behoefteveld: ${name}`);
  }

  return field;
}

// De 8 vragen + notities. De vraag blijft altijd zichtbaar boven het veld, het
// voorbeeld staat in grijs in het lege veld.
export function NeedsAnalysisFields({ defaults }: NeedsAnalysisFieldsProps) {
  const values = defaults ?? emptyNeedsAnalysis();
  const [timeline, setTimeline] = useState(values.timeline);

  function renderText(name: Exclude<NeedsAnalysisKey, "ownership" | "timeline">) {
    const field = textField(name);

    return (
      <Field label={field.label} hint={field.question}>
        <Textarea
          name={`${NEEDS_FORM_PREFIX}${field.name}`}
          rows={field.rows}
          defaultValue={values[field.name]}
          placeholder={field.placeholder}
          maxLength={2000}
        />
      </Field>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">{renderText("reasonAndCurrentCar")}</div>
      <div className="md:col-span-2">{renderText("usage")}</div>

      <Field label={NEEDS_OWNERSHIP_QUESTION.label} hint={NEEDS_OWNERSHIP_QUESTION.question}>
        <Select name={`${NEEDS_FORM_PREFIX}ownership`} defaultValue={values.ownership}>
          <option value="">Nog niet gekend</option>
          {NEEDS_OWNERSHIP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      {renderText("budget")}
      {renderText("mustHaves")}
      {renderText("noGos")}

      <fieldset className="flex flex-col gap-2 md:col-span-2">
        <legend className="text-sm font-medium text-black">{NEEDS_TIMELINE_QUESTION.label}</legend>

        <input type="hidden" name={`${NEEDS_FORM_PREFIX}timeline`} value={timeline} />

        <div className="flex flex-wrap gap-2">
          {NEEDS_TIMELINE_OPTIONS.map((option) => {
            const selected = timeline === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setTimeline(selected ? "" : option.value)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  selected
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white text-black hover:bg-hover"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-black/50">
          {NEEDS_TIMELINE_QUESTION.question} Klik nogmaals op je keuze om ze te wissen.
        </span>
      </fieldset>

      <div className="md:col-span-2">{renderText("decision")}</div>
      <div className="md:col-span-2">{renderText("notes")}</div>
    </div>
  );
}
