"use client";

import { useActionState } from "react";

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
  statuses: Array<{ value: LeadStatus; label: string }>;
};

const initialState: UpdateLeadState = {};

export function EditLeadForm({
  leadId,
  currentStatus,
  currentNextFollowUpAt,
  currentInternalNotes,
  statuses
}: EditLeadFormProps) {
  const [state, formAction, isPending] = useActionState(updateLead, initialState);

  return (
    <form
      action={formAction}
      className="rounded-[28px] border border-white/10 bg-[#0f0f10] p-8"
    >
      <input type="hidden" name="leadId" value={leadId} />

      <h2 className="text-xl font-bold text-white">Lead bewerken</h2>
      <p className="mt-2 text-sm leading-6 text-white/65">
        Werk de status, opvolging en interne notities meteen bij na contact met de klant.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Field label="Status">
          <Select name="status" defaultValue={currentStatus}>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Volgende opvolging">
          <Input
            name="nextFollowUpAt"
            type="datetime-local"
            required
            defaultValue={currentNextFollowUpAt}
          />
        </Field>

        <Field label="Interne notities">
          <Textarea name="internalNotes" rows={6} defaultValue={currentInternalNotes} />
        </Field>
      </div>

      {state.message ? (
        <div
          className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
            state.success
              ? "border border-white/15 bg-white/10 text-white"
              : "border border-white/12 bg-white/5 text-white/80"
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