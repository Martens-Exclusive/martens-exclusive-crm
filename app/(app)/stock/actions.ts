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
  .refine(
    (value) =>
      value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
    {
      message: "Geef een geldig btw-percentage."
    }
  )
  .transform((value) => (value === "" ? null : Number(value)));

const optionalMoneyField = z.string().trim().optional();

const vehicleSchema = z
  .object({
    vehicleId: z.string().trim().optional(),
    stockNumber: z.string().trim().min(1, "Referentienummer is verplicht."),
    purchaseDate: z.string().trim().optional(),
    brand: z.string().trim().min(1, "Merk is verplicht."),
    model: z.string().trim().min(1, "Model is verplicht."),
    vin: z.string().trim().optional(),
    mileageKm: z.coerce
      .number({
        invalid_type_error: "Kilometerstand is verplicht."
      })
      .int("Kilometerstand moet een geheel getal zijn.")
      .min(0, "Kilometerstand is verplicht."),
    inventoryType: z.enum(inventoryTypes),

    commissionRate: z.string().trim().optional(),
    commissionMinimum: z.string().trim().optional(),

    purchaseVatType: z.enum(vatTypes),
    saleVatType: z.enum(vatTypes),
    purchaseVatRate: vatRateField,
    saleVatRate: vatRateField,

    purchasePriceExclVat: optionalMoneyField,
    salePriceExclVat: optionalMoneyField,
    costsExclVat: optionalMoneyField,

    status: z.enum(vehicleStatuses)
  })
  .superRefine((data, ctx) => {
    if (data.inventoryType !== "ON_ORDER" && !data.vin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vin"],
        message: "Chassisnummer is verplicht."
      });
    }

    if (data.inventoryType === "STOCK" && !data.purchaseDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchaseDate"],
        message: "Aankoopdatum is verplicht voor stockwagens."
      });
    }

    if (data.inventoryType === "STOCK" && !data.purchasePriceExclVat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchasePriceExclVat"],
        message: "Aankoopprijs is verplicht voor stockwagens."
      });
    }

    if (data.inventoryType !== "ON_ORDER" && !data.salePriceExclVat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salePriceExclVat"],
        message: "Verkoopprijs is verplicht."
      });
    }

    if (data.inventoryType === "CONSIGNMENT") {
      const commissionRate = Number(data.commissionRate || "6");

      if (!Number.isFinite(commissionRate) || commissionRate <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["commissionRate"],
          message: "Commissiepercentage is verplicht."
        });
      }

      if (!data.commissionMinimum) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["commissionMinimum"],
          message: "Minimum commissie is verplicht."
        });
      }
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

function parseMoneyToCents(value?: string | null) {
  if (!value) {
    return null;
  }

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

  if (!parsedVehicle.success) {
    const fieldErrors = parsedVehicle.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat().find(Boolean);

    return {
      errors: fieldErrors,
      message: firstError || "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  const purchaseDate = parsedVehicle.data.purchaseDate
    ? new Date(parsedVehicle.data.purchaseDate)
    : null;

  if (
    parsedVehicle.data.purchaseDate &&
    purchaseDate &&
    Number.isNaN(purchaseDate.getTime())
  ) {
    return {
      errors: {
        purchaseDate: ["Geef een geldige datum in."]
      },
      message: "Geef een geldige datum in.",
      success: false
    };
  }

  const purchasePriceExclVatCents = parseMoneyToCents(
    parsedVehicle.data.purchasePriceExclVat
  );
  const salePriceExclVatCents = parseMoneyToCents(
    parsedVehicle.data.salePriceExclVat
  );
  const costsExclVatCents =
    parseMoneyToCents(parsedVehicle.data.costsExclVat) ?? 0;

  if (
    parsedVehicle.data.inventoryType !== "ON_ORDER" &&
    salePriceExclVatCents === null
  ) {
    return {
      errors: {
        salePriceExclVat: ["Controleer de verkoopprijs."]
      },
      message: "Controleer de verkoopprijs.",
      success: false
    };
  }

  if (
    parsedVehicle.data.inventoryType === "STOCK" &&
    purchasePriceExclVatCents === null
  ) {
    return {
      errors: {
        purchasePriceExclVat: ["Controleer de aankoopprijs."]
      },
      message: "Controleer de aankoopprijs.",
      success: false
    };
  }

  const commissionRate =
    parsedVehicle.data.inventoryType === "CONSIGNMENT"
      ? Number(parsedVehicle.data.commissionRate || "6")
      : null;

  const commissionMinimumExclVatCents =
    parsedVehicle.data.inventoryType === "CONSIGNMENT"
      ? parseMoneyToCents(parsedVehicle.data.commissionMinimum) ?? 250000
      : null;

  let netProfitCents: number | null = null;

  if (parsedVehicle.data.inventoryType === "CONSIGNMENT") {
    const percentageCommission = Math.round(
      (salePriceExclVatCents ?? 0) * ((commissionRate ?? 0) / 100)
    );

    netProfitCents = Math.max(
      percentageCommission,
      commissionMinimumExclVatCents ?? 250000
    );
  } else if (parsedVehicle.data.inventoryType === "ON_ORDER") {
    netProfitCents =
      salePriceExclVatCents !== null
        ? salePriceExclVatCents -
          (purchasePriceExclVatCents ?? 0) -
          costsExclVatCents
        : null;
  } else {
    netProfitCents =
      (salePriceExclVatCents ?? 0) -
      (purchasePriceExclVatCents ?? 0) -
      costsExclVatCents;
  }

  const vehicleData = {
    stockNumber: parsedVehicle.data.stockNumber,
    purchaseDate,
    brand: parsedVehicle.data.brand,
    model: parsedVehicle.data.model,
    vin: parsedVehicle.data.vin || null,
    mileageKm: parsedVehicle.data.mileageKm,
    inventoryType: parsedVehicle.data.inventoryType,
    commissionRate,
    commissionMinimumExclVatCents,
    purchaseVatType: parsedVehicle.data.purchaseVatType,
    saleVatType: parsedVehicle.data.saleVatType,
    purchaseVatRate: parsedVehicle.data.purchaseVatRate,
    saleVatRate: parsedVehicle.data.saleVatRate,
    purchasePriceExclVatCents:
      parsedVehicle.data.inventoryType === "CONSIGNMENT"
        ? null
        : purchasePriceExclVatCents,
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