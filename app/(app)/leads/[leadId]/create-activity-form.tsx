"use client";

import { useActionState } from "react";

import { createActivity, type CreateActivityState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CreateActivityFormProps = {
  leadId: string;
};

const initialState: CreateActivityState = {};

const activityTypes = [
  { value: "PHONE_CALL", label: "Contact gehad via telefoon" },
  { value: "EMAIL", label: "Contact gehad via mail" },
  { value: "SMS", label: "Contact gehad via sms" },
  { value: "WHATSAPP", label: "Contact gehad via WhatsApp" },
  { value: "SHOWROOM_VISIT", label: "Showroombezoek" },
  { value: "INTERNAL_NOTE", label: "Interne update" }
] as const;

function getNowDateTimeLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function CreateActivityForm({ leadId }: CreateActivityFormProps) {
  const [state, formAction, isPending] = useActionState(createActivity, initialState);

  return (
    <form
      action={formAction}
      className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      <input type="hidden" name="leadId" value={leadId} />

      <h2 className="text-xl font-bold text-black">Contactmoment registreren</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        Voeg een overzichtelijke update toe van elk contact met deze klant.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Field label="Datum en uur">
          <Input
            name="occurredAt"
            type="datetime-local"
            required
            defaultValue={getNowDateTimeLocal()}
          />
        </Field>

        <Field label="Type contact">
          <Select name="type" defaultValue="PHONE_CALL">
            {activityTypes.map((activityType) => (
              <option key={activityType.value} value={activityType.value}>
                {activityType.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Interne notitie">
          <Textarea
            name="details"
            rows={5}
            placeholder="Wat werd besproken, afgesproken of opgemerkt?"
            required
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
          {isPending ? "Activiteit wordt opgeslagen..." : "Activiteit opslaan"}
        </Button>
      </div>
    </form>
  );
}