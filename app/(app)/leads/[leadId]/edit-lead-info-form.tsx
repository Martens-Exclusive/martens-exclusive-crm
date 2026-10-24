"use client";

import { useActionState, useEffect, useState } from "react";

import { completeFollowUp, updateLeadInfo, type UpdateLeadInfoState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type EditLeadInfoFormProps = {
  leadId: string;
  sourceId: string;
  assignedUserId: string;
  priority: string;
  nextFollowUpAt: string;
  lastContactedAt: string;
  sources: Array<{ id: string; name: string }>;
  users: Array<{ id: string; firstName: string; lastName: string }>;
  priorities: Array<{ value: string; label: string }>;
  // Weergave (op de server opgemaakt)
  sourceLabel: string;
  assignedUserLabel: string;
  priorityLabel: string;
  nextFollowUpLabel: string;
  lastContactedLabel: string;
  isFollowUpOverdue: boolean;
};

const initialState: UpdateLeadInfoState = {};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-black/8 pb-3">
      <p className="text-xs uppercase tracking-[0.2em] text-black/45">{label}</p>
      <p className="mt-1 text-sm font-medium text-black">{value}</p>
    </div>
  );
}

export function EditLeadInfoForm({
  leadId,
  sourceId,
  assignedUserId,
  priority,
  nextFollowUpAt,
  lastContactedAt,
  sources,
  users,
  priorities,
  sourceLabel,
  assignedUserLabel,
  priorityLabel,
  nextFollowUpLabel,
  lastContactedLabel,
  isFollowUpOverdue
}: EditLeadInfoFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateLeadInfo, initialState);

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
    }
  }, [state.success]);

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-black">Leadinformatie</h2>

        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#ececec]"
          >
            Wijzig
          </button>
        ) : null}
      </div>

      {!isEditing ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InfoRow label="Bron" value={sourceLabel} />
          <InfoRow label="Verkoper" value={assignedUserLabel} />
          <InfoRow label="Prioriteit" value={priorityLabel} />
          <InfoRow label="Laatste contact" value={lastContactedLabel} />

          <div className="border-b border-black/8 pb-3 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] text-black/45">Volgende opvolging</p>

            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-sm font-medium ${isFollowUpOverdue ? "text-red-700" : "text-black"}`}>
                {nextFollowUpLabel}
                {isFollowUpOverdue ? " • Te laat" : ""}
              </p>

              {nextFollowUpAt ? (
                <form action={completeFollowUp}>
                  <input type="hidden" name="leadId" value={leadId} />

                  <button
                    type="submit"
                    className="rounded-xl border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#ececec]"
                  >
                    Opvolging voltooid
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <form
          action={formAction}
          className="mt-4 rounded-2xl border border-black/10 bg-[#efefef] p-4 sm:p-6"
        >
          <input type="hidden" name="leadId" value={leadId} />

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Bron">
              <Select name="sourceId" defaultValue={sourceId}>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Verkoper">
              <Select name="assignedUserId" defaultValue={assignedUserId}>
                <option value="">Niet toegewezen</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Prioriteit">
              <Select name="priority" defaultValue={priority}>
                {priorities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Laatste contact" hint="Leeg laten als er nog geen contact was.">
              <Input name="lastContactedAt" type="datetime-local" defaultValue={lastContactedAt} />
            </Field>

            <Field label="Volgende opvolging" hint="Leeg laten als er geen opvolging gepland is.">
              <Input name="nextFollowUpAt" type="datetime-local" defaultValue={nextFollowUpAt} />
            </Field>
          </div>

          {state.message && !state.success ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.message}
              {state.errors
                ? Object.values(state.errors)
                    .flat()
                    .filter(Boolean)
                    .map((error) => ` ${error}`)
                : null}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Opslaan..." : "Opslaan"}
            </Button>

            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-2xl border border-black/15 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ececec]"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
