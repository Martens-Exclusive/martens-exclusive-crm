"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, parseAmount } from "@/lib/quote-calc";

const QUOTE_TYPES = ["OFFERTE", "BESTELBON"] as const;
type QuoteType = (typeof QUOTE_TYPES)[number];

const MAX_PHOTOS = 8;

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Nieuwe offerte of bestelbon aanmaken voor een lead, en meteen de editor openen. */
export async function createQuote(formData: FormData) {
  await requireUser();

  const leadId = String(formData.get("leadId") || "");
  const type = String(formData.get("type") || "") as QuoteType;

  if (!leadId || !QUOTE_TYPES.includes(type)) {
    throw new Error("Ongeldige aanvraag.");
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, primaryVehicle: { select: { brand: true, model: true } } }
  });

  if (!lead) {
    throw new Error("Lead niet gevonden.");
  }

  const today = new Date();

  const quote = await prisma.quote.create({
    data: {
      leadId,
      type,
      date: today,
      validUntil: type === "OFFERTE" ? addDays(today, 7) : null,
      vehicleTitle: lead.primaryVehicle
        ? `${lead.primaryVehicle.brand} ${lead.primaryVehicle.model}`
        : ""
    }
  });

  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}/quotes/${quote.id}`);
}

/** Offerte omzetten naar een nieuwe bestelbon: neemt wagen, prijzen, opmerkingen, uitrusting en foto's over. */
export async function duplicateAsOrder(formData: FormData) {
  await requireUser();

  const quoteId = String(formData.get("quoteId") || "");
  const source = await prisma.quote.findUnique({ where: { id: quoteId } });

  if (!source) {
    throw new Error("Document niet gevonden.");
  }

  const today = new Date();

  const quote = await prisma.quote.create({
    data: {
      leadId: source.leadId,
      type: "BESTELBON",
      date: today,
      validUntil: null,
      vehicleTitle: source.vehicleTitle,
      chassisNumber: source.chassisNumber,
      mileage: source.mileage,
      firstRegistration: source.firstRegistration,
      fuelType: source.fuelType,
      transmission: source.transmission,
      displacement: source.displacement,
      power: source.power,
      co2: source.co2,
      euroNorm: source.euroNorm,
      warranty: source.warranty,
      exterior: source.exterior,
      interior: source.interior,
      docKeys: source.docKeys,
      docMaintenanceBooklet: source.docMaintenanceBooklet,
      docCarPass: source.docCarPass,
      docRegistration: source.docRegistration,
      docCoc: source.docCoc,
      docWarranty: source.docWarranty,
      remarks: source.remarks,
      vatType: source.vatType,
      priceIncludesVat: source.priceIncludesVat,
      salePrice: source.salePrice,
      tradeIn: source.tradeIn,
      deposit: source.deposit,
      biv: source.biv,
      annualRoadTax: source.annualRoadTax,
      equipmentText: source.equipmentText,
      closingText: source.closingText,
      photoUrls: source.photoUrls
    }
  });

  revalidatePath(`/leads/${source.leadId}`);
  redirect(`/leads/${source.leadId}/quotes/${quote.id}`);
}

export async function deleteQuote(formData: FormData) {
  await requireUser();

  const quoteId = String(formData.get("quoteId") || "");
  const leadId = String(formData.get("leadId") || "");

  await prisma.quote.delete({ where: { id: quoteId } });

  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}`);
}

const patchSchema = z
  .object({
    date: z.string().nullable(),
    validUntil: z.string().nullable(),
    vehicleTitle: z.string(),
    chassisNumber: z.string(),
    mileage: z.string(),
    firstRegistration: z.string(),
    fuelType: z.string(),
    transmission: z.string(),
    displacement: z.string(),
    power: z.string(),
    co2: z.string(),
    euroNorm: z.string(),
    warranty: z.string(),
    exterior: z.string(),
    interior: z.string(),
    docKeys: z.boolean(),
    docMaintenanceBooklet: z.boolean(),
    docCarPass: z.boolean(),
    docRegistration: z.boolean(),
    docCoc: z.boolean(),
    docWarranty: z.boolean(),
    remarks: z.string(),
    vatType: z.number(),
    priceIncludesVat: z.boolean(),
    salePrice: z.union([z.string(), z.number()]),
    tradeIn: z.union([z.string(), z.number()]),
    deposit: z.union([z.string(), z.number()]),
    biv: z.union([z.string(), z.number()]).nullable(),
    annualRoadTax: z.union([z.string(), z.number()]).nullable(),
    equipmentText: z.string(),
    closingText: z.string()
  })
  .partial();

