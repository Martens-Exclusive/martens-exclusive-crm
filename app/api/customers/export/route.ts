import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { buildCustomerWhere, readCustomerFilters } from "@/lib/customer-filters";
import { getCustomerFlags, getCustomerLanguageLabel, getCustomerTypeLabel } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Export van het (gefilterde) klantenbestand als CSV voor mailings en Excel.
// Puntkomma als scheidingsteken en een UTF-8 BOM: zo opent Excel (Belgische instellingen)
// het bestand meteen correct in kolommen, met accenten. Mailingtools zoals Mailchimp en
// Brevo herkennen het formaat bij het importeren.
export async function GET(request: NextRequest) {
  await requireUser();

  const filters = readCustomerFilters(Object.fromEntries(request.nextUrl.searchParams));

  const customers = await prisma.customer.findMany({
    where: buildCustomerWhere(filters),
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { companyName: "asc" }],
    include: {
      leads: {
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          storageInterest: true,
          interestedBrand: true,
          interestedModel: true,
          createdAt: true,
          primaryVehicle: { select: { brand: true, model: true } }
        }
      },
      storageContracts: { select: { status: true } }
    }
  });

  const header = [
    "Voornaam",
    "Achternaam",
    "Bedrijf",
    "E-mail",
    "E-mail 2",
    "Telefoon",
    "Telefoon 2",
    "Straat",
    "Nr",
    "Postcode",
    "Gemeente",
    "Land",
    "Taal",
    "Verjaardag",
    "Btw-nummer",
    "Type",
    "Koper",
    "Lopende lead",
    "Car Storage",
    "Interesse Car Storage",
    "Laatste wagen of interesse",
    "Laatste lead",
    "Mailing"
  ];

  const yesNo = (value: boolean) => (value ? "ja" : "nee");
  const date = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "");

  const rows = customers.map((customer) => {
    const flags = getCustomerFlags(customer);
    const latest = customer.leads[0];
    const vehicle = latest
      ? latest.primaryVehicle
        ? `${latest.primaryVehicle.brand} ${latest.primaryVehicle.model}`
        : [latest.interestedBrand, latest.interestedModel].filter(Boolean).join(" ")
      : "";

    return [
      customer.firstName,
      customer.lastName,
      customer.companyName,
      customer.email,
      customer.email2,
      customer.phone,
      customer.phone2,
      customer.street,
      customer.houseNumber,
      customer.postalCode,
      customer.city,
      customer.country,
      getCustomerLanguageLabel(customer.language),
      date(customer.birthday),
      customer.vatNumber,
      getCustomerTypeLabel(customer.type),
      yesNo(flags.isBuyer),
      yesNo(flags.hasOpenLead),
      yesNo(flags.hasActiveStorage),
      yesNo(flags.storageInterest),
      vehicle,
      latest ? date(latest.createdAt) : "",
      customer.mailingOptOut || !customer.email ? "nee" : "ja"
    ];
  });

  const csv = "﻿" + [header, ...rows].map((row) => row.map(toCsvCell).join(";")).join("\r\n");
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(new Date());

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="klantenbestand-${today}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}

// Waarden met ; " of regeleinde tussen aanhalingstekens. Cellen die met = + - @ beginnen krijgen
// een apostrof, zodat Excel ze nooit als formule uitvoert (CSV-injectie).
function toCsvCell(value: string | null | undefined): string {
  let text = (value ?? "").replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[;"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
