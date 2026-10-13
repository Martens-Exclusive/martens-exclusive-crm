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
 * Een telefoonnummer wordt op meerdere manieren geschreven (0489 78 81 49,
 * +32 489 78 81 49, 0489788149). Daarom zoeken we naast het woord zoals
 * ingetypt ook op de cijfers ervan, en zonder landcode of beginnul.
 */
function phoneSearchVariants(word: string): string[] {
  const variants = new Set<string>([word]);
  const digits = word.replace(/[^\d]/g, "");

  if (digits.length >= 4) {
    variants.add(digits);
    variants.add(digits.replace(/^(0032|32|0)/, ""));
  }

  return [...variants].filter(Boolean);
}

/**
 * Zoekterm → where-clause. Elk woord moet ergens in de lead voorkomen, maar
 * mag in een ander veld staan: "Peeters Lennik" vindt dus Jan Peeters uit
 * Lennik, en "Lange Eikstraat 84" vindt het adres.
 */
function buildLeadSearchWhere(query: string): Prisma.LeadWhereInput {
  const words = query.split(/\s+/).filter(Boolean).slice(0, 8);
  const like = (word: string) => ({ contains: word, mode: "insensitive" as const });

  return {
    AND: words.map((word) => ({
      OR: [
        // Alles wat in het leadformulier kan staan: contactgegevens, adres,
        // interesse, berichten en notities.
        { firstName: like(word) },
        { lastName: like(word) },
        { companyName: like(word) },
        { vatNumber: like(word) },
        { phone: like(word) },
        { email: like(word) },
        { street: like(word) },
        { houseNumber: like(word) },
        { postalCode: like(word) },
        { city: like(word) },
        { country: like(word) },
        { interestedBrand: like(word) },
        { interestedModel: like(word) },
        { budgetNotes: like(word) },
        { customerMessage: like(word) },
        { internalNotes: like(word) },
        { lostNotes: like(word) },
        ...phoneSearchVariants(word).map((variant) => ({ phone: like(variant) })),
        { source: { is: { name: like(word) } } },
        {
          primaryVehicle: {
            is: {
              OR: [
                { brand: like(word) },
                { model: like(word) },
                { stockNumber: like(word) },
                { vin: like(word) }
              ]
            }
          }
        }
      ]
    }))
  };
}

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

  // Zoek je iets (zonder expliciete statuskeuze),
  // dan tonen we ook verloren leads: een zoekopdracht moet iemand altijd vinden.
  const statusFilter: Prisma.LeadWhereInput["status"] | undefined = status
    ? status
    : openOnly
      ? { notIn: ["WON", "LOST"] }
      : query
        ? undefined
        : { not: "LOST" };

  return {
    ...(query ? buildLeadSearchWhere(query) : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
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
