"use client";

import { useActionState, useEffect, useState } from "react";

import { updateAppointment, type UpdateAppointmentState } from "../actions";
import { appointmentTypes } from "./create-appointment-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type EditAppointmentFormProps = {
  appointmentId: string;
  type: string;
  scheduledAt: string;
  vehicleId: string;
  notes: string;
  leadVehicleLabel: string;
  vehicles: {
    id: string;
    brand: string;
    model: string;
    variant: string | null;
    stockNumber: string;
  }[];
};

const initialState: UpdateAppointmentState = {};

// Knop "Wijzig" bij een afspraak; klapt een formulier open om type, datum/uur, wagen en notities aan te passen.
export function EditAppointmentForm({
  appointmentId,
  type,
  scheduledAt,
  vehicleId,
  notes,
  leadVehicleLabel,
  vehicles
}: EditAppointmentFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateAppointment, initialState);

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
    }
  }, [state.success]);

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-hover"
      >
        Afspraak wijzigen
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full basis-full rounded-2xl border border-black/10 bg-white p-4"
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />

      <div className="flex flex-col gap-4">
        <Field label="Type afspraak">
          <Select name="type" defaultValue={type}>
            {appointmentTypes.map((appointmentType) => (
              <option key={appointmentType.value} value={appointmentType.value}>
                {appointmentType.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Datum en tijd">
          <Input name="scheduledAt" type="datetime-local" defaultValue={scheduledAt} required />
        </Field>

        <Field label="Wagen">
          <Select name="vehicleId" defaultValue={vehicleId}>
            <option value="">
              {leadVehicleLabel
                ? `Zoals bij de lead: ${leadVehicleLabel}`
                : "Geen wagen bij de lead ingevuld"}
            </option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {[vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(" ")} (
                {vehicle.stockNumber})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Notities">
          <Textarea name="notes" rows={3} defaultValue={notes} />
        </Field>
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
