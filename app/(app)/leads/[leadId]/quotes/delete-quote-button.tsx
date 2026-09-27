"use client";

import { deleteQuote } from "./actions";

/**
 * Verwijdert één offerte/bestelbon uit het overzicht op de leadfiche.
 * Gebruikt de bestaande deleteQuote-server action (die na verwijderen terug
 * naar de leadfiche stuurt), met een bevestigingsvraag zodat het overzicht
 * van de overige documenten niet per ongeluk verloren gaat.
 */
export function DeleteQuoteButton({
  quoteId,
  leadId,
  typeLabel
}: {
  quoteId: string;
  leadId: string;
  typeLabel: string;
}) {
  return (
    <form
      action={deleteQuote}
      onSubmit={(event) => {
        if (!window.confirm(`Deze ${typeLabel.toLowerCase()} definitief verwijderen?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
      >
        Verwijderen
      </button>
    </form>
  );
}
