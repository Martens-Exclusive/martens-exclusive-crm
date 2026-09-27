import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { QuoteEditor, type QuoteEditorInitial } from "./quote-editor";

function toDateInputValue(value: Date | null): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export default async function QuoteEditorPage({
  params
}: {
  params: Promise<{ leadId: string; quoteId: string }>;
}) {
  const { leadId, quoteId } = await params;

  const [quote, lead] = await Promise.all([
    prisma.quote.findUnique({ where: { id: quoteId } }),
    prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        vatNumber: true,
        street: true,
        houseNumber: true,
        postalCode: true,
        city: true,
        email: true,
        phone: true
      }
    })
  ]);

  if (!quote || !lead || quote.leadId !== lead.id) {
    notFound();
  }

  const addressParts = [
    [lead.street, lead.houseNumber].filter(Boolean).join(" "),
    [lead.postalCode, lead.city].filter(Boolean).join(" ")
  ].filter(Boolean);

  const initial: QuoteEditorInitial = {
    id: quote.id,
    leadId: lead.id,
    type: quote.type as "OFFERTE" | "BESTELBON",
    language: quote.language as "NL" | "FR" | "EN",
    date: toDateInputValue(quote.date),
    validUntil: toDateInputValue(quote.validUntil),
    vehicleTitle: quote.vehicleTitle,
    chassisNumber: quote.chassisNumber,
    mileage: quote.mileage,
    firstRegistration: quote.firstRegistration,
    fuelType: quote.fuelType,
    transmission: quote.transmission,
    displacement: quote.displacement,
    power: quote.power,
    co2: quote.co2,
    euroNorm: quote.euroNorm,
    warranty: quote.warranty,
    exterior: quote.exterior,
    interior: quote.interior,
    docKeys: quote.docKeys,
    docMaintenanceBooklet: quote.docMaintenanceBooklet,
    docCarPass: quote.docCarPass,
    docRegistration: quote.docRegistration,
    docCoc: quote.docCoc,
    docWarranty: quote.docWarranty,
    remarks: quote.remarks,
    vatType: quote.vatType,
    priceIncludesVat: quote.priceIncludesVat,
    salePrice: quote.salePrice ? String(quote.salePrice).replace(".", ",") : "",
    tradeIn: quote.tradeIn ? String(quote.tradeIn).replace(".", ",") : "",
    deposit: quote.deposit ? String(quote.deposit).replace(".", ",") : "",
    biv: quote.biv ? String(quote.biv).replace(".", ",") : "",
    annualRoadTax: quote.annualRoadTax ? String(quote.annualRoadTax).replace(".", ",") : "",
    equipmentText: quote.equipmentText,
    closingText: quote.closingText,
    photoUrls: quote.photoUrls,
    buyer: {
      name: `${lead.firstName} ${lead.lastName}`.trim(),
      companyName: lead.companyName || "",
      vatNumber: lead.vatNumber || "",
      address: addressParts.join(", "),
      email: lead.email || "",
      phone: lead.phone || ""
    }
  };

  return <QuoteEditor initial={initial} />;
}
