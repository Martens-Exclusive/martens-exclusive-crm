"use client";

import { useActionState } from "react";

import { deleteVehicle, type DeleteVehicleState } from "./actions";

const initialState: DeleteVehicleState = {};

export function DeleteVehicleButton({
  vehicleId,
  tab = "active"
}: {
  vehicleId: string;
  tab?: "active" | "archive";
}) {
  const [state, formAction, isPending] = useActionState(deleteVehicle, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Weet je zeker dat je deze wagen definitief wilt verwijderen?")) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-start gap-2"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="tab" value={tab} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
      >
        {isPending ? "Wagen wordt verwijderd..." : "Verwijderen"}
      </button>
      {state.message ? <p className="text-sm text-red-700">{state.message}</p> : null}
    </form>
  );
}
