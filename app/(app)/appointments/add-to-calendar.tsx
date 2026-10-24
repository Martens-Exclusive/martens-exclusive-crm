import {
  buildOutlookWebUrl,
  getCalendarEvent,
  type CalendarAppointment
} from "@/lib/appointment-calendar";

type AddToCalendarProps = {
  appointment: CalendarAppointment;
  origin: string;
};

const linkClass =
  "rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#ececec]";

export function AddToCalendar({ appointment, origin }: AddToCalendarProps) {
  const event = getCalendarEvent(appointment, origin);

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/api/appointments/${appointment.id}/ics`} className={linkClass}>
        Apple Agenda / Outlook
      </a>
      <a
        href={buildOutlookWebUrl(event)}
        target="_blank"
        rel="noreferrer"
        className={linkClass}
      >
        Outlook online
      </a>
    </div>
  );
}
