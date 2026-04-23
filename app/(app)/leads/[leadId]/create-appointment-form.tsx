"use client";

import { useActionState } from "react";

import { createAppointment, type CreateAppointmentState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CreateAppointmentFormProps = {
  leadId: string;
};

const initialState: CreateAppointmentState = {};

const appointmentTypes = [
  { value: "SHOWROOM_VISIT", label: "Showroombezoek" },
  { value: "TEST_DRIVE", label: "Testrit" },
  { value: "PHONE_CALL", label: "Telefonische afspraak" }
] as const;

export function CreateAppointmentForm({ leadId }: CreateAppointmentFormProps) {
  const [state, formAction, isPending] = useActionState(createAppointment, initialState);

  return (
    <form
      action={formAction}
      className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      <input type="hidden" name="leadId" value={leadId} />

      <h2 className="text-xl font-bold text-black">Afspraak toevoegen</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        Plan een afspraak voor deze lead en houd alles centraal in je CRM.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Field label="Type afspraak">
          <Select name="type" defaultValue="SHOWROOM_VISIT">
            {appointmentTypes.map((appointmentType) => (
              <option key={appointmentType.value} value={appointmentType.value}>
                {appointmentType.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Datum en tijd">
          <Input name="scheduledAt" type="datetime-local" required />
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
          {isPending ? "Afspraak wordt opgeslagen..." : "Afspraak opslaan"}
        </Button>
      </div>
    </form>
  );
}