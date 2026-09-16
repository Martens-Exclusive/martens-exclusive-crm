import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type VehicleRow = {
  stockNumber: string;
  brand: string;
  model: string;
  vin: string | null;
  mileageKm: number | null;
  inventoryType: string | null;
  purchaseDate: Date | null;
  salePriceExclVatCents: number | null;
  netProfitCents: number | null;
  status: string;
};

export async function GET() {
  await requireUser();

  const vehicles = await prisma.vehicle.findMany({
    orderBy: [{ status: "asc" }, { purchaseDate: "desc" }, { createdAt: "desc" }],
    select: {
      stockNumber: true,
      brand: true,
      model: true,
      vin: true,
      mileageKm: true,
      inventoryType: true,
      purchaseDate: true,
      salePriceExclVatCents: true,
      netProfitCents: true,
      status: true
    }
  });

  const activeVehicles = vehicles.filter((vehicle) => vehicle.status !== "SOLD");
  const soldVehicles = vehicles.filter((vehicle) => vehicle.status === "SOLD");

  const pdfBuffer = await buildStockListPdf(activeVehicles, soldVehicles);
  const fileName = `martens-exclusive-stocklijst-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}

const columns = [
  { label: "Wagennr.", width: 65 },
  { label: "Merk / model", width: 160 },
  { label: "Km", width: 55 },
  { label: "Type dossier", width: 90 },
  { label: "Status", width: 75 },
  { label: "Prijs excl. btw", width: 90 },
  { label: "Dagen in stock", width: 75 },
  { label: "Nettomarge / netto commissie", width: 152 }
] as const;

const rowHeight = 20;
const headerHeight = 22;

function buildStockListPdf(
  activeVehicles: VehicleRow[],
  soldVehicles: VehicleRow[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderDocument(doc, activeVehicles, soldVehicles);

    doc.end();
  });
}

function renderDocument(
  doc: PDFKit.PDFDocument,
  activeVehicles: VehicleRow[],
  soldVehicles: VehicleRow[]
) {
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
      `Stocklijst — gegenereerd op ${new Date().toLocaleDateString("nl-BE", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })}`
    );

  doc.moveDown(1.2);

  renderSection(doc, "Actieve stock", activeVehicles, true);
  renderSection(doc, "Archief (verkocht)", soldVehicles, false);

  doc.fillColor("#888888").fontSize(8).text(
    `Martens Exclusive CRM — ${activeVehicles.length + soldVehicles.length} wagens in totaal.`,
    left,
    doc.y + 10
  );
}

function renderSection(
  doc: PDFKit.PDFDocument,
  title: string,
  vehicles: VehicleRow[],
  showDays: boolean
) {
  const left = doc.page.margins.left;

  ensureSpace(doc, headerHeight + rowHeight * 2);

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#000000")
    .text(`${title} (${vehicles.length} wagens)`, left, doc.y);

  doc.moveDown(0.4);

  if (vehicles.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666666")
      .text("Geen wagens in deze categorie.", left, doc.y);
    doc.moveDown(1);
    return;
  }

  drawTableHeader(doc);

  let totalNetProfitCents = 0;

  for (const vehicle of vehicles) {
    ensureSpace(doc, rowHeight, () => drawTableHeader(doc));
    drawRow(doc, vehicle, showDays);
    totalNetProfitCents += vehicle.netProfitCents ?? 0;
  }

  ensureSpace(doc, rowHeight + 6);

  doc
    .moveTo(left, doc.y + 4)
    .lineTo(left + totalWidth(), doc.y + 4)
    .strokeColor("#cccccc")
    .stroke();

  doc.moveDown(0.6);

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor("#000000")
    .text(
      `Totaal netto: ${formatMoney(totalNetProfitCents)}`,
      left,
      doc.y,
      { width: totalWidth(), align: "right" }
    );

  doc.moveDown(1.4);
}

function drawTableHeader(doc: PDFKit.PDFDocument) {
  const left = doc.page.margins.left;
  let x = left;
  const y = doc.y;

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
  doc.rect(left, y, totalWidth(), headerHeight).fill("#000000");

  x = left;
  for (const column of columns) {
    doc
      .fillColor("#ffffff")
      .text(column.label, x + 4, y + 6, { width: column.width - 8 });
    x += column.width;
  }

  doc.y = y + headerHeight;
  doc.fillColor("#000000");
}

function drawRow(doc: PDFKit.PDFDocument, vehicle: VehicleRow, showDays: boolean) {
  const left = doc.page.margins.left;
  const y = doc.y;
  let x = left;

  const values = [
    vehicle.stockNumber,
    `${vehicle.brand} ${vehicle.model}`,
    formatInteger(vehicle.mileageKm),
    getInventoryTypeLabel(vehicle.inventoryType),
    getStatusLabel(vehicle.status),
    formatMoney(vehicle.salePriceExclVatCents),
    showDays ? formatDaysInStock(vehicle.purchaseDate) : "-",
    formatMoney(vehicle.netProfitCents)
  ];

  doc.font("Helvetica").fontSize(8.5).fillColor("#000000");

  values.forEach((value, index) => {
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
    .lineTo(left + totalWidth(), y + rowHeight)
    .strokeColor("#eeeeee")
    .stroke();

  doc.y = y + rowHeight;
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

function totalWidth() {
  return columns.reduce((sum, column) => sum + column.width, 0);
}

function formatInteger(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("nl-BE").format(value);
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR"
  }).format(value / 100);
}

function formatDaysInStock(value: Date | null) {
  if (!value) {
    return "-";
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const purchaseDate = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const differenceInMs = startOfToday.getTime() - purchaseDate.getTime();
  const differenceInDays = Math.max(0, Math.floor(differenceInMs / 86_400_000));

  return `${differenceInDays} dagen`;
}

function getStatusLabel(status: string) {
  if (status === "AVAILABLE") {
    return "Beschikbaar";
  }

  if (status === "RESERVED") {
    return "Gereserveerd";
  }

  if (status === "SOLD") {
    return "Verkocht";
  }

  return status;
}

function getInventoryTypeLabel(inventoryType: string | null) {
  if (inventoryType === "STOCK") {
    return "Stock";
  }

  if (inventoryType === "CONSIGNMENT") {
    return "Consignatie";
  }

  if (inventoryType === "ON_ORDER") {
    return "In bestelling";
  }

  return inventoryType || "Stock";
}
