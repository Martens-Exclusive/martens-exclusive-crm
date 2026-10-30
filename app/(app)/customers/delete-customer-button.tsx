"use client";

import { useActionState } from "react";

import { deleteCustomer, type DeleteCustomerState } from "./actions";

const initialState: DeleteCustomerState = {};

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const [state, formAction, isPending] = useActionState(deleteCustomer, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Deze klant definitief verwijderen? Dit kan niet ongedaan gemaakt worden.")) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-start gap-2"
    >
      <input type="hidden" name="customerId" value={customerId} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
      >
        {isPending ? "Bezig met verwijderen..." : "Definitief verwijderen"}
      </button>
      {state.message ? <p className="text-sm text-red-700">{state.message}</p> : null}
    </form>
  );
}
