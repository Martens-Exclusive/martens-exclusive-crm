"use client";

import { useActionState } from "react";

import { deleteVehicle, type DeleteVehicleState } from "./actions";

const initialState: DeleteVehicleState = {};

export function DeleteVehicleButton({ vehicleId }: { vehicleId: string }) {
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
      <button
        type="submit"
        disabled={isPending}
        className="rounded-2xl border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-60"
      >
        {isPending ? "Wagen wordt verwijderd..." : "Verwijderen"}
      </button>
      {state.message ? <p className="text-sm text-red-300">{state.message}</p> : null}
    </form>
  );
}
