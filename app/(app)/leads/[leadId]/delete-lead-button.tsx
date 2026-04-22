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
      className="rounded-[28px] border border-red-400/20 bg-[#0f0f10] p-8"
    >
      <input type="hidden" name="leadId" value={leadId} />

      <h2 className="text-xl font-bold text-white">Lead verwijderen</h2>
      <p className="mt-2 text-sm leading-6 text-white/65">
        Deze actie is alleen beschikbaar voor verloren leads en verwijdert de lead definitief uit de databank.
      </p>

      {state.message ? (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.message}
        </div>
      ) : null}

      <div className="mt-8">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl border border-red-400/30 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-60"
        >
          {isPending ? "Lead wordt verwijderd..." : "Lead verwijderen"}
        </button>
      </div>
    </form>
  );
}
