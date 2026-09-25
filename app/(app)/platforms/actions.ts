"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const urlSchema = z
  .string()
  .trim()
  .min(1, "Link is verplicht.")
  .transform((value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`))
  .refine((value) => {
    try {
      // eslint-disable-next-line no-new
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, "Ongeldige link.");

const platformSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht."),
  url: urlSchema
});

export type PlatformFormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export async function createPlatform(
  _: PlatformFormState,
  formData: FormData
): Promise<PlatformFormState> {
  await requireUser();

  const parsed = platformSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url")
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  const highestSortOrder = await prisma.platform.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true }
  });

  await prisma.platform.create({
    data: {
      name: parsed.data.name,
      url: parsed.data.url,
      sortOrder: (highestSortOrder?.sortOrder ?? 0) + 1
    }
  });

  revalidatePath("/platforms");

  return {
    message: "Platform toegevoegd.",
    success: true
  };
}

export async function updatePlatform(
  _: PlatformFormState,
  formData: FormData
): Promise<PlatformFormState> {
  await requireUser();

  const id = formData.get("id");

  if (typeof id !== "string" || id.length === 0) {
    return {
      message: "Platform niet gevonden.",
      success: false
    };
  }

  const parsed = platformSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url")
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  const existing = await prisma.platform.findUnique({ where: { id } });

  if (!existing) {
    return {
      message: "Platform niet gevonden.",
      success: false
    };
  }

  await prisma.platform.update({
    where: { id },
    data: {
      name: parsed.data.name,
      url: parsed.data.url
    }
  });

  revalidatePath("/platforms");

  return {
    message: "Platform bijgewerkt.",
    success: true
  };
}

export async function deletePlatform(formData: FormData) {
  await requireUser();

  const id = formData.get("id");

  if (typeof id !== "string" || id.length === 0) {
    return;
  }

  await prisma.platform.delete({ where: { id } }).catch(() => null);

  revalidatePath("/platforms");
}

export async function movePlatform(formData: FormData) {
  await requireUser();

  const id = formData.get("id");
  const direction = formData.get("direction");

  if (typeof id !== "string" || id.length === 0) {
    return;
  }

  if (direction !== "up" && direction !== "down") {
    return;
  }

  const platforms = await prisma.platform.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  const index = platforms.findIndex((platform) => platform.id === id);

  if (index === -1) {
    return;
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (swapIndex < 0 || swapIndex >= platforms.length) {
    return;
  }

  const current = platforms[index];
  const swapWith = platforms[swapIndex];

  await prisma.$transaction([
    prisma.platform.update({
      where: { id: current.id },
      data: { sortOrder: swapWith.sortOrder }
    }),
    prisma.platform.update({
      where: { id: swapWith.id },
      data: { sortOrder: current.sortOrder }
    })
  ]);

  revalidatePath("/platforms");
}
