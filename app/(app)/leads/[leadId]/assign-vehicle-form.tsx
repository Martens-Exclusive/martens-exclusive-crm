"use client";

import { useActionState } from "react";

import { assignVehicle, type AssignVehicleState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

type AssignVehicleFormProps = {
  leadId: string;
  currentVehicleId: string | null;
  vehicles: Array<{
    id: string;
    brand: string;
    model: string;
    variant: string | null;
    stockNumber: string;
  }>;
};

const initialState: AssignVehicleState = {};

export function AssignVehicleForm({
  leadId,
  currentVehicleId,
  vehicles
}: AssignVehicleFormProps) {
  const [state, formAction, isPending] = useActionState(assignVehicle, initialState);

  return (
    <form
      action={formAction}
      className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      <input type="hidden" name="leadId" value={leadId} />

      <h2 className="text-xl font-bold text-black">Wagen koppelen</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        Koppel of wijzig de wagen die voor deze lead relevant is.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Field label="Wagen uit stock">
          <Select name="vehicleId" defaultValue={currentVehicleId || ""}>
            <option value="">Geen wagen gekoppeld</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.brand} {vehicle.model}
                {vehicle.variant ? ` ${vehicle.variant}` : ""} ({vehicle.stockNumber})
              </option>
            ))}
          </Select>
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
          {isPending ? "Wagen wordt opgeslagen..." : "Wagen opslaan"}
        </Button>
      </div>
    </form>
  );
}