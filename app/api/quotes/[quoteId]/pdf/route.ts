import path from "node:path";

import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcQuotePricing, formatDateBE, formatEuro, parseAmount } from "@/lib/quote-calc";
import { DOC_CHECKLIST, ORDER_ACCEPTANCE_TEXT } from "@/lib/quote-content";
import { pairSpecRows, parseEquipment, parseRemarks, vehicleSpecRows } from "@/lib/quote-view";
import { TERMS, type TermsSection } from "@/lib/quote-terms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// CSS px (96dpi, zoals in de referentie-implementatie) naar PDF-punten (72dpi).
const PX = 72 / 96;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 38 * PX;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_Y = PAGE_H - 22 * PX;

const INK = "#1D1D1B";
const GREY = "#7A7772";
const LINE_COLOR = "#D8D4CC";
const STONE = "#EEEDEA";
const TAUPE = "#A39A8C";
const WHITE = "#FFFFFF";

const FONT_DIR = path.join(process.cwd(), "fonts");
const LABEL_COL_W = 130 * PX;

type Buyer = {
  name: string;
  companyName: string;
  vatNumber: string;
  address: string;
  email: string;
  phone: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  await requireUser();

  const { quoteId } = await params;

  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });

  if (!quote) {
    return new NextResponse("Document niet gevonden.", { status: 404 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: quote.leadId },
    select: {
      firstName: true,
      lastName: true,
      companyName: true,
      vatNumber: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      email: true,
      phone: true
    }
  });

  if (!lead) {
    return new NextResponse("Klant niet gevonden.", { status: 404 });
  }

  const buyer: Buyer = {
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    companyName: lead.companyName || "",
    vatNumber: lead.vatNumber || "",
    address: [
      [lead.street, lead.houseNumber].filter(Boolean).join(" "),
      [lead.postalCode, lead.city].filter(Boolean).join(" ")
    ]
      .filter(Boolean)
      .join(", "),
    email: lead.email || "",
    phone: lead.phone || ""
  };

  const pdfBuffer = await buildQuotePdf(quote, buyer);

  const isOfferte = quote.type === "OFFERTE";
  const safe = (value: string) => value.replace(/[\\/:*?"<>|]/g, "").trim() || (isOfferte ? "offerte" : "bestelbon");
  const fileName = `${isOfferte ? "Offerte" : "Bestelbon"} - ${safe(quote.vehicleTitle || "wagen")} - ${safe(
    buyer.name || "klant"
  )}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}

type QuoteRecord = NonNullable<Awaited<ReturnType<typeof prisma.quote.findUnique>>>;

function buildQuotePdf(quote: QuoteRecord, buyer: Buyer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("Light", path.join(FONT_DIR, "JosefinSans-Light.ttf"));
    doc.registerFont("Regular", path.join(FONT_DIR, "JosefinSans-Regular.ttf"));
    doc.registerFont("SemiBold", path.join(FONT_DIR, "JosefinSans-SemiBold.ttf"));

    renderDocument(doc, quote, buyer);

    doc.end();
  });
}

function renderDocument(doc: PDFKit.PDFDocument, quote: QuoteRecord, buyer: Buyer) {
  const isOfferte = quote.type === "OFFERTE";

  const pricing = calcQuotePricing({
    vatType: quote.vatType,
    priceIncludesVat: quote.priceIncludesVat,
    salePrice: quote.salePrice,
    tradeIn: quote.tradeIn,
    deposit: quote.deposit
  });

  renderPage1(doc, quote, buyer, pricing, isOfferte);

  if (isOfferte) {
    const equipment = parseEquipment(quote.equipmentText);
    if (equipment.length > 0) {
      doc.addPage({ size: "A4", margin: 0 });
      renderEquipmentPage(doc, quote, equipment);
    }

    if (quote.photoUrls.length > 0) {
      doc.addPage({ size: "A4", margin: 0 });
      renderPhotosPage(doc, quote);
    }
  } else {
    doc.addPage({ size: "A4", margin: 0 });
    renderTermsPage(
      doc,
      "ALGEMENE VERKOOP- EN WAARBORGVOORWAARDEN",
      "Verkoopovereenkomst tweedehandsvoertuig",
      TERMS.NL
    );

    doc.addPage({ size: "A4", margin: 0 });
    renderTermsPage(
      doc,
      "CONDITIONS GÉNÉRALES DE VENTE ET DE GARANTIE",
      "Contrat de vente de véhicule d’occasion",
      TERMS.FR
    );
  }
}

function renderPage1(
  doc: PDFKit.PDFDocument,
  quote: QuoteRecord,
  buyer: Buyer,
  pricing: ReturnType<typeof calcQuotePricing>,
  isOfferte: boolean
) {
  let y = renderBand(doc, quote, isOfferte);

  y = kvBlock(doc, y, isOfferte ? "VOOR" : "KOPER", [
    ["Naam", buyer.name, "Bedrijf", buyer.companyName || "–"],
    ["Adres", buyer.address, "Btw-nummer", buyer.vatNumber || "–"],
    ["E-mail", buyer.email, "Telefoon", buyer.phone]
  ]);

  const specRows = pairSpecRows(
    vehicleSpecRows({
      chassisNumber: quote.chassisNumber,
      mileage: quote.mileage,
      firstRegistration: quote.firstRegistration,
      fuelType: quote.fuelType,
      transmission: quote.transmission,
      displacement: quote.displacement,
      power: quote.power,
      co2: quote.co2,
      euroNorm: quote.euroNorm,
      warranty: quote.warranty,
      exterior: quote.exterior,
      interior: quote.interior
    })
  );

  y = kvBlock(doc, y, "VOERTUIG", specRows);
  y = documentsBlock(doc, y, quote);

  const biv = parseAmount(quote.biv ?? "");
  const roadTax = parseAmount(quote.annualRoadTax ?? "");

  if (isOfferte && (biv > 0 || roadTax > 0)) {
    y = fiscalBlock(doc, y, biv, roadTax);
  }

  const remarks = parseRemarks(quote.remarks);
  if (remarks.length > 0) {
    y = remarksBlock(doc, y, remarks);
  }

  y = pricesBlock(doc, y, pricing, isOfferte);

  if (isOfferte) {
    renderClosing(doc, y, quote.closingText);
  } else {
    y = renderAcceptance(doc, y, quote.date);
    renderSignatures(doc, y);
  }

  renderFooter(doc);
}

function renderBand(doc: PDFKit.PDFDocument, quote: QuoteRecord, isOfferte: boolean): number {
  const padX = 28 * PX;
  const padTop = 26 * PX;
  const padBottom = 24 * PX;

  const kindText = isOfferte ? "OFFERTE" : "BESTELBON";
  const titleText = quote.vehicleTitle || " ";

  doc.font("Regular").fontSize(25 * PX);
  const titleHeight = doc.heightOfString(titleText, { width: CONTENT_W - padX * 2 });

  const bandHeight = padTop + 17 * PX + 1.1 * (30 * PX) + titleHeight * 1.15 + 10 * PX + 1.1 * (10 * PX) + padBottom;

  doc.rect(0, 0, PAGE_W, bandHeight).fill(INK);

  const logoPath = path.join(process.cwd(), "public", "logo.svg");
  try {
    doc.image(logoPath, MARGIN_X + padX, padTop, { width: 128 * PX });
  } catch {
    // logo.svg kan door pdfkit niet altijd gerenderd worden; PDF blijft geldig zonder logo.
  }

  doc
    .font("Light")
    .fontSize(17 * PX)
    .fillColor(WHITE)
    .text(kindText, MARGIN_X, padTop + 4 * PX, {
      width: CONTENT_W - padX * 2,
      align: "right",
      characterSpacing: 17 * PX * 0.34
    });

  const titleY = padTop + 30 * PX;
  doc
    .font("Regular")
    .fontSize(25 * PX)
    .fillColor(WHITE)
    .text(titleText, MARGIN_X + padX, titleY, {
      width: CONTENT_W - padX * 2,
      characterSpacing: 25 * PX * 0.06
    });

  const metaY = titleY + titleHeight * 1.15 + 6 * PX;
  const metaParts = [`DATUM   ${formatDateBE(quote.date)}`];
  if (isOfferte && quote.validUntil) {
    metaParts.push(`GELDIG TOT   ${formatDateBE(quote.validUntil)}`);
  }

  doc
    .font("Light")
    .fontSize(10 * PX)
    .fillColor("#D9D5CE")
    .text(metaParts.join("        "), MARGIN_X + padX, metaY, {
      width: CONTENT_W - padX * 2
    });

  return bandHeight + 10 * PX;
}

function blockLabel(doc: PDFKit.PDFDocument, label: string, y: number) {
  doc
    .font("Regular")
    .fontSize(9 * PX)
    .fillColor(INK)
    .text(label, MARGIN_X, y, { width: LABEL_COL_W, characterSpacing: 9 * PX * 0.3 });
}

function divider(doc: PDFKit.PDFDocument, y: number) {
  doc
    .moveTo(MARGIN_X, y)
    .lineTo(MARGIN_X + CONTENT_W, y)
    .strokeColor(LINE_COLOR)
    .lineWidth(1)
    .stroke();
}

function kvBlock(
  doc: PDFKit.PDFDocument,
  y: number,
  label: string,
  rows: Array<[string, string, string?, string?]>
): number {
  divider(doc, y);
  const top = y + 13 * PX;
  blockLabel(doc, label, top);

  const kvX = MARGIN_X + LABEL_COL_W;
  const kvW = CONTENT_W - LABEL_COL_W;
  const colA = 96 * PX;
  const colB = 190 * PX;
  const colC = 96 * PX;
  const rowHeight = 15 * PX;

  let rowY = top;
  for (const [labelA, valueA, labelB, valueB] of rows) {
    doc.font("Regular").fontSize(11 * PX);
    doc.fillColor(GREY).text(labelA, kvX, rowY, { width: colA, lineBreak: false });
    doc.fillColor(INK).text(valueA || "–", kvX + colA, rowY, { width: colB, lineBreak: false });

    if (labelB) {
      doc.fillColor(GREY).text(labelB, kvX + colA + colB, rowY, { width: colC, lineBreak: false });
      doc
        .fillColor(INK)
        .text(valueB || "–", kvX + colA + colB + colC, rowY, { width: kvW - colA - colB - colC, lineBreak: false });
    }

    rowY += rowHeight;
  }

  return Math.max(rowY, top + 11 * PX) + 11 * PX;
}

function documentsBlock(doc: PDFKit.PDFDocument, y: number, quote: QuoteRecord): number {
  divider(doc, y);
  const top = y + 13 * PX;
  blockLabel(doc, "DOCUMENTEN", top);

  const kvX = MARGIN_X + LABEL_COL_W;
  const kvW = CONTENT_W - LABEL_COL_W;
  const colW = kvW / 3;
  const rowHeight = 15 * PX;
  const box = 11 * PX;

  DOC_CHECKLIST.forEach((item, index) => {
    const checked = Boolean((quote as unknown as Record<string, boolean>)[item.key]);
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = kvX + col * colW;
    const rowY = top + row * rowHeight;

    doc
      .rect(x, rowY + 1 * PX, box, box)
      .strokeColor(checked ? INK : "#C9C4BB")
      .lineWidth(1)
      .stroke();

    if (checked) {
      doc
        .font("Regular")
        .fontSize(9 * PX)
        .fillColor(INK)
        .text("✓", x + 1 * PX, rowY, { width: box, align: "center" });
    }

    doc
      .font("Regular")
      .fontSize(11 * PX)
      .fillColor(checked ? INK : "#B3AEA6")
      .text(item.label, x + box + 8 * PX, rowY, { width: colW - box - 8 * PX, lineBreak: false });
  });

  const rows = Math.ceil(DOC_CHECKLIST.length / 3);
  return top + rows * rowHeight + 11 * PX;
}

function fiscalBlock(doc: PDFKit.PDFDocument, y: number, biv: number, roadTax: number): number {
  divider(doc, y);
  const top = y + 13 * PX;
  blockLabel(doc, "FISCAAL", top);

  const kvX = MARGIN_X + LABEL_COL_W;
  let rowY = top;

  if (biv > 0) {
    doc.font("Regular").fontSize(11 * PX).fillColor(GREY).text("BIV", kvX, rowY, { lineBreak: false });
    doc.fillColor(INK).text(formatEuro(biv), kvX + 96 * PX, rowY, { lineBreak: false });
    rowY += 15 * PX;
  }

  if (roadTax > 0) {
    doc
      .font("Regular")
      .fontSize(11 * PX)
      .fillColor(GREY)
      .text("Verkeersbel.", kvX, rowY, { lineBreak: false });
    doc.fillColor(INK).text(`${formatEuro(roadTax)} / jaar`, kvX + 96 * PX, rowY, { lineBreak: false });
    rowY += 15 * PX;
  }

  doc
    .font("Regular")
    .fontSize(8.5 * PX)
    .fillColor(GREY)
    .text(
      "Indicatief, niet inbegrepen in de prijs. Afhankelijk van gewest en situatie van de koper.",
      kvX,
      rowY + 2 * PX,
      { width: CONTENT_W - LABEL_COL_W }
    );

  return rowY + 2 * PX + doc.heightOfString("x", { width: 10 }) + 10 * PX;
}

function remarksBlock(
  doc: PDFKit.PDFDocument,
  y: number,
  remarks: Array<{ title: string | null; text: string }>
): number {
  divider(doc, y);
  const top = y + 13 * PX;
  blockLabel(doc, "OPMERKINGEN", top);

  const kvX = MARGIN_X + LABEL_COL_W;
  const kvW = CONTENT_W - LABEL_COL_W;
  let rowY = top;

  for (const paragraph of remarks) {
    doc.font("Regular").fontSize(11 * PX).fillColor(INK);

    if (paragraph.title) {
      const titleWidth = doc.widthOfString(`${paragraph.title}  `);
      doc.text(paragraph.title, kvX, rowY, { continued: true, width: kvW, lineBreak: false });
      doc.text(`  ${paragraph.text}`, { width: kvW - titleWidth, lineBreak: false });
      rowY += 16 * PX;
    } else {
      const h = doc.heightOfString(paragraph.text, { width: kvW });
      doc.text(paragraph.text, kvX, rowY, { width: kvW });
      rowY += h + 2 * PX;
    }
  }

  return rowY + 9 * PX;
}

function pricesBlock(
  doc: PDFKit.PDFDocument,
  y: number,
  pricing: ReturnType<typeof calcQuotePricing>,
  isOfferte: boolean
): number {
  divider(doc, y);
  let rowY = y + 8 * PX;

  const rows: Array<{ label: string; value: string; muted?: boolean }> = [
    { label: `Verkoopprijs${pricing.pct ? " excl. btw" : ""}`, value: formatEuro(pricing.excl) },
    { label: `Btw ${pricing.pct}%`, value: formatEuro(pricing.vat) },
    { label: `Totaal${pricing.pct ? " incl. btw" : ""}`, value: formatEuro(pricing.total) }
  ];
  if (pricing.tradeIn) rows.push({ label: "Overname", value: `– ${formatEuro(pricing.tradeIn)}`, muted: true });
  if (pricing.deposit) {
    rows.push({
      label: `Voorschot${isOfferte ? " bij bestelling" : ""}`,
      value: `– ${formatEuro(pricing.deposit)}`,
      muted: true
    });
  }

  for (const row of rows) {
    doc
      .font("Regular")
      .fontSize(12 * PX)
      .fillColor(row.muted ? GREY : INK)
      .text(row.label, MARGIN_X, rowY, { continued: true, width: CONTENT_W });
    doc.text(row.value, { align: "right" });
    rowY += 6 * PX * 2;
    divider(doc, rowY - 4 * PX);
  }

  const barH = 10 * PX * 2 + 4 * PX;
  doc.rect(MARGIN_X, rowY, CONTENT_W, barH).fill(INK);
  doc
    .font("Regular")
    .fontSize(9.5 * PX)
    .fillColor(WHITE)
    .text("SALDO BIJ LEVERING", MARGIN_X + 14 * PX, rowY + barH / 2 - 5 * PX, {
      characterSpacing: 9.5 * PX * 0.3,
      continued: true,
      width: CONTENT_W - 28 * PX
    });
  doc.font("Regular").fontSize(18 * PX).text(formatEuro(pricing.balance), { align: "right" });

  rowY += barH + 5 * PX;

  const note = !pricing.pct
    ? "Bijzondere regeling tweedehandse goederen (winstmarge). "
    : !isOfferte
      ? "Saldo te betalen vóór of bij levering."
      : "";

  if (note) {
    doc.font("Regular").fontSize(8.5 * PX).fillColor(GREY).text(note, MARGIN_X, rowY, { width: CONTENT_W });
    rowY += doc.heightOfString(note, { width: CONTENT_W }) + 4 * PX;
  }

  return rowY + 6 * PX;
}

function renderClosing(doc: PDFKit.PDFDocument, y: number, closingText: string) {
  doc
    .font("Regular")
    .fontSize(12 * PX)
    .fillColor(INK)
    .text(closingText || "", MARGIN_X, y + 8 * PX, { width: CONTENT_W * 0.75 });

  doc.moveDown(1);
  doc.font("Regular").fontSize(12 * PX).fillColor(INK).text("Met vriendelijke groeten,");
  doc.font("Regular").fontSize(12 * PX).fillColor(INK).text("Jannick Martens");
  doc
    .font("Light")
    .fontSize(12 * PX)
    .fillColor(GREY)
    .text("+32 484 28 85 48   ·   jannick@martens-exclusive.be");
}

function renderAcceptance(doc: PDFKit.PDFDocument, y: number, date: Date): number {
  const text = ORDER_ACCEPTANCE_TEXT.replace("{datum}", formatDateBE(date));
  doc.font("Regular").fontSize(9 * PX).fillColor(GREY).text(text, MARGIN_X, y + 14 * PX, { width: CONTENT_W });
  const h = doc.heightOfString(text, { width: CONTENT_W });
  return y + 14 * PX + h + 12 * PX;
}

function renderSignatures(doc: PDFKit.PDFDocument, y: number) {
  const colW = (CONTENT_W - 34 * PX) / 2;
  const lineY = y + 74 * PX;

  doc.moveTo(MARGIN_X, lineY).lineTo(MARGIN_X + colW, lineY).strokeColor(INK).lineWidth(1).stroke();
  doc
    .moveTo(MARGIN_X + colW + 34 * PX, lineY)
    .lineTo(MARGIN_X + colW + 34 * PX + colW, lineY)
    .strokeColor(INK)
    .lineWidth(1)
    .stroke();

  doc
    .font("Regular")
    .fontSize(8 * PX)
    .fillColor(GREY)
    .text("HANDTEKENING VERKOPER", MARGIN_X, lineY + 4 * PX, { characterSpacing: 8 * PX * 0.25, width: colW });
  doc.text("HANDTEKENING KOPER — VOOR AKKOORD", MARGIN_X + colW + 34 * PX, lineY + 4 * PX, {
    characterSpacing: 8 * PX * 0.25,
    width: colW
  });
}

function renderFooter(doc: PDFKit.PDFDocument) {
  divider(doc, FOOTER_Y);

  doc
    .font("Regular")
    .fontSize(7.3 * PX)
    .fillColor(INK)
    .text("MARTENS EXCLUSIVE BV ", MARGIN_X, FOOTER_Y + 7 * PX, {
      continued: true,
      characterSpacing: 7.3 * PX * 0.25,
      width: CONTENT_W,
      align: "center"
    });
  doc
    .font("Regular")
    .fillColor(GREY)
    .text(
      "Assesteenweg 122/3, 1750 Sint-Kwintens-Lennik · BTW BE 0707.682.405 · RPR Brussel",
      { align: "center" }
    );
  doc
    .font("Regular")
    .fontSize(7.3 * PX)
    .fillColor(GREY)
    .text(
      "KBC BE26 7340 7840 7129 (KREDBEBB) · Belfius BE78 0689 4014 9386 (GKCCBEBB) · info@martens-exclusive.be · +32 484 28 85 48 · martens-exclusive.be",
      MARGIN_X,
      FOOTER_Y + 14 * PX,
      { width: CONTENT_W, align: "center" }
    );
}

function pageHeading(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  doc
    .font("Regular")
    .fontSize(11 * PX)
    .fillColor(INK)
    .text(title, MARGIN_X, 36 * PX, { characterSpacing: 11 * PX * 0.3, width: CONTENT_W });

  const subtitleY = 36 * PX + 15 * PX;
  doc.font("Regular").fontSize(11 * PX).fillColor(GREY).text(subtitle, MARGIN_X, subtitleY, { width: CONTENT_W });

  const lineY = subtitleY + 15 * PX;
  divider(doc, lineY);

  return lineY + 16 * PX;
}

function renderEquipmentPage(
  doc: PDFKit.PDFDocument,
  quote: QuoteRecord,
  equipment: Array<{ kind: "category" | "item"; label: string }>
) {
  const top = pageHeading(doc, "UITRUSTING", quote.vehicleTitle);

  const colGap = 34 * PX;
  const colW = (CONTENT_W - colGap) / 2;
  const heights = equipment.map((entry) =>
    entry.kind === "category" ? 20 * PX : doc.heightOfString(entry.label, { width: colW - 12 * PX }) + 4 * PX
  );
  const total = heights.reduce((sum, h) => sum + h, 0);

  let colIndex = 0;
  let running = 0;
  const splitAt = heights.findIndex((h, i) => {
    running += h;
    return running >= total / 2 && i < equipment.length - 1;
  });

  const columns: Array<typeof equipment> = [[], []];
  equipment.forEach((entry, i) => {
    colIndex = splitAt >= 0 && i > splitAt ? 1 : 0;
    columns[colIndex].push(entry);
  });

  columns.forEach((entries, col) => {
    let y = top;
    const x = MARGIN_X + col * (colW + colGap);

    entries.forEach((entry) => {
      if (entry.kind === "category") {
        doc
          .font("Regular")
          .fontSize(9 * PX)
          .fillColor(INK)
          .text(entry.label, x, y, { characterSpacing: 9 * PX * 0.28, width: colW });
        y += 20 * PX;
      } else {
        doc.font("Regular").fontSize(10.5 * PX).fillColor(GREY).text("–", x, y, { width: 10 * PX });
        doc
          .font("Regular")
          .fontSize(10.5 * PX)
          .fillColor(INK)
          .text(entry.label, x + 12 * PX, y, { width: colW - 12 * PX });
        y += doc.heightOfString(entry.label, { width: colW - 12 * PX }) + 4 * PX;
      }
    });
  });

  renderFooter(doc);
}

function renderPhotosPage(doc: PDFKit.PDFDocument, quote: QuoteRecord) {
  const top = pageHeading(doc, "FOTO'S", quote.vehicleTitle);

  const gap = 14 * PX;
  const cellW = (CONTENT_W - gap) / 2;
  const cellH = (cellW * 2) / 3;

  quote.photoUrls.slice(0, 8).forEach((dataUrl, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN_X + col * (cellW + gap);
    const y = top + row * (cellH + gap);

    try {
      const base64 = dataUrl.split(",")[1] ?? "";
      const buffer = Buffer.from(base64, "base64");
      doc.image(buffer, x, y, { width: cellW, height: cellH });
    } catch {
      doc.rect(x, y, cellW, cellH).fill(STONE);
    }
  });

  renderFooter(doc);
}

function renderTermsPage(doc: PDFKit.PDFDocument, title: string, subtitle: string, sections: TermsSection[]) {
  doc
    .font("Regular")
    .fontSize(10 * PX)
    .fillColor(INK)
    .text(title, MARGIN_X, 36 * PX, { characterSpacing: 10 * PX * 0.25, width: CONTENT_W });

  const subtitleY = 36 * PX + 13 * PX;
  doc.font("Regular").fontSize(9 * PX).fillColor(GREY).text(subtitle, MARGIN_X, subtitleY, { width: CONTENT_W });

  const lineY = subtitleY + 14 * PX;
  divider(doc, lineY);
  const top = lineY + 12 * PX;

  const colGap = 22 * PX;
  const colW = (CONTENT_W - colGap) / 2;

  doc.font("SemiBold").fontSize(7.3 * PX);
  const heights = sections.map(([heading, ...paragraphs]) => {
    let h = doc.heightOfString(heading, { width: colW }) + 1 * PX;
    doc.font("Regular").fontSize(7.1 * PX);
    for (const p of paragraphs) {
      h += doc.heightOfString(p, { width: colW }) + 3 * PX;
    }
    doc.font("SemiBold").fontSize(7.3 * PX);
    return h + 5 * PX;
  });

  const total = heights.reduce((sum, h) => sum + h, 0);

  let running = 0;
  let splitAt = sections.length - 1;
  for (let i = 0; i < heights.length; i++) {
    running += heights[i];
    if (running >= total / 2) {
      splitAt = i;
      break;
    }
  }

  const columns: TermsSection[][] = [sections.slice(0, splitAt + 1), sections.slice(splitAt + 1)];

  columns.forEach((columnSections, col) => {
    let y = top;
    const x = MARGIN_X + col * (colW + colGap);

    for (const [heading, ...paragraphs] of columnSections) {
      doc.font("SemiBold").fontSize(7.3 * PX).fillColor(INK).text(heading, x, y, { width: colW });
      y += doc.heightOfString(heading, { width: colW }) + 1 * PX;

      for (const p of paragraphs) {
        doc.font("Regular").fontSize(7.1 * PX).fillColor(INK).text(p, x, y, { width: colW, align: "justify" });
        y += doc.heightOfString(p, { width: colW }) + 3 * PX;
      }

      y += 5 * PX;
    }
  });

  renderFooter(doc);
}
