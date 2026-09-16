import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

import { requireUser } from "@/lib/auth";
import { buildLeadWhere } from "@/lib/lead-filters";
import {
  leadPriorityLabels,
  leadStatusLabels,
  type LeadPriority,
  type LeadStatus
} from "@/lib/lead-status";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  dateStyle: "medium",
  timeStyle: "short"
});

export async function GET(request: Request) {
  await requireUser();

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "overview";

  let pdfBuffer: Buffer;
  let fileNameSuffix: string;

  if (type === "result") {
    pdfBuffer = await buildResultPdf();
    fileNameSuffix = "resultaat";
  } else if (type === "source") {
    pdfBuffer = await buildSourcePdf();
    fileNameSuffix = "leads-per-bron";
  } else {
    pdfBuffer = await buildOverviewPdf(url.searchParams);
    fileNameSuffix = "overzicht-leads";
  }

  const fileName = `martens-exclusive-${fileNameSuffix}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}

// ---------------------------------------------------------------------------
// Report builders
// ---------------------------------------------------------------------------

async function buildResultPdf(): Promise<Buffer> {
  const [wonLeads, lostLeads] = await Promise.all([
    prisma.lead.count({ where: { status: "WON" } }),
    prisma.lead.count({ where: { status: "LOST" } })
  ]);

  const closedLeads = wonLeads + lostLeads;
  const conversionRate =
    closedLeads > 0 ? Math.round((wonLeads / closedLeads) * 100) : 0;
  const lostRate = closedLeads > 0 ? 100 - conversionRate : 0;

  const doc = createDoc("portrait");

  return collectPdf(doc, () => {
    drawHeader(
      doc,
      "Resultaat: gewonnen vs. verloren",
      `Van alle leads waar een uitkomst op zit (${closedLeads}).`
    );

    if (closedLeads === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#666666")
        .text("Nog geen gewonnen of verloren leads om te tonen.");
      return;
    }

    drawResultBar(doc, "Gewonnen", wonLeads, conversionRate, "#16a34a");
    doc.moveDown(1);
    drawResultBar(doc, "Verloren", lostLeads, lostRate, "#dc2626");

    doc.moveDown(1.5);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#000000")
      .text(`Totaal afgesloten leads: ${closedLeads}`);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text(`Conversie: ${conversionRate}%`);
  });
}

async function buildSourcePdf(): Promise<Buffer> {
  const [sourceCounts, sources] = await Promise.all([
    prisma.lead.groupBy({
      by: ["sourceId"],
      _count: { sourceId: true },
      orderBy: { _count: { sourceId: "desc" } }
    }),
    prisma.leadSource.findMany({ select: { id: true, name: true } })
  ]);

  const sourceNameById = new Map(sources.map((source) => [source.id, source.name]));
  const breakdown = sourceCounts.map((item) => ({
    name: sourceNameById.get(item.sourceId) ?? "Onbekend",
    count: item._count.sourceId
  }));
  const total = breakdown.reduce((sum, item) => sum + item.count, 0);

  const doc = createDoc("portrait");

  return collectPdf(doc, () => {
    drawHeader(
      doc,
      "Leads per bron",
      "Waar komen je leads vandaan (alle leads, ooit aangemaakt)."
    );

    if (breakdown.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#666666")
        .text("Nog geen leads met een bron.");
      return;
    }

    const columns: Column[] = [
      { label: "Bron", width: 260 },
      { label: "Aantal", width: 100 },
      { label: "% van totaal", width: 155 }
    ];

    const rows = breakdown.map((item) => [
      item.name,
      String(item.count),
      `${total > 0 ? Math.round((item.count / total) * 100) : 0}%`
    ]);

    drawTable(doc, columns, rows, {
      totalsRow: ["Totaal", String(total), "100%"]
    });
  });
}

async function buildOverviewPdf(searchParams: URLSearchParams): Promise<Buffer> {
  const filters = {
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    assignedUserId: searchParams.get("assignedUserId") ?? undefined,
    openOnly: searchParams.get("openOnly") === "1"
  };
  const label = searchParams.get("label") ?? undefined;

  const where = buildLeadWhere(filters);
  const now = new Date();

  const leads = await prisma.lead.findMany({
    where,
    include: {
      source: true,
      assignedUser: true,
      primaryVehicle: true
    },
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }]
  });

  const doc = createDoc("landscape");

  return collectPdf(doc, () => {
    drawHeader(doc, "Overzicht leads", label ?? `${leads.length} leads`);

    if (leads.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#666666")
        .text("Geen leads gevonden.");
      return;
    }

    const columns: Column[] = [
      { label: "Naam", width: 135 },
      { label: "Status", width: 90 },
      { label: "Wagen", width: 135 },
      { label: "Verkoper", width: 105 },
      { label: "Bron", width: 85 },
      { label: "Opvolging", width: 130 },
      { label: "Prioriteit", width: 82 }
    ];

    const rows = leads.map((lead) => {
      const isOverdue =
        lead.nextFollowUpAt !== null &&
        lead.nextFollowUpAt < now &&
        lead.status !== "WON" &&
        lead.status !== "LOST";

      const opvolging = lead.nextFollowUpAt
        ? `${isOverdue ? "Te laat — " : ""}${dateFormatter.format(lead.nextFollowUpAt)}`
        : "Nog niet ingepland";

      return [
        `${lead.firstName} ${lead.lastName}`,
        leadStatusLabels[lead.status as LeadStatus] ?? lead.status,
        lead.primaryVehicle
          ? `${lead.primaryVehicle.brand} ${lead.primaryVehicle.model}`
          : "Nog niet gekoppeld",
        lead.assignedUser
          ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}`
          : "Niet toegewezen",
        lead.source.name,
        opvolging,
        leadPriorityLabels[lead.priority as LeadPriority] ?? lead.priority
      ];
    });

    drawTable(doc, columns, rows);

    doc.moveDown(0.8);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#888888")
      .text(`${leads.length} leads in dit overzicht.`, doc.page.margins.left, doc.y);
  });
}

