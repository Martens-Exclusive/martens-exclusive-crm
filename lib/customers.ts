// Klantenbestand: vaste gegevens, normalisatie en koppellogica op één plek, zodat
// klantenlijst, klantfiche, leads, Car Storage en de export exact hetzelfde doen.
import type { Prisma } from "@prisma/client";

export const CUSTOMER_TYPES = [
  { value: "CUSTOMER", label: "Klant" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "RELATION", label: "Relatie" }
] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number]["value"];

export const CUSTOMER_TYPE_VALUES = CUSTOMER_TYPES.map((item) => item.value) as [
  CustomerType,
  ...CustomerType[]
];

export const CUSTOMER_LANGUAGES = [
  { value: "NL", label: "Nederlands" },
  { value: "FR", label: "Frans" },
  { value: "EN", label: "Engels" },
  { value: "DE", label: "Duits" }
] as const;

export type CustomerLanguage = (typeof CUSTOMER_LANGUAGES)[number]["value"];

export const CUSTOMER_LANGUAGE_VALUES = CUSTOMER_LANGUAGES.map((item) => item.value) as [
  CustomerLanguage,
  ...CustomerLanguage[]
];

export function getCustomerTypeLabel(type: string): string {
  return CUSTOMER_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function getCustomerLanguageLabel(language: string): string {
  return CUSTOMER_LANGUAGES.find((item) => item.value === language)?.label ?? language;
}

export function isCustomerType(value: string): value is CustomerType {
  return CUSTOMER_TYPE_VALUES.includes(value as CustomerType);
}

export function isCustomerLanguage(value: string): value is CustomerLanguage {
  return CUSTOMER_LANGUAGE_VALUES.includes(value as CustomerLanguage);
}

// Naam zoals ze overal getoond wordt: persoon, anders bedrijf, anders e-mail.
export function getCustomerName(customer: {
  firstName: string | null;
  lastName: string | null;
  companyName?: string | null;
  email?: string | null;
}): string {
  const person = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  return person || customer.companyName || customer.email || "Naamloze klant";
}

// ---------------------------------------------------------------------------
// Normalisatie
// ---------------------------------------------------------------------------

export function normalizeEmail(value: string | null | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();
  return email || null;
}

// Zet elke schrijfwijze om naar het Belgische nationale formaat, enkel cijfers:
// "+32 474 32 55 04", "0032474325504", "0474/32.55.04", "474325504" → "0474325504".
// Te korte nummers geven null (niet bruikbaar om te koppelen).
export function normalizePhoneKey(value: string | null | undefined): string | null {
  let digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("32") && digits.length >= 10) digits = `0${digits.slice(2).replace(/^0/, "")}`;
  if (!digits.startsWith("0") && digits.length === 9) digits = `0${digits}`;

  return digits.length >= 9 ? digits : null;
}

// Leesbare weergave: Belgische gsm "0474 32 55 04", vaste lijn met zone 02/03/04/09 "02 537 86 48",
// andere vaste lijnen "053 12 34 56". Buitenlandse of onbekende nummers blijven zoals ingegeven.
export function formatPhone(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  const key = normalizePhoneKey(raw);
  const isForeign = /^(\+|00)(?!32)/.test(raw);
  if (!key || isForeign) return raw;

  if (/^04\d{8}$/.test(key)) return `${key.slice(0, 4)} ${key.slice(4, 6)} ${key.slice(6, 8)} ${key.slice(8)}`;
  if (/^0[2349]\d{7}$/.test(key)) {
    return `${key.slice(0, 2)} ${key.slice(2, 5)} ${key.slice(5, 7)} ${key.slice(7)}`;
  }
  if (/^0[1-9]\d{7}$/.test(key)) {
    return `${key.slice(0, 3)} ${key.slice(3, 5)} ${key.slice(5, 7)} ${key.slice(7)}`;
  }

  return raw;
}

