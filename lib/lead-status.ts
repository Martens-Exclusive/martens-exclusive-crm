export const leadStatuses = [
  "NEW",
  "CONTACT_ATTEMPTED",
  "CONTACTED",
  "QUALIFIED",
  "APPOINTMENT_SCHEDULED",
  "SHOWROOM_VISITED",
  "TEST_DRIVE_DONE",
  "OFFER_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "NURTURE"
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: "Nieuw",
  CONTACT_ATTEMPTED: "Contact geprobeerd",
  CONTACTED: "Contact gelegd",
  QUALIFIED: "Gekwalificeerd",
  APPOINTMENT_SCHEDULED: "Afspraak ingepland",
  SHOWROOM_VISITED: "Showroom bezocht",
  TEST_DRIVE_DONE: "Testrit gedaan",
  OFFER_SENT: "Offerte verstuurd",
  NEGOTIATION: "Onderhandeling",
  WON: "Gewonnen",
  LOST: "Verloren",
  NURTURE: "Opvolging later"
};

export const leadPriorities = ["LOW", "NORMAL", "HIGH", "HOT"] as const;

export type LeadPriority = (typeof leadPriorities)[number];

export const leadPriorityLabels: Record<LeadPriority, string> = {
  LOW: "Laag",
  NORMAL: "Normaal",
  HIGH: "Hoog",
  HOT: "Warm"
};