// ---------------------------------------------------------------------------
// PDF drawing helpers
// ---------------------------------------------------------------------------

type Column = { label: string; width: number };

function createDoc(layout: "portrait" | "landscape") {
  return new PDFDocument({ size: "A4", layout, margin: 40 });
}

function collectPdf(doc: PDFKit.PDFDocument, render: () => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    render();

    doc.end();
  });
}

function drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  const left = doc.page.margins.left;

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#000000")
    .text("Martens Exclusive", left, doc.y);

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#444444")
    .text(
      `${title} — gegenereerd op ${new Date().toLocaleDateString("nl-BE", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })}`
    );

  if (subtitle) {
    doc.font("Helvetica").fontSize(9).fillColor("#666666").text(subtitle);
  }

  doc.moveDown(1.2);
  doc.fillColor("#000000");
}

function drawResultBar(
  doc: PDFKit.PDFDocument,
  label: string,
  count: number,
  percentage: number,
  hexColor: string
) {
  const left = doc.page.margins.left;
  const barWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#000000")
    .text(`${label}: ${count} (${percentage}%)`, left, doc.y);

  doc.moveDown(0.35);

  const y = doc.y;
  doc.rect(left, y, barWidth, 10).fill("#e5e5e5");
  doc.rect(left, y, (barWidth * percentage) / 100, 10).fill(hexColor);
  doc.fillColor("#000000");
  doc.y = y + 18;
}

function ensureSpace(
  doc: PDFKit.PDFDocument,
  neededHeight: number,
  onNewPage?: () => void
) {
  const bottom = doc.page.height - doc.page.margins.bottom;

  if (doc.y + neededHeight > bottom) {
    doc.addPage();
    doc.y = doc.page.margins.top;

    if (onNewPage) {
      onNewPage();
    }
  }
}

function drawTable(
  doc: PDFKit.PDFDocument,
  columns: Column[],
  rows: string[][],
  options?: { totalsRow?: string[] }
) {
  const left = doc.page.margins.left;
  const rowHeight = 20;
  const headerHeight = 22;
  const width = columns.reduce((sum, column) => sum + column.width, 0);

  function drawHeaderRow() {
    const y = doc.y;

    doc.rect(left, y, width, headerHeight).fill("#000000");

    let x = left;
    doc.font("Helvetica-Bold").fontSize(8.5);

    for (const column of columns) {
      doc.fillColor("#ffffff").text(column.label, x + 4, y + 6, {
        width: column.width - 8
      });
      x += column.width;
    }

    doc.y = y + headerHeight;
    doc.fillColor("#000000");
  }

  ensureSpace(doc, headerHeight + rowHeight);
  drawHeaderRow();

  for (const row of rows) {
    ensureSpace(doc, rowHeight, drawHeaderRow);

    const y = doc.y;
    let x = left;

    doc.font("Helvetica").fontSize(8.5).fillColor("#000000");

    row.forEach((value, index) => {
      const column = columns[index];
      doc.text(value, x + 4, y + 5, {
        width: column.width - 8,
        height: rowHeight - 6,
        ellipsis: true
      });
      x += column.width;
    });

    doc
      .moveTo(left, y + rowHeight)
      .lineTo(left + width, y + rowHeight)
      .strokeColor("#eeeeee")
      .stroke();

    doc.y = y + rowHeight;
  }

  if (options?.totalsRow) {
    ensureSpace(doc, rowHeight + 6);

    doc
      .moveTo(left, doc.y + 4)
      .lineTo(left + width, doc.y + 4)
      .strokeColor("#cccccc")
      .stroke();

    doc.moveDown(0.5);

    const y = doc.y;
    let x = left;

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000000");

    options.totalsRow.forEach((value, index) => {
      const column = columns[index];
      doc.text(value, x + 4, y, { width: column.width - 8 });
      x += column.width;
    });

    doc.y = y + rowHeight;
  }
}
