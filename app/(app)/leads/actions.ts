"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { leadPriorities, leadStatuses } from "@/lib/lead-status";
import { prisma } from "@/lib/prisma";

const createLeadSchema = z.object({
  firstName: z.string().trim().min(1, "Voornaam is verplicht."),
  lastName: z.string().trim().min(1, "Achternaam is verplicht."),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Ongeldig e-mailadres.").or(z.literal("")),
  sourceId: z.string().trim().min(1, "Bron is verplicht."),
  assignedUserId: z.string().trim().min(1, "Verkoper is verplicht."),
  primaryVehicleId: z.string().trim().optional(),
  status: z.enum(leadStatuses).default("NEW"),
  priority: z.enum(leadPriorities).default("NORMAL"),
  nextFollowUpAt: z.string().trim().min(1, "Volgende opvolging is verplicht."),
  financeInterest: z
    .union([z.literal("on"), z.null(), z.undefined()])
    .transform((value) => value === "on"),
  tradeInInterest: z
    .union([z.literal("on"), z.null(), z.undefined()])
    .transform((value) => value === "on"),
  customerMessage: z.string().trim().optional(),
  internalNotes: z.string().trim().optional()
});

const updateLeadSchema = z.object({
  leadId: z.string().trim().min(1),
  status: z.enum(leadStatuses),
  nextFollowUpAt: z.string().trim().min(1, "Volgende opvolging is verplicht."),
  internalNotes: z.string().trim().optional()
});

const createAppointmentSchema = z.object({
  leadId: z.string().trim().min(1),
  type: z.enum(["SHOWROOM_VISIT", "TEST_DRIVE", "PHONE_CALL"]),
  scheduledAt: z.string().trim().min(1, "Datum en tijd zijn verplicht."),
  notes: z.string().trim().optional()
});

const createTaskSchema = z.object({
  leadId: z.string().trim().min(1),
  title: z.string().trim().min(1, "Titel is verplicht."),
  dueAt: z.string().trim().min(1, "Vervaldatum is verplicht."),
  notes: z.string().trim().optional(),
  assignedUserId: z.string().trim().min(1, "Verkoper is verplicht.")
});

const createActivitySchema = z.object({
  leadId: z.string().trim().min(1),
  occurredAt: z.string().trim().min(1, "Datum en uur zijn verplicht."),
  type: z.enum([
    "PHONE_CALL",
    "EMAIL",
    "SMS",
    "WHATSAPP",
    "SHOWROOM_VISIT",
    "INTERNAL_NOTE"
  ]),
  details: z.string().trim().min(1, "Interne notitie is verplicht.")
});

const assignVehicleSchema = z.object({
  leadId: z.string().trim().min(1),
  vehicleId: z.string().trim().optional()
});

export type CreateLeadState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

export type UpdateLeadState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export type CreateAppointmentState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export type CreateTaskState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export type DeleteLeadState = {
  message?: string;
  success?: boolean;
};

