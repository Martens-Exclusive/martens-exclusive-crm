import { Prisma } from "@prisma/client";

import { leadPriorityLabels, leadStatusLabels, type LeadPriority, type LeadStatus } from "@/lib/lead-status";

export type LeadListFilters = {
  q?: string;
  status?: string;
  priority?: string;
  assignedUserId?: string;
  openOnly?: boolean;
};

/**
 * Bouwt de Prisma where-clause voor de leadlijst. Verloren leads blijven
 * standaard uit het overzicht zodat het overzichtelijk blijft — enkel als er
 * expliciet een status gekozen is (ook als dat "Verloren" is), of als er
 * helemaal geen status/openOnly-filter actief is en er toch status gezet moet
 * worden, tonen we exact wat gevraagd wordt.
 */
export function buildLeadWhere(filters: LeadListFilters): Prisma.LeadWhereInput {
  const query = filters.q?.trim() || "";
  const status = filters.status || "";
  const priority = filters.priority || "";
  const assignedUserId = filters.assignedUserId || "";
  const openOnly = Boolean(filters.openOnly);

  const statusFilter: Prisma.LeadWhereInput["status"] = status
    ? status
    : openOnly
      ? { notIn: ["WON", "LOST"] }
      : { not: "LOST" };

  return {
    ...(query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } }
          ]
        }
      : {}),
    status: statusFilter,
    ...(priority ? { priority } : {}),
    ...(assignedUserId ? { assignedUserId } : {})
  };
}

/**
 * Leesbare samenvatting van de actieve filters, voor gebruik als ondertitel
 * bv. boven een PDF-export van het leadoverzicht.
 */
export function describeLeadFilters(
  filters: LeadListFilters,
  assignedUserLabel?: string
): string {
  const parts: string[] = [];

  if (filters.status) {
    parts.push(`Status: ${leadStatusLabels[filters.status as LeadStatus] ?? filters.status}`);
  }

  if (filters.priority) {
    parts.push(
      `Prioriteit: ${leadPriorityLabels[filters.priority as LeadPriority] ?? filters.priority}`
    );
  }

  if (filters.assignedUserId) {
    parts.push(`Verkoper: ${assignedUserLabel ?? "gefilterd"}`);
  }

  if (filters.openOnly) {
    parts.push("Enkel open leads");
  }

  if (filters.q) {
    parts.push(`Zoekterm: "${filters.q}"`);
  }

  if (parts.length === 0) {
    parts.push("Standaardweergave — verloren leads niet meegeteld");
  }

  return parts.join(" · ");
}
