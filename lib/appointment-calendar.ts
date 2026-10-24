// Agenda-export voor afspraken: .ics-bestand (Apple Agenda, Outlook, Google) en Outlook-online link.
//
// Let op: de afspraken worden opgeslagen zoals ze in het formulier getypt worden (datetime-local),
// en de pagina toont ze met dezelfde klok. Daarom gebruiken we hier ook die "muurklok" en sturen we
// een tijd zonder tijdzone mee. De agenda zet die automatisch om naar de tijdzone van de gebruiker.

type VehicleInfo = {
  brand: string;
  model: string;
  variant: string | null;
  stockNumber: string;
};

export type CalendarAppointment = {
  id: string;
  type: string;
  scheduledAt: Date;
  notes: string | null;
  vehicle?: VehicleInfo | null;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    primaryVehicle?: VehicleInfo | null;
    interestedBrand?: string | null;
    interestedModel?: string | null;
  };
};

function formatVehicle(vehicle: VehicleInfo) {
  return [vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
}

// Wagen van de lead: de gekoppelde stockwagen, anders het merk/model waarvoor de lead interesse heeft.
export function getLeadVehicleLabel(lead: CalendarAppointment["lead"]) {
  if (lead.primaryVehicle) return formatVehicle(lead.primaryVehicle);

  return [lead.interestedBrand, lead.interestedModel].filter(Boolean).join(" ");
}

// Wagen van de afspraak: een apart gekozen wagen, anders die van de lead.
export function getAppointmentVehicleLabel(appointment: CalendarAppointment) {
  if (appointment.vehicle) return formatVehicle(appointment.vehicle);

  return getLeadVehicleLabel(appointment.lead);
}

function getAppointmentStockNumber(appointment: CalendarAppointment) {
  return (appointment.vehicle ?? appointment.lead.primaryVehicle)?.stockNumber ?? "";
}

export type CalendarEvent = {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  description: string;
  location: string;
};

const SHOWROOM_LOCATION = "Martens Exclusive, Sint-Kwintens-Lennik";

export function getAppointmentTypeLabel(type: string) {
  if (type === "SHOWROOM_VISIT") return "Showroombezoek";
  if (type === "TEST_DRIVE") return "Testrit";
  if (type === "PHONE_CALL") return "Telefonische afspraak";
  return type;
}

function getDurationMinutes(type: string) {
  return type === "PHONE_CALL" ? 30 : 60;
}

export function getCalendarEvent(appointment: CalendarAppointment, origin: string): CalendarEvent {
  const { lead } = appointment;
  const name = `${lead.firstName} ${lead.lastName}`.trim();
  const start = appointment.scheduledAt;
  const end = new Date(start.getTime() + getDurationMinutes(appointment.type) * 60_000);

  const vehicleLabel = getAppointmentVehicleLabel(appointment);
  const stockNumber = getAppointmentStockNumber(appointment);

  const lines = [
    vehicleLabel ? `Wagen: ${vehicleLabel}${stockNumber ? ` (stocknr. ${stockNumber})` : ""}` : "",
    lead.phone ? `Gsm: ${lead.phone}` : "",
    lead.email ? `E-mail: ${lead.email}` : "",
    appointment.notes ? `Notities: ${appointment.notes}` : "",
    `Lead in CRM: ${origin}/leads/${lead.id}`
  ].filter(Boolean);

  return {
    uid: `${appointment.id}@martens-exclusive.be`,
    title: `${getAppointmentTypeLabel(appointment.type)}${vehicleLabel ? ` ${vehicleLabel}` : ""} - ${name}`,
    start,
    end,
    description: lines.join("\n"),
    location: appointment.type === "PHONE_CALL" ? "" : SHOWROOM_LOCATION
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

function wallClock(date: Date) {
  return {
    date: `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
    time: `${pad(date.getHours())}${pad(date.getMinutes())}00`
  };
}

function utcStamp(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,");
}

// Regels langer dan 75 bytes moeten gesplitst worden (RFC 5545).
function fold(line: string) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  const limit = (first: boolean) => (first ? 75 : 74);

  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8");
    if (currentBytes + size > limit(parts.length === 0)) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  if (current) parts.push(current);

  return parts.join("\r\n ");
}

export function buildIcs(event: CalendarEvent, now = new Date()) {
  const start = wallClock(event.start);
  const end = wallClock(event.end);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Martens Exclusive//CRM//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${start.date}T${start.time}`,
    `DTEND:${end.date}T${end.time}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : "",
    `DESCRIPTION:${escapeText(event.description)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(event.title)}`,
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean);

  return lines.map(fold).join("\r\n") + "\r\n";
}

// Opent een voorgevulde nieuwe afspraak in Outlook op het web (Microsoft 365).
export function buildOutlookWebUrl(event: CalendarEvent) {
  const iso = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}:00`;

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: iso(event.start),
    enddt: iso(event.end),
    body: event.description,
    location: event.location
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}
