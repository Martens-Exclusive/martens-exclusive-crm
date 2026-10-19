import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { buildPricePosterPdf, type PricePosterData } from "@/lib/price-poster-pdf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function text(formData: FormData, name: string, max = 200): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

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

  const data: PricePosterData = {
    title: text(formData, "title") || `${vehicle.brand} ${vehicle.model}`,
    subtitle: text(formData, "subtitle"),
    priceEuro: parseEuro(text(formData, "price")),
    firstRegistration: text(formData, "firstRegistration"),
    mileage: text(formData, "mileage"),
    fuel: text(formData, "fuel"),
    power: text(formData, "power"),
    displacement: text(formData, "displacement"),
    transmission: text(formData, "transmission"),
    warranty: text(formData, "warranty"),
    consumption: text(formData, "consumption"),
    consumptionNote: text(formData, "consumptionNote"),
    co2: text(formData, "co2"),
    euroNorm: text(formData, "euroNorm"),
    options: text(formData, "options", 4000),
    adUrl: webUrl(text(formData, "adUrl", 500)),
    carPassUrl: webUrl(text(formData, "carPassUrl", 500)),
    adNumber: text(formData, "adNumber", 30)
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