export type CreateActivityState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export type AssignVehicleState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export async function createLead(_: CreateLeadState, formData: FormData) {
  const currentUser = await requireUser();

  const parsedLead = createLeadSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    sourceId: formData.get("sourceId"),
    assignedUserId: formData.get("assignedUserId"),
    primaryVehicleId: formData.get("primaryVehicleId"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    nextFollowUpAt: formData.get("nextFollowUpAt"),
    financeInterest: formData.get("financeInterest"),
    tradeInInterest: formData.get("tradeInInterest"),
    customerMessage: formData.get("customerMessage"),
    internalNotes: formData.get("internalNotes")
  });

  if (!parsedLead.success) {
    return {
      errors: parsedLead.error.flatten().fieldErrors,
      message: "Controleer de ingevulde gegevens."
    };
  }

  if (!parsedLead.data.phone && !parsedLead.data.email) {
    return {
      errors: {
        phone: ["Telefoon of e-mailadres is verplicht."],
        email: ["Telefoon of e-mailadres is verplicht."]
      },
      message: "Een lead heeft minstens één contactmethode nodig."
    };
  }

  const lead = await prisma.lead.create({
    data: {
      firstName: parsedLead.data.firstName,
      lastName: parsedLead.data.lastName,
      phone: parsedLead.data.phone || null,
      email: parsedLead.data.email || null,
      sourceId: parsedLead.data.sourceId,
      assignedUserId: parsedLead.data.assignedUserId,
      primaryVehicleId: parsedLead.data.primaryVehicleId || null,
      status: parsedLead.data.status,
      priority: parsedLead.data.priority,
      nextFollowUpAt: new Date(parsedLead.data.nextFollowUpAt),
      financeInterest: parsedLead.data.financeInterest,
      tradeInInterest: parsedLead.data.tradeInInterest,
      customerMessage: parsedLead.data.customerMessage || null,
      internalNotes: parsedLead.data.internalNotes || null,
      activities: {
        create: {
          type: "LEAD_CREATED",
          summary: "Lead aangemaakt",
          details: "Nieuwe lead ingevoerd in het systeem.",
          occurredAt: new Date(),
          userId: currentUser.id
        }
      },
      statusHistory: {
        create: {
          toStatus: parsedLead.data.status,
          changedByUserId: currentUser.id
        }
      },
      assignmentHistory: {
        create: {
          toUserId: parsedLead.data.assignedUserId,
          changedByUserId: currentUser.id
        }
      }
    },
    select: {
      id: true
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(_: UpdateLeadState, formData: FormData) {
  const currentUser = await requireUser();

  const parsedLead = updateLeadSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
    nextFollowUpAt: formData.get("nextFollowUpAt"),
    internalNotes: formData.get("internalNotes")
  });

  if (!parsedLead.success) {
    return {
      errors: parsedLead.error.flatten().fieldErrors,
      message: "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  const existingLead = await prisma.lead.findUnique({
    where: { id: parsedLead.data.leadId },
    select: {
      id: true,
      status: true,
      internalNotes: true
    }
  });

  if (!existingLead) {
    return {
      message: "Lead niet gevonden.",
      success: false
    };
  }

  const nextFollowUpAt = new Date(parsedLead.data.nextFollowUpAt);

  if (Number.isNaN(nextFollowUpAt.getTime())) {
    return {
      errors: {
        nextFollowUpAt: ["Volgende opvolging is verplicht."]
      },
      message: "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  const nextInternalNotes = parsedLead.data.internalNotes || null;
  const activitiesToCreate: Array<{
    type: string;
    summary: string;
    details?: string;
    occurredAt: Date;
    userId: string;
  }> = [];

  const updateData: {
    status: string;
    nextFollowUpAt: Date;
    internalNotes: string | null;
  } = {
    status: parsedLead.data.status,
    nextFollowUpAt,
    internalNotes: nextInternalNotes
  };

  if (existingLead.status !== parsedLead.data.status) {
    activitiesToCreate.push({
      type: "STATUS_CHANGE",
      summary: "Status gewijzigd",
      details: `Status gewijzigd naar ${parsedLead.data.status}.`,
      occurredAt: new Date(),
      userId: currentUser.id
    });
  }

  if ((existingLead.internalNotes || null) !== nextInternalNotes) {
    activitiesToCreate.push({
      type: "NOTE",
      summary: "Interne notities bijgewerkt",
      details: nextInternalNotes || "Interne notities werden leeggemaakt.",
      occurredAt: new Date(),
      userId: currentUser.id
    });
  }

  await prisma.lead.update({
    where: { id: existingLead.id },
    data: {
      ...updateData,
      statusHistory:
        existingLead.status !== parsedLead.data.status
          ? {
              create: {
                fromStatus: existingLead.status,
                toStatus: parsedLead.data.status,
                changedByUserId: currentUser.id
              }
            }
          : undefined,
      activities:
        activitiesToCreate.length > 0
          ? {
              create: activitiesToCreate
            }
          : undefined
    }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${existingLead.id}`);

  return {
    message: "Lead bijgewerkt.",
    success: true
  };
}

export async function createAppointment(
  _: CreateAppointmentState,
  formData: FormData
) {
  const currentUser = await requireUser();

  const parsedAppointment = createAppointmentSchema.safeParse({
    leadId: formData.get("leadId"),
    type: formData.get("type"),
    scheduledAt: formData.get("scheduledAt"),
    notes: formData.get("notes")
  });

  if (!parsedAppointment.success) {
    return {
      errors: parsedAppointment.error.flatten().fieldErrors,
      message: "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  const existingLead = await prisma.lead.findUnique({
    where: { id: parsedAppointment.data.leadId },
    select: { id: true }
  });

  if (!existingLead) {
    return {
      message: "Lead niet gevonden.",
      success: false
    };
  }

  const scheduledAt = new Date(parsedAppointment.data.scheduledAt);

  if (Number.isNaN(scheduledAt.getTime())) {
    return {
      errors: {
        scheduledAt: ["Datum en tijd zijn verplicht."]
      },
      message: "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  await prisma.appointment.create({
    data: {
      leadId: existingLead.id,
      assignedUserId: currentUser.id,
      type: parsedAppointment.data.type,
      scheduledAt,
      notes: parsedAppointment.data.notes || null
    }
  });

  await prisma.activity.create({
    data: {
      leadId: existingLead.id,
      userId: currentUser.id,
      type: "APPOINTMENT_BOOKED",
      summary: "Afspraak ingepland",
      details:
        parsedAppointment.data.notes || `Nieuwe afspraak van type ${parsedAppointment.data.type}.`,
      occurredAt: new Date()
    }
  });

  revalidatePath(`/leads/${existingLead.id}`);
  revalidatePath("/appointments");

  return {
    message: "Afspraak opgeslagen.",
    success: true
  };
}

export async function createTask(_: CreateTaskState, formData: FormData) {
  const currentUser = await requireUser();

  const parsedTask = createTaskSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    dueAt: formData.get("dueAt"),
    notes: formData.get("notes"),
    assignedUserId: formData.get("assignedUserId")
  });

  if (!parsedTask.success) {
    return {
      errors: parsedTask.error.flatten().fieldErrors,
      message: "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  const existingLead = await prisma.lead.findUnique({
    where: { id: parsedTask.data.leadId },
    select: { id: true }
  });

  if (!existingLead) {
    return {
      message: "Lead niet gevonden.",
      success: false
    };
  }

  const dueAt = new Date(parsedTask.data.dueAt);

  if (Number.isNaN(dueAt.getTime())) {
    return {
      errors: {
        dueAt: ["Vervaldatum is verplicht."]
      },
      message: "Controleer de ingevulde gegevens.",
      success: false
    };
  }

  await prisma.task.create({
    data: {
      leadId: existingLead.id,
      assignedUserId: parsedTask.data.assignedUserId,
      createdByUserId: currentUser.id,
      taskType: "FOLLOW_UP",
      title: parsedTask.data.title,
      notes: parsedTask.data.notes || null,
      dueAt,
      status: "OPEN"
    }
  });

  await prisma.activity.create({
    data: {
      leadId: existingLead.id,
      userId: currentUser.id,
      type: "NOTE",
      summary: "Taak toegevoegd",
      details: parsedTask.data.notes || `Nieuwe taak: ${parsedTask.data.title}.`,
      occurredAt: new Date()
    }
  });

  revalidatePath(`/leads/${existingLead.id}`);
  revalidatePath("/tasks");

  return {
    message: "Taak opgeslagen.",
    success: true
  };
}

function getActivitySummary(type: string) {
  if (type === "PHONE_CALL") return "Contact gehad via telefoon";
  if (type === "EMAIL") return "Contact gehad via mail";
  if (type === "SMS") return "Contact gehad via sms";
  if (type === "WHATSAPP") return "Contact gehad via WhatsApp";
  if (type === "SHOWROOM_VISIT") return "Showroombezoek";
  return "Interne update";
}

export async function createActivity(
  _: CreateActivityState,
  formData: FormData
) {
  const currentUser = await requireUser();

  const parsed = createActivitySchema.safeParse({
    leadId: formData.get("leadId"),
    occurredAt: formData.get("occurredAt"),
    type: formData.get("type"),
    details: formData.get("details")
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Controleer de velden.",
      success: false
    };
  }

  const existingLead = await prisma.lead.findUnique({
    where: { id: parsed.data.leadId },
    select: { id: true }
  });

  if (!existingLead) {
    return {
      message: "Lead niet gevonden.",
      success: false
    };
  }

  const occurredAt = new Date(parsed.data.occurredAt);

  if (Number.isNaN(occurredAt.getTime())) {
    return {
      errors: {
        occurredAt: ["Datum en uur zijn verplicht."]
      },
      message: "Controleer de velden.",
      success: false
    };
  }

  await prisma.lead.update({
    where: { id: existingLead.id },
    data: {
      lastContactedAt:
        parsed.data.type === "INTERNAL_NOTE" ? undefined : occurredAt
    }
  });

  await prisma.activity.create({
    data: {
      leadId: existingLead.id,
      userId: currentUser.id,
      type: parsed.data.type,
      summary: getActivitySummary(parsed.data.type),
      details: parsed.data.details,
      occurredAt
    }
  });

  revalidatePath(`/leads/${existingLead.id}`);

  return {
    message: "Activiteit opgeslagen.",
    success: true
  };
}

export async function assignVehicle(
  _: AssignVehicleState,
  formData: FormData
) {
  const currentUser = await requireUser();

  const parsed = assignVehicleSchema.safeParse({
    leadId: formData.get("leadId"),
    vehicleId: formData.get("vehicleId")
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Fout bij koppelen.",
      success: false
    };
  }

  const existingLead = await prisma.lead.findUnique({
    where: { id: parsed.data.leadId },
    select: { id: true }
  });

  if (!existingLead) {
    return {
      message: "Lead niet gevonden.",
      success: false
    };
  }

  const vehicleId = parsed.data.vehicleId || null;

  let vehicleDetails:
    | {
        brand: string;
        model: string;
        variant: string | null;
        stockNumber: string;
      }
    | null = null;

  if (vehicleId) {
    vehicleDetails = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        brand: true,
        model: true,
        variant: true,
        stockNumber: true
      }
    });

    if (!vehicleDetails) {
      return {
        message: "Wagen niet gevonden.",
        success: false
      };
    }
  }

  await prisma.lead.update({
    where: { id: existingLead.id },
    data: {
      primaryVehicleId: vehicleId
    }
  });

  await prisma.activity.create({
    data: {
      leadId: existingLead.id,
      userId: currentUser.id,
      type: vehicleId ? "VEHICLE_LINKED" : "VEHICLE_UNLINKED",
      summary: vehicleId ? "Wagen gekoppeld" : "Wagen ontkoppeld",
      details: vehicleId
        ? `${vehicleDetails?.brand} ${vehicleDetails?.model}${
            vehicleDetails?.variant ? ` ${vehicleDetails.variant}` : ""
          } (${vehicleDetails?.stockNumber}) gekoppeld aan lead.`
        : "Wagenkoppeling verwijderd.",
      occurredAt: new Date()
    }
  });

  revalidatePath(`/leads/${existingLead.id}`);
  revalidatePath("/leads");

  return {
    message: vehicleId ? "Wagen gekoppeld." : "Wagen ontkoppeld.",
    success: true
  };
}

export async function completeTask(formData: FormData) {
  const currentUser = await requireUser();
  const taskId = formData.get("taskId");

  if (typeof taskId !== "string" || taskId.length === 0) {
    return;
  }

  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      leadId: true,
      status: true
    }
  });

  if (!existingTask || existingTask.status === "COMPLETED") {
    return;
  }

  await prisma.task.update({
    where: { id: existingTask.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date()
    }
  });

  await prisma.activity.create({
    data: {
      leadId: existingTask.leadId,
      userId: currentUser.id,
      type: "NOTE",
      summary: "Taak voltooid",
      details: `Taak voltooid: ${existingTask.title}.`,
      occurredAt: new Date()
    }
  });

  revalidatePath("/tasks");
  revalidatePath(`/leads/${existingTask.leadId}`);
}

export async function deleteLead(_: DeleteLeadState, formData: FormData) {
  await requireUser();

  const leadId = formData.get("leadId");

  if (typeof leadId !== "string" || leadId.length === 0) {
    return {
      message: "Lead niet gevonden.",
      success: false
    };
  }

  const existingLead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      status: true
    }
  });

  if (!existingLead) {
    return {
      message: "Lead niet gevonden.",
      success: false
    };
  }

  if (existingLead.status !== "LOST") {
    return {
      message: "Alleen verloren leads kunnen verwijderd worden.",
      success: false
    };
  }

  try {
    await prisma.lead.delete({
      where: { id: existingLead.id }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return {
          message:
            "Deze lead kan niet verwijderd worden omdat er nog gekoppelde gegevens zijn.",
          success: false
        };
      }

      if (error.code === "P2025") {
        return {
          message: "Lead niet gevonden.",
          success: false
        };
      }
    }

    return {
      message: "Er ging iets mis bij het verwijderen van de lead.",
      success: false
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/leads");
  redirect("/leads");
}
