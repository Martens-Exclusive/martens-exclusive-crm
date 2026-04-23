"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const vehicleStatuses = ["AVAILABLE", "RESERVED", "SOLD"] as const;
const vatTypes = ["BTW_WAGEN", "MARGE_WAGEN"] as const;
const inventoryTypes = ["STOCK", "CONSIGNMENT", "ON_ORDER"] as const;

const vatRateField = z
  .string()
  .trim()
  .refine((value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0), {
    message: "Geef een geldig btw-percentage."
  })
  .transform((value) => (value === "" ? null : Number(value)));

const vehicleSchema = z
  .object({
    vehicleId: z.string().trim().optional(),
    stockNumber: z.string().trim().min(1),
    purchaseDate: z.string().trim().optional(),
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),

    vin: z.string().trim().optional(),

    mileageKm: z.coerce.number().int().min(0),

    inventoryType: z.enum(inventoryTypes),

    commissionRate: z.string().optional(),
    commissionMinimum: z.string().optional(),

    purchaseVatType: z.enum(vatTypes),
    saleVatType: z.enum(vatTypes),
    purchaseVatRate: vatRateField,
    saleVatRate: vatRateField,

    purchasePriceExclVat: z.string().optional(),
    salePriceExclVat: z.string().optional(),
    costsExclVat: z.string().optional(),

    status: z.enum(vehicleStatuses)
  })
  .superRefine((data, ctx) => {
    // 🚗 VIN verplicht behalve bij bestelling
    if (data.inventoryType !== "ON_ORDER" && !data.vin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vin"],
        message: "Chassisnummer is verplicht."
      });
    }

    // 💰 prijzen verplicht behalve consignatie
    if (data.inventoryType === "STOCK") {
      if (!data.purchasePriceExclVat) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["purchasePriceExclVat"],
          message: "Aankoopprijs is verplicht."
        });
      }
    }

    if (!data.salePriceExclVat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salePriceExclVat"],
        message: "Verkoopprijs is verplicht."
      });
    }
  });

export type SaveVehicleState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

function parseMoneyToCents(value?: string) {
  if (!value) return null;
  const normalized = value.replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export async function saveVehicle(_: SaveVehicleState, formData: FormData) {
  await requireUser();

  const parsed = vehicleSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    stockNumber: formData.get("stockNumber"),
    purchaseDate: formData.get("purchaseDate"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    vin: formData.get("vin"),
    mileageKm: formData.get("mileageKm"),

    inventoryType: formData.get("inventoryType"),

    commissionRate: formData.get("commissionRate"),
    commissionMinimum: formData.get("commissionMinimum"),

    purchaseVatType: formData.get("purchaseVatType"),
    saleVatType: formData.get("saleVatType"),
    purchaseVatRate: formData.get("purchaseVatRate"),
    saleVatRate: formData.get("saleVatRate"),

    purchasePriceExclVat: formData.get("purchasePriceExclVat"),
    salePriceExclVat: formData.get("salePriceExclVat"),
    costsExclVat: formData.get("costsExclVat"),

    status: formData.get("status")
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Controleer de gegevens.",
      success: false
    };
  }

  const data = parsed.data;

  const purchasePrice = parseMoneyToCents(data.purchasePriceExclVat);
  const salePrice = parseMoneyToCents(data.salePriceExclVat);
  const costs = parseMoneyToCents(data.costsExclVat) ?? 0;

  let netProfitCents = 0;

  // 🔥 LOGICA
  if (data.inventoryType === "CONSIGNMENT") {
    const rate = Number(data.commissionRate || 6);
    const minimum = parseMoneyToCents(data.commissionMinimum) ?? 250000;

    const calculated = Math.round((salePrice || 0) * (rate / 100));

    netProfitCents = Math.max(calculated, minimum);
  } else {
    netProfitCents =
      (salePrice || 0) - (purchasePrice || 0) - costs;
  }

  const vehicleData = {
    stockNumber: data.stockNumber,
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
    brand: data.brand,
    model: data.model,
    vin: data.vin || null,
    mileageKm: data.mileageKm,

    inventoryType: data.inventoryType,

    commissionRate: data.inventoryType === "CONSIGNMENT" ? Number(data.commissionRate || 6) : null,
    commissionMinimumExclVatCents:
      data.inventoryType === "CONSIGNMENT"
        ? parseMoneyToCents(data.commissionMinimum) ?? 250000
        : null,

    purchaseVatType: data.purchaseVatType,
    saleVatType: data.saleVatType,
    purchaseVatRate: data.purchaseVatRate,
    saleVatRate: data.saleVatRate,

    purchasePriceExclVatCents: purchasePrice,
    salePriceExclVatCents: salePrice,
    costsExclVatCents: costs,

    netProfitCents,
    priceCents: salePrice,
    currency: "EUR",
    status: data.status
  };

  if (data.vehicleId) {
    await prisma.vehicle.update({
      where: { id: data.vehicleId },
      data: vehicleData
    });
  } else {
    await prisma.vehicle.create({
      data: vehicleData
    });
  }

  revalidatePath("/stock");

  return {
    message: "Wagen opgeslagen.",
    success: true
  };
}