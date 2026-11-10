import { getAppointmentTypeLabel } from "@/lib/appointment-calendar";
import {
  leadPriorityLabels,
  leadStatusLabels,
  type LeadPriority,
  type LeadStatus
} from "@/lib/lead-status";

// Contactmomenten die Jannick zelf registreert; die krijgen in de tijdlijn de meeste aandacht.
export const contactTypes = ["PHONE_CALL", "EMAIL", "SMS", "WHATSAPP", "SHOWROOM_VISIT"] as const;

export type TimelineKind = "contact" | "note" | "system";

export type TimelineItem = {
  id: string;
  kind: TimelineKind;
  type: string;
  title: string;
  details: string | null;
  dayLabel: string;
  timeLabel: string;
  userName: string | null;
};

export type TimelineData = {
  items: TimelineItem[];
  contactCount: number;
  lastContact: {
    channel: string;
    agoLabel: string;
    dateLabel: string;
  } | null;
};

type ActivityInput = {
  id: string;
  type: string;
  summary: string;
  details: string | null;
  occurredAt: Date;
  user: { firstName: string; lastName: string } | null;
};

export const contactLabels: Record<string, string> = {
  PHONE_CALL: "Telefoon",
  EMAIL: "E-mail",
  SMS: "Sms",
  WHATSAPP: "WhatsApp",
  SHOWROOM_VISIT: "Showroombezoek"
};

const dayFormatter = new Intl.DateTimeFormat("nl-BE", { dateStyle: "long" });
const shortDayFormatter = new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium" });
const timeFormatter = new Intl.DateTimeFormat("nl-BE", { timeStyle: "short" });

// De datum/uren van contactmomenten worden opgeslagen zoals ze getypt worden ("muurklok").
// Daarom vergelijken we met de huidige muurklok in Brussel, niet met de servertijd.
function brusselsNow(now: Date) {
  const text = now.toLocaleString("sv-SE", { timeZone: "Europe/Brussels" }).replace(" ", "T");

  return new Date(text);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(later: Date, earlier: Date) {
  return Math.round((startOfDay(later).getTime() - startOfDay(earlier).getTime()) / 86_400_000);
}

function getDayLabel(date: Date, wallNow: Date) {
  const diff = daysBetween(wallNow, date);

  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Gisteren";

  return dayFormatter.format(date);
}

function getAgoLabel(date: Date, wallNow: Date) {
  const diff = daysBetween(wallNow, date);

  if (diff <= 0) return "vandaag";
  if (diff === 1) return "gisteren";

  return `${diff} dagen geleden`;
}

// Technische codes in systeemmeldingen omzetten naar leesbaar Nederlands.
function humanize(text: string) {
  let result = text;

  for (const [code, label] of Object.entries(leadStatusLabels as Record<LeadStatus, string>)) {
    result = result.replace(new RegExp(`\\b${code}\\b`, "g"), label);
  }

  for (const [code, label] of Object.entries(leadPriorityLabels as Record<LeadPriority, string>)) {
    result = result.replace(new RegExp(`\\b${code}\\b`, "g"), label.toLowerCase());
  }

  for (const code of ["SHOWROOM_VISIT", "TEST_DRIVE", "PHONE_CALL", "DELIVERY"]) {
    result = result.replace(new RegExp(`\\b${code}\\b`, "g"), getAppointmentTypeLabel(code).toLowerCase());
  }

  return result;
}

export function buildTimeline(activities: ActivityInput[], now: Date): TimelineData {
  const wallNow = brusselsNow(now);

  const items: TimelineItem[] = activities.map((activity) => {
    const isContact = (contactTypes as readonly string[]).includes(activity.type);
    const isNote =
      activity.type === "INTERNAL_NOTE" || activity.summary === "Interne notities bijgewerkt";
    const kind: TimelineKind = isContact ? "contact" : isNote ? "note" : "system";

    let title = isContact
      ? (contactLabels[activity.type] ?? activity.summary)
      : isNote
        ? "Notitie"
        : humanize(activity.summary);
    let details = activity.details
      ? kind === "system"
        ? humanize(activity.details)
        : activity.details
      : null;

    // Zegt de uitleg hetzelfde als de titel ("Taak voltooid: ..."), dan tonen we enkel de uitleg.
    if (kind === "system" && details && details.toLowerCase().startsWith(title.toLowerCase())) {
      title = details.replace(/\.$/, "");
      details = null;
    }

    return {
      id: activity.id,
      kind,
      type: activity.type,
      title,
      details,
      dayLabel: getDayLabel(activity.occurredAt, wallNow),
      timeLabel: timeFormatter.format(activity.occurredAt),
      userName: activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : null
    };
  });

  const contacts = activities.filter((activity) =>
    (contactTypes as readonly string[]).includes(activity.type)
  );
  const latest = contacts.reduce<ActivityInput | null>(
    (best, activity) => (!best || activity.occurredAt > best.occurredAt ? activity : best),
    null
  );

  return {
    items,
    contactCount: contacts.length,
    lastContact: latest
      ? {
          channel: contactLabels[latest.type] ?? latest.summary,
          agoLabel: getAgoLabel(latest.occurredAt, wallNow),
          dateLabel: shortDayFormatter.format(latest.occurredAt)
        }
      : null
  };
}
