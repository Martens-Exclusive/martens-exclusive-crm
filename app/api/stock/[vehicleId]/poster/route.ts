import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { buildPricePosterPdf, type PricePosterData } from "@/lib/price-poster-pdf";
import { readPosterValuesFromForm } from "@/lib/price-poster-fields";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Accepteert "25995", "25.995", "€ 25.995,-" of "25.995,50".
function parseEuro(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/,-$/, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\.(?=\d{3}(\D|$))/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : null;
}

// Enkel gewone webadressen worden een QR-code.
function webUrl(value: string): string {
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  await requireUser();

  const { vehicleId } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { stockNumber: true, brand: true, model: true }
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Wagen niet gevonden." }, { status: 404 });
  }

  const formData = await request.formData();
  const values = readPosterValuesFromForm(formData);

  // Onthoud de ingevulde gegevens voor de volgende affiche van deze wagen.
  // Lukt dat niet, dan wordt de PDF toch gemaakt.
  try {
    await prisma.vehiclePoster.upsert({
      where: { vehicleId },
      create: { vehicleId, data: values },
      update: { data: values }
    });
  } catch (error) {
    console.error("Prijsaffiche-gegevens niet opgeslagen", error);
  }

  const data: PricePosterData = {
    title: values.title || `${vehicle.brand} ${vehicle.model}`,
    subtitle: values.subtitle,
    priceEuro: parseEuro(values.price),
    firstRegistration: values.firstRegistration,
    mileage: values.mileage,
    fuel: values.fuel,
    power: values.power,
    displacement: values.displacement,
    transmission: values.transmission,
    warranty: values.warranty,
    consumption: values.consumption,
    consumptionNote: values.consumptionNote,
    co2: values.co2,
    euroNorm: values.euroNorm,
    options: values.options,
    adUrl: webUrl(values.adUrl),
    carPassUrl: webUrl(values.carPassUrl),
    adNumber: values.adNumber
  };

  const pdf = await buildPricePosterPdf(data);
  const fileName = `prijsaffiche-${vehicle.stockNumber}.pdf`.replace(/[^\w.-]+/g, "-");

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}
