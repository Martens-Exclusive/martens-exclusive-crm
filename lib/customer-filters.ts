// Gedeelde filterlogica voor de klantenlijst en de export, zodat een export altijd
// exact de klanten bevat die op het scherm staan.
import type { Prisma } from "@prisma/client";

import { getCustomerLanguageLabel, getCustomerTypeLabel, isCustomerLanguage, isCustomerType, normalizePhoneKey } from "@/lib/customers";

export type CustomerFilters = {
  q: string;
  type: string; // "" = alle types
  language: string; // "" = alle talen
  mailing: boolean; // enkel wie een e-mailadres heeft en mailings wil ontvangen
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export function readCustomerFilters(params: RawParams): CustomerFilters {
  const type = first(params.type);
  const language = first(params.language);

  return {
    q: first(params.q).trim().slice(0, 200),
    type: isCustomerType(type) ? type : "",
    language: isCustomerLanguage(language) ? language : "",
    mailing: first(params.mailing) === "1"
  };
}

// Elk zoekwoord moet ergens voorkomen (naam, bedrijf, e-mail, telefoon, adres, notities of
// de interesse in een lead), zodat "porsche dilbeek" werkt zoals je verwacht.
export function buildCustomerWhere(filters: CustomerFilters): Prisma.CustomerWhereInput {
  const and: Prisma.CustomerWhereInput[] = [];

  for (const word of filters.q.split(/\s+/).filter(Boolean)) {
    const contains = { contains: word, mode: "insensitive" as const };
    const phoneKey = /\d{3,}/.test(word) ? normalizePhoneKey(word) ?? word.replace(/\D/g, "") : null;

    and.push({
      OR: [
        { firstName: contains },
        { lastName: contains },
        { companyName: contains },
        { email: contains },
        { email2: contains },
        { phone: contains },
        { phone2: contains },
        ...(phoneKey ? [{ phoneKey: { contains: phoneKey } }, { phone2Key: { contains: phoneKey } }] : []),
        { street: contains },
        { postalCode: contains },
        { city: contains },
        { vatNumber: contains },
        { notes: contains },
        { leads: { some: { OR: [{ interestedBrand: contains }, { interestedModel: contains }] } } },
        { storageContracts: { some: { vehicleLabel: contains } } }
      ]
    });
  }

  if (filters.type) and.push({ type: filters.type });
  if (filters.language) and.push({ language: filters.language });
  if (filters.mailing) and.push({ mailingOptOut: false, email: { not: null } });

  return and.length > 0 ? { AND: and } : {};
}

export function describeCustomerFilters(filters: CustomerFilters): string {
  const parts = [
    filters.type ? `Type: ${getCustomerTypeLabel(filters.type)}` : "",
    filters.language ? `Taal: ${getCustomerLanguageLabel(filters.language)}` : "",
    filters.mailing ? "Enkel mailbaar" : "",
    filters.q ? `Zoekterm: "${filters.q}"` : ""
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "Alle klanten";
}

// Querystring met de actieve filters (voor de export-link en tabbladen).
export function customerFiltersToSearch(filters: CustomerFilters, overrides: Partial<CustomerFilters> = {}): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.type) params.set("type", merged.type);
  if (merged.language) params.set("language", merged.language);
  if (merged.mailing) params.set("mailing", "1");
  const query = params.toString();
  return query ? `?${query}` : "";
}
