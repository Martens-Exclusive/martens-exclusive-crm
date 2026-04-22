"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const vehicleStatuses = ["AVAILABLE", "RESERVED", "SOLD"] as const;
const vatTypes = ["BTW_WAGEN", "MARGE_WAGEN"] as const;
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
    stockNumber: z.string().trim().min(1, "Referentienummer is verplicht."),
    purchaseDate: z.string().trim().min(1, "Aankoopdatum is verplicht."),
    brand: z.string().trim().min(1, "Merk is verplicht."),
    model: z.string().trim().min(1, "Model is verplicht."),
    vin: z.string().trim().min(1, "Chassisnummer is verplicht."),
    mileageKm: z.coerce.number().int().min(0, "Kilometerstand is verplicht."),
    purchaseVatType: z.enum(vatTypes),
    saleVatType: z.enum(vatTypes),
    purchaseVatRate: vatRateField,
    saleVatRate: vatRateField,
    purchasePriceExclVat: z.string().trim().min(1, "Aankoopprijs is verplicht."),
    salePriceExclVat: z.string().trim().min(1, "Verkoopprijs is verplicht."),
    costsExclVat: z.string().trim().min(1, "Kosten zijn verplicht."),
    status: z.enum(vehicleStatuses)
  })
  .superRefine((data, ctx) => {
    if (data.purchaseVatType === "BTW_WAGEN" && data.purchaseVatRate === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchaseVatRate"],
        message: "Aankoop btw-percentage is verplicht."
      });
    }

    if (data.saleVatType === "BTW_WAGEN" && data.saleVatRate === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["saleVatRate"],
        message: "Verkoop btw-percentage is verplicht."
      });
    }

    if (data.purchaseVatType === "MARGE_WAGEN" && data.purchaseVatRate !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchaseVatRate"],
        message: "Laat het aankoop btw-percentage leeg voor margewagens."
      });
    }

    if (data.saleVatType === "MARGE_WAGEN" && data.saleVatRate !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["saleVatRate"],
        message: "Laat het verkoop btw-percentage leeg voor margewagens."
      });
    }
  });

export type SaveVehicleState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export type DeleteVehicleState = {
  message?: string;
  success?: boolean;
};

function parseMoneyToCents(value: string) {
  const normalizedValue = value.replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalizedValue);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100);
}

export async function saveVehicle(_: SaveVehicleState, formData: FormData) {
  await requireUser();

  const parsedVehicle = vehicleSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    stockNumber: formData.get("stockNumber"),
    purchaseDate: formData.get("purchaseDate"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    vin: formData.get("vin"),
    mileageKm: formData.get("mileageKm"),
    purchaseVatType: formData.get("purchaseVatType"),
    saleVatType: formData.get("saleVatType"),
    purchaseVatRate: formData.get("purchaseVatRate"),
    saleVatRate: formData.get("saleVatRate"),
    purchasePriceExclVat: formData.get("purchasePriceExclVat"),
    salePriceExclVat: formData.get("salePriceExclVat"),
    costsExclVat: formData.get("costsExclVat"),
    status: formData.get("status")
  });

  if (!parsedVehicle.success) {
    return {
      errors: parsedVehicle.error.flatten().fieldErrors,
      message: "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  const purchaseDate = new Date(parsedVehicle.data.purchaseDate);

  if (Number.isNaN(purchaseDate.getTime())) {
    return {
      errors: {
        purchaseDate: ["Aankoopdatum is verplicht."]
      },
      message: "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  const purchasePriceExclVatCents = parseMoneyToCents(parsedVehicle.data.purchasePriceExclVat);
  const salePriceExclVatCents = parseMoneyToCents(parsedVehicle.data.salePriceExclVat);
  const costsExclVatCents = parseMoneyToCents(parsedVehicle.data.costsExclVat);

  if (
    purchasePriceExclVatCents === null ||
    salePriceExclVatCents === null ||
    costsExclVatCents === null
  ) {
    return {
      message: "Controleer de ingevulde bedragen.",
      success: false
    };
  }

  const netProfitCents =
    salePriceExclVatCents - purchasePriceExclVatCents - costsExclVatCents;

  const vehicleData = {
    stockNumber: parsedVehicle.data.stockNumber,
    purchaseDate,
    brand: parsedVehicle.data.brand,
    model: parsedVehicle.data.model,
    vin: parsedVehicle.data.vin,
    mileageKm: parsedVehicle.data.mileageKm,
    purchaseVatType: parsedVehicle.data.purchaseVatType,
    saleVatType: parsedVehicle.data.saleVatType,
    purchaseVatRate: parsedVehicle.data.purchaseVatRate,
    saleVatRate: parsedVehicle.data.saleVatRate,
    purchasePriceExclVatCents,
    salePriceExclVatCents,
    costsExclVatCents,
    netProfitCents,
    priceCents: salePriceExclVatCents,
    currency: "EUR",
    status: parsedVehicle.data.status
  };

  try {
    if (parsedVehicle.data.vehicleId) {
      await prisma.vehicle.update({
        where: { id: parsedVehicle.data.vehicleId },
        data: vehicleData
      });
    } else {
      await prisma.vehicle.create({
        data: vehicleData
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          message: "Deze referentie of dit chassisnummer bestaat al.",
          success: false
        };
      }
    }

    return {
      message: "Er ging iets mis bij het opslaan van de wagen.",
      success: false
    };
  }

  revalidatePath("/stock");
  revalidatePath("/stock/new");
  revalidatePath("/leads/new");
  if (parsedVehicle.data.vehicleId) {
    revalidatePath(`/stock/${parsedVehicle.data.vehicleId}/edit`);
  }

  return {
    message: "Wagen opgeslagen.",
    success: true
  };
}

export async function deleteVehicle(_: DeleteVehicleState, formData: FormData) {
  await requireUser();

  const vehicleId = formData.get("vehicleId");

  if (typeof vehicleId !== "string" || vehicleId.length === 0) {
    return {
      message: "Wagen niet gevonden.",
      success: false
    };
  }

  try {
    await prisma.vehicle.delete({
      where: { id: vehicleId }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return {
          message:
            "Deze wagen kan niet verwijderd worden omdat ze nog gekoppeld is aan andere gegevens.",
          success: false
        };
      }

      if (error.code === "P2025") {
        return {
          message: "Wagen niet gevonden.",
          success: false
        };
      }
    }

    return {
      message: "Er ging iets mis bij het verwijderen van de wagen.",
      success: false
    };
  }

  revalidatePath("/stock");
  revalidatePath("/stock/new");
  revalidatePath("/leads/new");
  redirect("/stock?tab=archive");
}
