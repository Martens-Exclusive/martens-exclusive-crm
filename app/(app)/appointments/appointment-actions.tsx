"use client";

import { completeAppointment, deleteAppointment } from "../leads/actions";

type AppointmentActionsProps = {
  appointmentId: string;
  status: string;
};

export function AppointmentActions({
  appointmentId,
  status
}: AppointmentActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "COMPLETED" ? (
        <form action={completeAppointment}>
          <input type="hidden" name="appointmentId" value={appointmentId} />

          <button
            type="submit"
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#ececec]"
          >
            Voltooid
          </button>
        </form>
      ) : null}

      <form
        action={deleteAppointment}
        onSubmit={(event) => {
          if (!window.confirm("Deze afspraak definitief verwijderen?")) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="appointmentId" value={appointmentId} />

        <button
          type="submit"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
        >
          Verwijderen
        </button>
      </form>
    </div>
  );
}
