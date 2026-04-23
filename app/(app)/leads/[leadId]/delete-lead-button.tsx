"use client";

import { useActionState } from "react";

import { deleteLead, type DeleteLeadState } from "../actions";

const initialState: DeleteLeadState = {};

export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [state, formAction, isPending] = useActionState(deleteLead, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Weet je zeker dat je deze verloren lead definitief wilt verwijderen?")) {
          event.preventDefault();
        }
      }}
      className="rounded-[28px] border border-red-200 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      <input type="hidden" name="leadId" value={leadId} />

      <h2 className="text-xl font-bold text-black">Lead verwijderen</h2>

      <p className="mt-2 text-sm leading-6 text-black/70">
        Deze actie is alleen beschikbaar voor verloren leads en verwijdert de lead definitief uit de databank.
      </p>

      {state.message ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      ) : null}

      <div className="mt-8">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
        >
          {isPending ? "Lead wordt verwijderd..." : "Lead verwijderen"}
        </button>
      </div>
    </form>
  );
}