export type QuotePatch = z.infer<typeof patchSchema>;

/** Autosave: sla één of meerdere velden van een offerte/bestelbon op. */
export async function saveQuote(quoteId: string, patch: QuotePatch) {
  await requireUser();

  const parsed = patchSchema.safeParse(patch);

  if (!parsed.success) {
    return { ok: false as const, error: "Ongeldige gegevens." };
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {};

  for (const key of [
    "vehicleTitle",
    "chassisNumber",
    "mileage",
    "firstRegistration",
    "fuelType",
    "transmission",
    "displacement",
    "power",
    "co2",
    "euroNorm",
    "warranty",
    "exterior",
    "interior",
    "docKeys",
    "docMaintenanceBooklet",
    "docCarPass",
    "docRegistration",
    "docCoc",
    "docWarranty",
    "remarks",
    "vatType",
    "priceIncludesVat",
    "equipmentText",
    "closingText"
  ] as const) {
    if (data[key] !== undefined) {
      update[key] = data[key];
    }
  }

  if (data.date !== undefined) {
    update.date = toDate(data.date) ?? new Date();
  }
  if (data.validUntil !== undefined) {
    update.validUntil = toDate(data.validUntil);
  }
  if (data.salePrice !== undefined) {
    update.salePrice = parseAmount(data.salePrice);
  }
  if (data.tradeIn !== undefined) {
    update.tradeIn = parseAmount(data.tradeIn);
  }
  if (data.deposit !== undefined) {
    update.deposit = parseAmount(data.deposit);
  }
  if (data.biv !== undefined) {
    update.biv = data.biv === null || data.biv === "" ? null : parseAmount(data.biv);
  }
  if (data.annualRoadTax !== undefined) {
    update.annualRoadTax =
      data.annualRoadTax === null || data.annualRoadTax === "" ? null : parseAmount(data.annualRoadTax);
  }

  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: update,
    select: { leadId: true }
  });

  revalidatePath(`/leads/${quote.leadId}`);
  revalidatePath(`/leads/${quote.leadId}/quotes/${quoteId}`);

  return { ok: true as const };
}

/** Foto toevoegen (al verkleind en als JPEG data-URL aangeleverd door de client). */
export async function addQuotePhoto(quoteId: string, dataUrl: string) {
  await requireUser();

  if (!dataUrl.startsWith("data:image/")) {
    return { ok: false as const, error: "Ongeldig beeldformaat." };
  }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { leadId: true, photoUrls: true }
  });

  if (!quote) {
    return { ok: false as const, error: "Document niet gevonden." };
  }

  if (quote.photoUrls.length >= MAX_PHOTOS) {
    return { ok: false as const, error: `Maximaal ${MAX_PHOTOS} foto's per offerte.` };
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { photoUrls: { push: dataUrl } }
  });

  revalidatePath(`/leads/${quote.leadId}/quotes/${quoteId}`);

  return { ok: true as const };
}

export async function removeQuotePhoto(quoteId: string, index: number) {
  await requireUser();

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { leadId: true, photoUrls: true }
  });

  if (!quote) {
    return { ok: false as const, error: "Document niet gevonden." };
  }

  const photoUrls = quote.photoUrls.filter((_, i) => i !== index);

  await prisma.quote.update({ where: { id: quoteId }, data: { photoUrls } });
  revalidatePath(`/leads/${quote.leadId}/quotes/${quoteId}`);

  return { ok: true as const };
}

export async function moveQuotePhoto(quoteId: string, index: number, direction: -1 | 1) {
  await requireUser();

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { leadId: true, photoUrls: true }
  });

  if (!quote) {
    return { ok: false as const, error: "Document niet gevonden." };
  }

  const photoUrls = [...quote.photoUrls];
  const target = index + direction;

  if (target < 0 || target >= photoUrls.length) {
    return { ok: true as const };
  }

  [photoUrls[index], photoUrls[target]] = [photoUrls[target], photoUrls[index]];

  await prisma.quote.update({ where: { id: quoteId }, data: { photoUrls } });
  revalidatePath(`/leads/${quote.leadId}/quotes/${quoteId}`);

  return { ok: true as const };
}