// "BTW BE 0667.887.956" → "BE0667887956". Leeg → null.
export function normalizeVatNumber(value: string | null | undefined): string | null {
  const cleaned = (value ?? "").toUpperCase().replace(/^BTW/, "").replace(/[^A-Z0-9]/g, "");
  return cleaned || null;
}

// ---------------------------------------------------------------------------
// Koppelen: leads en storage-contracten vinden of maken automatisch hun klant
// ---------------------------------------------------------------------------

type Db = Prisma.TransactionClient;

export type CustomerContactInput = {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  vatNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
};

// Een klant wordt enkel "opgewaardeerd" naar Klant (na een aankoop of storage-contract),
// nooit automatisch teruggezet. Handmatige keuzes op de klantfiche blijven zo behouden.
function nextType(current: string, incoming: CustomerType): string {
  return incoming === "CUSTOMER" ? "CUSTOMER" : current;
}

// Zoekt een bestaande klant op e-mail (voorrang) of telefoon, over beide velden heen.
export async function findMatchingCustomer(db: Db, input: { email?: string | null; phone?: string | null }) {
  const email = normalizeEmail(input.email);
  const phoneKey = normalizePhoneKey(input.phone);

  if (email) {
    const byEmail = await db.customer.findFirst({
      where: { OR: [{ email }, { email2: email }] },
      orderBy: { createdAt: "asc" }
    });
    if (byEmail) return byEmail;
  }

  if (phoneKey) {
    return db.customer.findFirst({
      where: { OR: [{ phoneKey }, { phone2Key: phoneKey }] },
      orderBy: { createdAt: "asc" }
    });
  }

  return null;
}

// Vult enkel lege velden van een bestaande klant aan; ingevulde gegevens worden nooit overschreven.
// Een afwijkend e-mailadres of telefoonnummer komt in het tweede veld als dat nog vrij is.
function fillBlanks(
  customer: NonNullable<Awaited<ReturnType<typeof findMatchingCustomer>>>,
  input: CustomerContactInput,
  type: CustomerType
): Prisma.CustomerUpdateInput {
  const data: Prisma.CustomerUpdateInput = {};
  const blank = (value: string | null) => !value || !value.trim();
  const text = (value: string | null | undefined) => (value ?? "").trim() || null;

  const simpleFields = ["firstName", "lastName", "companyName", "street", "houseNumber", "postalCode", "city"] as const;
  for (const field of simpleFields) {
    const incoming = text(input[field]);
    if (incoming && blank(customer[field])) data[field] = incoming;
  }

  const vat = normalizeVatNumber(input.vatNumber);
  if (vat && blank(customer.vatNumber)) data.vatNumber = vat;

  const email = normalizeEmail(input.email);
  if (email && email !== customer.email && email !== customer.email2) {
    if (!customer.email) data.email = email;
    else if (!customer.email2) data.email2 = email;
  }

  const phoneKey = normalizePhoneKey(input.phone);
  if (phoneKey && phoneKey !== customer.phoneKey && phoneKey !== customer.phone2Key) {
    if (!customer.phoneKey) {
      data.phone = formatPhone(input.phone);
      data.phoneKey = phoneKey;
    } else if (!customer.phone2Key) {
      data.phone2 = formatPhone(input.phone);
      data.phone2Key = phoneKey;
    }
  }

  const upgradedType = nextType(customer.type, type);
  if (upgradedType !== customer.type) data.type = upgradedType;

  return data;
}

