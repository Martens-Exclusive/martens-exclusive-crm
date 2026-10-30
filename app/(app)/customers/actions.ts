"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import {
  CUSTOMER_LANGUAGE_VALUES,
  CUSTOMER_TYPE_VALUES,
  formatPhone,
  getCustomerName,
  normalizeEmail,
  normalizePhoneKey,
  normalizeVatNumber
} from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { dateFromInput } from "@/lib/storage";

export type SaveCustomerState = { message?: string; duplicateId?: string };
export type DeleteCustomerState = { message?: string };

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const optional = (max: number) => z.preprocess(clean, z.string().max(max)).transform((v) => v || null);
const optionalEmail = z
  .preprocess(clean, z.string().max(200).email("Ongeldig e-mailadres.").or(z.literal("")))
  .transform((v) => normalizeEmail(v));

const customerSchema = z.object({
  customerId: z.preprocess(clean, z.string()),
  type: z.enum(CUSTOMER_TYPE_VALUES, { message: "Kies een type." }),
  firstName: optional(100),
  lastName: optional(100),
  companyName: optional(200),
  vatNumber: optional(30),
  email: optionalEmail,
  email2: optionalEmail,
  phone: optional(50),
  phone2: optional(50),
  street: optional(200),
  houseNumber: optional(30),
  postalCode: optional(20),
  city: optional(100),
  country: optional(100),
  language: z.enum(CUSTOMER_LANGUAGE_VALUES, { message: "Kies een taal." }),
  birthday: z.preprocess(clean, z.string()),
  notes: optional(4000)
});

export async function saveCustomer(_: SaveCustomerState, formData: FormData): Promise<SaveCustomerState> {
  await requireUser();

  const parsed = customerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Controleer de ingevulde gegevens." };
  }

  const input = parsed.data;

  if (!input.firstName && !input.lastName && !input.companyName) {
    return { message: "Vul minstens een naam of een bedrijfsnaam in." };
  }

  const birthday = input.birthday ? dateFromInput(input.birthday) : null;
  if (input.birthday && !birthday) {
    return { message: "Ongeldige verjaardag." };
  }

  const phoneKey = normalizePhoneKey(input.phone);
  const phone2Key = normalizePhoneKey(input.phone2);

  // Geen dubbele klanten: e-mail of telefoon mag niet al bij een andere klant staan.
  const emails = [input.email, input.email2].filter((value): value is string => Boolean(value));
  const phoneKeys = [phoneKey, phone2Key].filter((value): value is string => Boolean(value));

  if (emails.length > 0 || phoneKeys.length > 0) {
    const duplicate = await prisma.customer.findFirst({
      where: {
        id: input.customerId ? { not: input.customerId } : undefined,
        OR: [
          ...(emails.length > 0 ? [{ email: { in: emails } }, { email2: { in: emails } }] : []),
          ...(phoneKeys.length > 0 ? [{ phoneKey: { in: phoneKeys } }, { phone2Key: { in: phoneKeys } }] : [])
        ]
      },
      select: { id: true, firstName: true, lastName: true, companyName: true, email: true }
    });

    if (duplicate) {
      return {
        message: `Dit e-mailadres of telefoonnummer staat al bij ${getCustomerName(duplicate)}.`,
        duplicateId: duplicate.id
      };
    }
  }

  const data = {
    type: input.type,
    firstName: input.firstName,
    lastName: input.lastName,
    companyName: input.companyName,
    vatNumber: normalizeVatNumber(input.vatNumber),
    email: input.email,
    email2: input.email2,
    phone: formatPhone(input.phone),
    phoneKey,
    phone2: formatPhone(input.phone2),
    phone2Key,
    street: input.street,
    houseNumber: input.houseNumber,
    postalCode: input.postalCode,
    city: input.city,
    country: input.country ?? "België",
    language: input.language,
    birthday,
    mailingOptOut: formData.get("mailingOptOut") === "on",
    notes: input.notes
  };

  const customerId = input.customerId
    ? (await prisma.customer.update({ where: { id: input.customerId }, data, select: { id: true } })).id
    : (await prisma.customer.create({ data, select: { id: true } })).id;

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

// Snel aan- of afmelden voor mailings vanop de klantfiche.
export async function setMailingOptOut(formData: FormData) {
  await requireUser();

  const customerId = clean(formData.get("customerId"));
  if (!customerId) return;

  await prisma.customer.update({
    where: { id: customerId },
    data: { mailingOptOut: clean(formData.get("optOut")) === "1" }
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}

// Enkel klanten zonder gekoppelde leads of storage-contracten kunnen verwijderd worden,
// zodat er nooit historiek verloren gaat.
export async function deleteCustomer(_: DeleteCustomerState, formData: FormData): Promise<DeleteCustomerState> {
  await requireUser();

  const customerId = clean(formData.get("customerId"));
  if (!customerId) return { message: "Klant niet gevonden." };

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { _count: { select: { leads: true, storageContracts: true } } }
  });

  if (!customer) return { message: "Klant niet gevonden." };

  if (customer._count.leads > 0 || customer._count.storageContracts > 0) {
    return { message: "Deze klant heeft nog leads of storage-contracten en kan daarom niet verwijderd worden." };
  }

  try {
    await prisma.customer.delete({ where: { id: customerId } });
  } catch {
    return { message: "Verwijderen is niet gelukt." };
  }

  revalidatePath("/customers");
  redirect("/customers");
}
