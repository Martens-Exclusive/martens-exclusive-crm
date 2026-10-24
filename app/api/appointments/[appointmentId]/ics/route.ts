import { NextResponse } from "next/server";

import { buildIcs, getCalendarEvent } from "@/lib/appointment-calendar";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  await requireUser();

  const { appointmentId } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { lead: { include: { primaryVehicle: true } }, vehicle: true }
  });

  if (!appointment) {
    return NextResponse.json({ error: "Afspraak niet gevonden." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const ics = buildIcs(getCalendarEvent(appointment, origin));

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="afspraak-${appointment.lead.lastName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "klant"}.ics"`,
      "Cache-Control": "no-store"
    }
  });
}