// Geeft het id van de bijhorende klant terug: bestaande klant (aangevuld) of een nieuwe.
// Zonder e-mail én zonder bruikbaar telefoonnummer wordt er altijd een nieuwe klant gemaakt.
export async function findOrCreateCustomer(db: Db, input: CustomerContactInput, type: CustomerType): Promise<string> {
  const existing = await findMatchingCustomer(db, input);

  if (existing) {
    const data = fillBlanks(existing, input, type);
    if (Object.keys(data).length > 0) {
      await db.customer.update({ where: { id: existing.id }, data });
    }
    return existing.id;
  }

  const text = (value: string | null | undefined) => (value ?? "").trim() || null;
  const created = await db.customer.create({
    data: {
      type,
      firstName: text(input.firstName),
      lastName: text(input.lastName),
      companyName: text(input.companyName),
      vatNumber: normalizeVatNumber(input.vatNumber),
      email: normalizeEmail(input.email),
      phone: formatPhone(input.phone),
      phoneKey: normalizePhoneKey(input.phone),
      street: text(input.street),
      houseNumber: text(input.houseNumber),
      postalCode: text(input.postalCode),
      city: text(input.city),
      country: text(input.country) ?? "België"
    },
    select: { id: true }
  });

  return created.id;
}

// Koppelt een lead aan zijn klant (of vult de gekoppelde klant aan). Een gewonnen lead maakt van
// de klant een "Klant"; alle andere statussen houden hem minstens "Prospect".
export async function linkLeadToCustomer(db: Db, leadId: string): Promise<void> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: {
      customerId: true,
      status: true,
      firstName: true,
      lastName: true,
      companyName: true,
      vatNumber: true,
      email: true,
      phone: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      country: true
    }
  });

  if (!lead) return;

  const type: CustomerType = lead.status === "WON" ? "CUSTOMER" : "PROSPECT";

  if (lead.customerId) {
    const customer = await db.customer.findUnique({ where: { id: lead.customerId } });
    if (customer) {
      const data = fillBlanks(customer, lead, type);
      if (Object.keys(data).length > 0) {
        await db.customer.update({ where: { id: customer.id }, data });
      }
      return;
    }
  }

  const customerId = await findOrCreateCustomer(db, lead, type);
  await db.lead.update({ where: { id: leadId }, data: { customerId } });
}

// Een storage-contract hoort altijd bij een Klant.
export async function linkStorageContractToCustomer(db: Db, contractId: string): Promise<void> {
  const contract = await db.storageContract.findUnique({
    where: { id: contractId },
    select: { customerId: true, firstName: true, lastName: true, email: true, phone: true }
  });

  if (!contract) return;

  if (contract.customerId) {
    const customer = await db.customer.findUnique({ where: { id: contract.customerId } });
    if (customer) {
      const data = fillBlanks(customer, contract, "CUSTOMER");
      if (Object.keys(data).length > 0) {
        await db.customer.update({ where: { id: customer.id }, data });
      }
      return;
    }
  }

  const customerId = await findOrCreateCustomer(db, contract, "CUSTOMER");
  await db.storageContract.update({ where: { id: contractId }, data: { customerId } });
}

// ---------------------------------------------------------------------------
// Afgeleide kenmerken voor lijst, fiche en export
// ---------------------------------------------------------------------------

const CLOSED_LEAD_STATUSES = ["WON", "LOST"];

export type CustomerFlags = {
  isBuyer: boolean;
  hasOpenLead: boolean;
  hasActiveStorage: boolean;
  storageInterest: boolean;
};

export function getCustomerFlags(customer: {
  type: string;
  leads: Array<{ status: string; storageInterest: boolean }>;
  storageContracts: Array<{ status: string }>;
}): CustomerFlags {
  return {
    isBuyer: customer.leads.some((lead) => lead.status === "WON"),
    hasOpenLead: customer.leads.some((lead) => !CLOSED_LEAD_STATUSES.includes(lead.status)),
    hasActiveStorage: customer.storageContracts.some((contract) => contract.status === "ACTIVE"),
    storageInterest: customer.leads.some((lead) => lead.storageInterest)
  };
}

// Verjaardag: opgeslagen als middernacht UTC, getoond zonder tijdzoneverschuiving.
export function formatCustomerDate(value: Date | null | undefined): string {
  return value ? new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium", timeZone: "UTC" }).format(value) : "";
}
