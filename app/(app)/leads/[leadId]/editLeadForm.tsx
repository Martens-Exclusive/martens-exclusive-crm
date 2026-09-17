"use client";

import { useActionState, useState } from "react";

import { updateLead, type UpdateLeadState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LeadStatus } from "@/lib/lead-status";

type EditLeadFormProps = {
  leadId: string;
  currentStatus: string;
  currentNextFollowUpAt: string;
  currentInternalNotes: string;
  currentLostNotes: string;
  statuses: Array<{ value: LeadStatus; label: string }>;
};

const initialState: UpdateLeadState = {};

export function EditLeadForm({
  leadId,
  currentStatus,
  currentNextFollowUpAt,
  currentInternalNotes,
  currentLostNotes,
  statuses
}: EditLeadFormProps) {
  const [state, formAction, isPending] = useActionState(updateLead, initialState);
  const [status, setStatus] = useState(currentStatus);

  return (
    <form
      action={formAction}
      className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      <input type="hidden" name="leadId" value={leadId} />

      <h2 className="text-xl font-bold text-black">Lead bewerken</h2>

      <p className="mt-2 text-sm leading-6 text-black/70">
        Werk de status, de volgende opvolging en interne notities bij.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Field label="Status">
          <Select
            name="status"
            defaultValue={currentStatus}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statuses.map((statusOption) => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </Select>
        </Field>

        {status === "LOST" ? (
          <Field
            label="Reden verloren"
            hint="Verplicht: waarom is deze lead verloren?"
          >
            <Textarea
              name="lostNotes"
              rows={3}
              defaultValue={currentLostNotes}
              placeholder="Bv. koos voor concurrent, prijs te hoog, geen reactie meer..."
            />

            {state.errors?.lostNotes ? (
              <span className="text-xs font-medium text-red-700">
                {state.errors.lostNotes[0]}
              </span>
            ) : null}
          </Field>
        ) : null}

        <Field
          label="Volgende opvolging"
          hint="Laat leeg als er geen nieuwe opvolging meer gepland moet worden."
        >
          <Input
            name="nextFollowUpAt"
            type="datetime-local"
            defaultValue={currentNextFollowUpAt}
          />
        </Field>

        <Field label="Interne notities">
          <Textarea
            name="internalNotes"
            rows={6}
            defaultValue={currentInternalNotes}
          />
        </Field>
      </div>

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

      <div className="mt-8">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Lead wordt bijgewerkt..." : "Lead opslaan"}
        </Button>
      </div>
    </form>
  );
}