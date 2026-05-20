import { cancelAppointment, completeAppointment } from "../actions";

type AppointmentStatusButtonsProps = {
  appointmentId: string;
  status: string;
};

export function AppointmentStatusButtons({
  appointmentId,
  status
}: AppointmentStatusButtonsProps) {
  if (status === "COMPLETED" || status === "CANCELLED") {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <form action={completeAppointment}>
        <input type="hidden" name="appointmentId" value={appointmentId} />

        <button
          type="submit"
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#ececec]"
        >
          Afspraak afronden
        </button>
      </form>

      <form action={cancelAppointment}>
        <input type="hidden" name="appointmentId" value={appointmentId} />

        <button
          type="submit"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
        >
          Afspraak annuleren
        </button>
      </form>
    </div>
  );
}