"use client";

import { useActionState, useEffect, useState } from "react";

import { updateTask, type UpdateTaskState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dateSuggestions, inDays, suggestionChipClass } from "@/lib/task-suggestions";

type EditTaskFormProps = {
  taskId: string;
  title: string;
  dueAt: string; // waarde voor een datetime-local veld
  notes: string;
  assignedUserId: string;
  users: Array<{ id: string; firstName: string; lastName: string }>;
  // Klassen voor de ingeklapte knop en het uitgeklapte formulier, zodat elke pagina ze kan schikken.
  buttonClassName?: string;
  formClassName?: string;
};

const initialState: UpdateTaskState = {};

const defaultButtonClass =
  "rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-hover";

// Knop "Wijzig" bij een open taak; klapt een formulier open om titel, datum/uur, notities en verkoper aan te passen.
export function EditTaskForm({
  taskId,
  title,
  dueAt,
  notes,
  assignedUserId,
  users,
  buttonClassName = defaultButtonClass,
  formClassName = "w-full basis-full rounded-2xl border border-black/10 bg-white p-4"
}: EditTaskFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [dueValue, setDueValue] = useState(dueAt);
  const [state, formAction, isPending] = useActionState(updateTask, initialState);

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
    }
  }, [state]);

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDueValue(dueAt);
          setIsEditing(true);
        }}
        className={buttonClassName}
      >
        Wijzigen
      </button>
    );
  }

  return (
    <form action={formAction} className={formClassName}>
      <input type="hidden" name="taskId" value={taskId} />

      <div className="flex flex-col gap-4">
        <Field label="Wat moet er gebeuren?">
          <Input name="title" defaultValue={title} required />
        </Field>

        <Field label="Wanneer?">
          <Input
            name="dueAt"
            type="datetime-local"
            value={dueValue}
            onChange={(event) => setDueValue(event.target.value)}
            required
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {dateSuggestions.map((suggestion) => {
              const value = inDays(suggestion.days);

              return (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => setDueValue(value)}
                  className={suggestionChipClass(dueValue === value)}
                >
                  {suggestion.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Notities">
          <Textarea name="notes" rows={3} defaultValue={notes} />
        </Field>

        {users.length > 1 ? (
          <Field label="Verkoper">
            <Select name="assignedUserId" defaultValue={assignedUserId}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="assignedUserId" value={assignedUserId} />
        )}
      </div>

      {state.message && !state.success ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
          {state.errors
            ? Object.values(state.errors)
                .flat()
                .filter(Boolean)
                .map((error) => ` ${error}`)
            : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Opslaan..." : "Wijzigingen opslaan"}
        </Button>

        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-sm font-semibold text-black/60 transition hover:text-black"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
