"use client";

import { useActionState, useState } from "react";

import { createTask, type CreateTaskState } from "../actions";
import { useFormShell } from "./fiche-actions";
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

// Snelkeuzes. De titel blijft vrij in te vullen, dit zijn enkel veelgebruikte voorbeelden.
const titleSuggestions = [
  "Terugbellen",
  "Offerte opvolgen",
  "Offerte opmaken",
  "Testrit inplannen",
  "Documenten opvragen",
  "Prijs bespreken",
  "Foto's of info doorsturen"
];

const dateSuggestions = [
  { label: "Morgen", days: 1 },
  { label: "Over 3 dagen", days: 3 },
  { label: "Over 1 week", days: 7 },
  { label: "Over 2 weken", days: 14 }
];

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Een dag in de toekomst, om 9 uur 's ochtends.
function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);

  return toLocalInputValue(date);
}

const chipClass = (active: boolean) =>
  `rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
    active ? "border-black bg-black text-white" : "border-black/15 bg-raised text-black hover:bg-hover2"
  }`;

export function CreateTaskForm({
  leadId,
  users,
  defaultAssignedUserId
}: CreateTaskFormProps) {
  const [state, formAction, isPending] = useActionState(createTask, initialState);
  const shellClass = useFormShell(state);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");

  return (
    <form
      action={formAction}
      className={shellClass}
    >
      <input type="hidden" name="leadId" value={leadId} />

      <h2 className="text-xl font-bold text-black">Taak toevoegen</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        Voeg een praktische opvolgtaak toe voor deze lead.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Field label="Wat moet er gebeuren?">
          <Input
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Bv. Terugbellen, of vrij in te vullen"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {titleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setTitle(suggestion)}
                className={chipClass(title === suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Wanneer?">
          <Input
            name="dueAt"
            type="datetime-local"
            required
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {dateSuggestions.map((suggestion) => {
              const value = inDays(suggestion.days);

              return (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => setDueAt(value)}
                  className={chipClass(dueAt === value)}
                >
                  {suggestion.label}
                </button>
              );
            })}
          </div>
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