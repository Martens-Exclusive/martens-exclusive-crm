"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BILLING_PERIOD_VALUES,
  STORAGE_PLAN_VALUES,
  addMonthsUtc,
  dateFromInput,
  getBillingMonths,
  getPlanPriceCents,
  parseBar,
  parseEuroToCents,
  todayBrussels
} from "@/lib/storage";

export type SaveStorageState = { message?: string };
export type DeleteStorageState = { message?: string };

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const optional = (max: number) => z.preprocess(clean, z.string().max(max)).transform((v) => v || null);

const storageSchema = z.object({
  contractId: z.preprocess(clean, z.string()),
  firstName: z.preprocess(clean, z.string().min(1, "Vul de voornaam in.").max(100)),
  lastName: z.preprocess(clean, z.string().min(1, "Vul de naam in.").max(100)),
  phone: optional(50),
  email: optional(200),
  plan: z.enum(STORAGE_PLAN_VALUES, { message: "Kies een pakket." }),
  monthlyPrice: z.preprocess(clean, z.string()),
  billingPeriod: z.enum(BILLING_PERIOD_VALUES, { message: "Kies maandelijks of jaarlijks." }),
  nextInvoiceAt: z.preprocess(clean, z.string()),
  vehicleLabel: optional(200),
  chassisNumber: optional(50),
  spot: optional(30),
  startDate: z.preprocess(clean, z.string()),
  batteryCheckedAt: z.preprocess(clean, z.string()),
  tiresCheckedAt: z.preprocess(clean, z.string()),
  tirePressureFront: z.preprocess(clean, z.string()),
  tirePressureRear: z.preprocess(clean, z.string()),
  notes: optional(4000)
});

export async function saveStorageContract(
  _: SaveStorageState,
  formData: FormData
): Promise<SaveStorageState> {
  await requireUser();

  const parsed = storageSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Controleer de ingevulde gegevens." };
  }

  const input = parsed.data;
  const monthlyPriceCents =
    input.monthlyPrice === "" ? getPlanPriceCents(input.plan) : parseEuroToCents(input.monthlyPrice);

  if (monthlyPriceCents === null) {
    return { message: "Geef een geldig bedrag per maand." };
  }

  const tirePressureFrontBar = parseBar(input.tirePressureFront);
  const tirePressureRearBar = parseBar(input.tirePressureRear);

  if (tirePressureFrontBar === undefined || tirePressureRearBar === undefined) {
    return { message: "Geef de bandenspanning in bar, bijvoorbeeld 2,4 (tussen 0,5 en 6)." };
  }

  const data = {
    isPresent: formData.get("isPresent") === "on",
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email,
    plan: input.plan,
    monthlyPriceCents,
    billingPeriod: input.billingPeriod,
    nextInvoiceAt: dateFromInput(input.nextInvoiceAt),
    vehicleLabel: input.vehicleLabel,
    chassisNumber: input.chassisNumber,
    spot: input.spot,
    startDate: dateFromInput(input.startDate),
    batteryCheckedAt: dateFromInput(input.batteryCheckedAt),
    tiresCheckedAt: dateFromInput(input.tiresCheckedAt),
    tirePressureFrontBar,
    tirePressureRearBar,
    notes: input.notes
  };

  if (input.contractId) {
    await prisma.storageContract.update({ where: { id: input.contractId }, data });
  } else {
    // Nieuwe klant zonder ingevulde factuurdatum: eerste factuur op de startdatum.
    await prisma.storageContract.create({
      data: { ...data, nextInvoiceAt: data.nextInvoiceAt ?? data.startDate }
    });
  }

  revalidatePath("/storage");
  revalidatePath("/dashboard");
  redirect("/storage");
}

export async function setPresence(formData: FormData) {
  await requireUser();

  const contractId = clean(formData.get("contractId"));
  if (!contractId) return;

  await prisma.storageContract.update({
    where: { id: contractId },
    data: { isPresent: clean(formData.get("present")) === "1" }
  });

  revalidatePath("/storage");
  revalidatePath("/dashboard");
}

// Factuur gemaakt: "volgende factuur" schuift één periode (maand of jaar) op.
export async function markInvoiced(formData: FormData) {
  await requireUser();

  const contractId = clean(formData.get("contractId"));
  if (!contractId) return;

  const contract = await prisma.storageContract.findUnique({ where: { id: contractId } });
  if (!contract) return;

  const months = getBillingMonths(contract.billingPeriod);
  const base = contract.nextInvoiceAt ?? dateFromInput(todayBrussels());
  if (!base) return;

  await prisma.storageContract.update({
    where: { id: contractId },
    data: { nextInvoiceAt: addMonthsUtc(base, months) }
  });

  revalidatePath("/storage");
  revalidatePath("/dashboard");
}

// Zet de laatste check van "vandaag": kind = "battery" of "tires".
export async function markChecked(formData: FormData) {
  await requireUser();

  const contractId = clean(formData.get("contractId"));
  const kind = clean(formData.get("kind"));
  if (!contractId || (kind !== "battery" && kind !== "tires")) return;

  const today = dateFromInput(todayBrussels());

  await prisma.storageContract.update({
    where: { id: contractId },
    data: kind === "battery" ? { batteryCheckedAt: today } : { tiresCheckedAt: today }
  });

  revalidatePath("/storage");
  revalidatePath("/dashboard");
}

export async function setStorageStatus(formData: FormData) {
  await requireUser();

  const contractId = clean(formData.get("contractId"));
  const status = clean(formData.get("status")) === "ENDED" ? "ENDED" : "ACTIVE";
  if (!contractId) return;

  await prisma.storageContract.update({
    where: { id: contractId },
    data: { status, endedAt: status === "ENDED" ? dateFromInput(todayBrussels()) : null }
  });

  revalidatePath("/storage");
  revalidatePath("/dashboard");
  redirect(status === "ENDED" ? "/storage?tab=ended" : "/storage");
}

export async function deleteStorageContract(
  _: DeleteStorageState,
  formData: FormData
): Promise<DeleteStorageState> {
  await requireUser();

  const contractId = clean(formData.get("contractId"));
  if (!contractId) return { message: "Contract niet gevonden." };

  try {
    await prisma.storageContract.delete({ where: { id: contractId } });
  } catch {
    return { message: "Verwijderen is niet gelukt." };
  }

  revalidatePath("/storage");
  revalidatePath("/dashboard");
  redirect("/storage?tab=ended");
}
