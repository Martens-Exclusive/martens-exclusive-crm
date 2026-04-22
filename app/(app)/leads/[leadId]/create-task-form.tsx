"use client";

import { useActionState } from "react";

import { createTask, type CreateTaskState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CreateTaskFormProps = {
  leadId: string;
  users: Array<{ id: string; firstName: string; lastName: string }>;
  defaultAssignedUserId: string;
};

const initialState: CreateTaskState = {};

export function CreateTaskForm({
  leadId,
  users,
  defaultAssignedUserId
}: CreateTaskFormProps) {
  const [state, formAction, isPending] = useActionState(createTask, initialState);

  return (
    <form
      action={formAction}
      className="rounded-[28px] border border-white/10 bg-[#0f0f10] p-8"
    >
      <input type="hidden" name="leadId" value={leadId} />

      <h2 className="text-xl font-bold text-white">Taak toevoegen</h2>
      <p className="mt-2 text-sm leading-6 text-white/65">
        Voeg een praktische opvolgtaak toe voor deze lead.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Field label="Titel">
          <Input name="title" required />
        </Field>

        <Field label="Vervaldatum">
          <Input name="dueAt" type="datetime-local" required />
        </Field>

        <Field label="Verkoper">
          <Select name="assignedUserId" defaultValue={defaultAssignedUserId}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status">
          <Input value="Open" disabled />
        </Field>

        <Field label="Notities">
          <Textarea name="notes" rows={4} />
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
          {isPending ? "Taak wordt opgeslagen..." : "Taak opslaan"}
        </Button>
      </div>
    </form>
  );
}