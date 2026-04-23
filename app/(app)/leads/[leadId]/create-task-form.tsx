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
      className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      <input type="hidden" name="leadId" value={leadId} />

      <h2 className="text-xl font-bold text-black">Taak toevoegen</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
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
          {isPending ? "Taak wordt opgeslagen..." : "Taak opslaan"}
        </Button>
      </div>
    </form>
  );
}