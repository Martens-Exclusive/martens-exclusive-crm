import path from "node:path";

import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcQuotePricing, formatDateBE, formatEuro, parseAmount } from "@/lib/quote-calc";
import { DOC_CHECKLIST, DOCUMENT_LABELS, ORDER_ACCEPTANCE_TEXT, type QuoteLanguage } from "@/lib/quote-content";
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
  const language: QuoteLanguage =
    quote.language === "FR" ? "FR" : quote.language === "EN" ? "EN" : "NL";
  const t = DOCUMENT_LABELS[language];

  const pricing = calcQuotePricing({
    vatType: quote.vatType,
    priceIncludesVat: quote.priceIncludesVat,
    salePrice: quote.salePrice,
    tradeIn: quote.tradeIn,
    deposit: quote.deposit
  });

  renderPage1(doc, quote, buyer, pricing, isOfferte, language, t);

  if (isOfferte) {
    const equipment = parseEquipment(quote.equipmentText);
    if (equipment.length > 0) {
      doc.addPage({ size: "A4", margin: 0 });
      renderEquipmentPage(doc, quote, equipment, t);
    }

    if (quote.photoUrls.length > 0) {
      doc.addPage({ size: "A4", margin: 0 });
      renderPhotosPage(doc, quote, t);
    }
  }

  // Eén pagina algemene voorwaarden, in de taal van het document — zowel op
  // de offerte als op de bestelbon.
  doc.addPage({ size: "A4", margin: 0 });
  renderTermsPage(doc, t.termsTitle, t.termsSubtitle, TERMS[language]);
}

function renderPage1(
  doc: PDFKit.PDFDocument,
  quote: QuoteRecord,
  buyer: Buyer,
  pricing: ReturnType<typeof calcQuotePricing>,
  isOfferte: boolean,
  language: QuoteLanguage,
  t: (typeof DOCUMENT_LABELS)[QuoteLanguage]
) {
  let y = renderBand(doc, quote, isOfferte, t);

  // Geen lijntje boven dit allereerste blok: het staat er verloren zo dicht
  // onder de donkere kop, die zorgt zelf al voor voldoende scheiding.
  y = kvBlock(
    doc,
    y,
    isOfferte ? t.voor : t.koper,
    [
      [t.naam, buyer.name, t.bedrijf, buyer.companyName || "–"],
      [t.adres, buyer.address, t.btwNummer, buyer.vatNumber || "–"],
      [t.email, buyer.email, t.telefoon, buyer.phone]
    ],
    false
  );

  const specRows = pairSpecRows(
    vehicleSpecRows(
      {
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
      },
      language
    )
  );

  y = kvBlock(doc, y, t.voertuig, specRows);
  y = documentsBlock(doc, y, quote, language, t);

  const biv = parseAmount(quote.biv ?? "");
  const roadTax = parseAmount(quote.annualRoadTax ?? "");

  if (isOfferte && (biv > 0 || roadTax > 0)) {
    y = fiscalBlock(doc, y, biv, roadTax, t);
  }

  const remarks = parseRemarks(quote.remarks);
  if (remarks.length > 0) {
    y = remarksBlock(doc, y, remarks, t);
  }

  y = pricesBlock(doc, y, pricing, isOfferte, t);

  if (isOfferte) {
    renderClosing(doc, y, quote.closingText);
  } else {
    y = renderAcceptance(doc, y, quote.date, language);
    renderSignatures(doc, y, t);
  }

  renderFooter(doc);
}

function renderBand(
  doc: PDFKit.PDFDocument,
  quote: QuoteRecord,
  isOfferte: boolean,
  t: (typeof DOCUMENT_LABELS)[QuoteLanguage]
): number {
  const padX = 28 * PX;
  const padTop = 26 * PX;
  const padBottom = 24 * PX;

  const kindText = isOfferte ? t.kind.OFFERTE : t.kind.BESTELBON;
  const titleText = quote.vehicleTitle || " ";

  // Logo en het "OFFERTE"/"BESTELBON"-label staan naast elkaar op één regel
  // (net als in de referentie) en worden nu verticaal op elkaar gecentreerd:
  // voorheen kregen ze elk een eigen vaste boven-marge, waardoor het logo net
  // iets lager en groter uitkwam dan het label en de rij niet mooi uitgelijnd
  // stond. De titel ("merk model") mag pas beginnen nadat deze rij helemaal is
  // afgerond, anders plakt de titel tegen het logo.
  const logoW = 128 * PX;
  const logoAspect = 218 / 896; // hoogte/breedte van de logo-PNG (zelfde verhouding als logo.svg)
  const logoH = logoW * logoAspect;

  doc.font("Light").fontSize(17 * PX);
  const kindHeight = doc.heightOfString(kindText, { width: CONTENT_W - padX * 2 });

  const topRowH = Math.max(logoH, kindHeight);
  const logoY = padTop + (topRowH - logoH) / 2;
  const kindY = padTop + (topRowH - kindHeight) / 2;

  const titleY = padTop + topRowH + 30 * PX;

  doc.font("Regular").fontSize(25 * PX);
  const titleHeight = doc.heightOfString(titleText, { width: CONTENT_W - padX * 2 });

  const metaY = titleY + titleHeight * 1.15 + 6 * PX;
  const metaHeight = 10 * PX * 1.1;

  const bandHeight = metaY + metaHeight + padBottom;

  doc.rect(0, 0, PAGE_W, bandHeight).fill(INK);

  // pdfkit kan geen SVG's rasteren (alleen JPEG/PNG), dus gebruiken we een vooraf
  // gerenderde PNG-versie van het witte logo in plaats van public/logo.svg.
  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  try {
    doc.image(logoPath, MARGIN_X + padX, logoY, { width: logoW });
  } catch {
    // Blijft de PDF geldig, zelfs als het logobestand onverwacht ontbreekt.
  }

  doc
    .font("Light")
    .fontSize(17 * PX)
    .fillColor(WHITE)
    .text(kindText, MARGIN_X, kindY, {
      width: CONTENT_W - padX * 2,
      align: "right",
      characterSpacing: 17 * PX * 0.34
    });

  doc
    .font("Regular")
    .fontSize(25 * PX)
    .fillColor(WHITE)
    .text(titleText, MARGIN_X + padX, titleY, {
      width: CONTENT_W - padX * 2,
      characterSpacing: 25 * PX * 0.06
    });

  const metaParts = [`${t.datum}   ${formatDateBE(quote.date)}`];
  if (isOfferte && quote.validUntil) {
    metaParts.push(`${t.geldigTot}   ${formatDateBE(quote.validUntil)}`);
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
  rows: Array<[string, string, string?, string?]>,
  withDivider: boolean = true
): number {
  if (withDivider) divider(doc, y);
  const top = y + (withDivider ? 13 * PX : 3 * PX);
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

// Tekent het vinkje als vector-lijntjes in plaats van als tekst-glyph: het
// ingesloten Josefin Sans-lettertype bevat geen "✓"-teken, waardoor dat
// eerder gewoon onzichtbaar bleef op de PDF (in de browser-preview valt dit
// niet op, omdat de browser daar automatisch een systeemlettertype voor
// invult — pdfkit doet dat niet voor ingesloten fonts).
function drawCheckSquare(doc: PDFKit.PDFDocument, x: number, y: number, size: number, checked: boolean) {
  doc
    .rect(x, y, size, size)
    .strokeColor(checked ? INK : "#C9C4BB")
    .lineWidth(1)
    .stroke();

  if (checked) {
    doc
      .save()
      .strokeColor(INK)
      .lineWidth(1.1 * PX)
      .moveTo(x + size * 0.18, y + size * 0.55)
      .lineTo(x + size * 0.42, y + size * 0.78)
      .lineTo(x + size * 0.84, y + size * 0.2)
      .stroke()
      .restore();
  }
}

function documentsBlock(
  doc: PDFKit.PDFDocument,
  y: number,
  quote: QuoteRecord,
  language: QuoteLanguage,
  t: (typeof DOCUMENT_LABELS)[QuoteLanguage]
): number {
  divider(doc, y);
  const top = y + 13 * PX;
  blockLabel(doc, t.documenten, top);

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

    drawCheckSquare(doc, x, rowY + 1 * PX, box, checked);

    doc
      .font("Regular")
      .fontSize(11 * PX)
      .fillColor(checked ? INK : "#B3AEA6")
      .text(item.label[language], x + box + 8 * PX, rowY, { width: colW - box - 8 * PX, lineBreak: false });
  });

  const rows = Math.ceil(DOC_CHECKLIST.length / 3);
  return top + rows * rowHeight + 11 * PX;
}

function fiscalBlock(
  doc: PDFKit.PDFDocument,
  y: number,
  biv: number,
  roadTax: number,
  t: (typeof DOCUMENT_LABELS)[QuoteLanguage]
): number {
  divider(doc, y);
  const top = y + 13 * PX;
  blockLabel(doc, t.fiscaal, top);

  const kvX = MARGIN_X + LABEL_COL_W;
  let rowY = top;

  if (biv > 0) {
    doc.font("Regular").fontSize(11 * PX).fillColor(GREY).text(t.biv, kvX, rowY, { lineBreak: false });
    doc.fillColor(INK).text(formatEuro(biv), kvX + 96 * PX, rowY, { lineBreak: false });
    rowY += 15 * PX;
  }

  if (roadTax > 0) {
    doc
      .font("Regular")
      .fontSize(11 * PX)
      .fillColor(GREY)
      .text(t.verkeersbelasting, kvX, rowY, { lineBreak: false });
    doc.fillColor(INK).text(`${formatEuro(roadTax)} / ${t.perJaar}`, kvX + 96 * PX, rowY, { lineBreak: false });
    rowY += 15 * PX;
  }

  doc
    .font("Regular")
    .fontSize(8.5 * PX)
    .fillColor(GREY)
    .text(t.fiscaalNote, kvX, rowY + 2 * PX, { width: CONTENT_W - LABEL_COL_W });

  return rowY + 2 * PX + doc.heightOfString("x", { width: 10 }) + 10 * PX;
}

function remarksBlock(
  doc: PDFKit.PDFDocument,
  y: number,
  remarks: Array<{ title: string | null; text: string }>,
  t: (typeof DOCUMENT_LABELS)[QuoteLanguage]
): number {
  divider(doc, y);
  const top = y + 13 * PX;
  blockLabel(doc, t.opmerkingen, top);

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
  isOfferte: boolean,
  t: (typeof DOCUMENT_LABELS)[QuoteLanguage]
): number {
  divider(doc, y);
  let rowY = y + 8 * PX;

  const rows: Array<{ label: string; value: string; muted?: boolean }> = [
    { label: `${t.verkoopprijs}${pricing.pct ? ` ${t.exclBtw}` : ""}`, value: formatEuro(pricing.excl) },
    { label: `${t.btw} ${pricing.pct}%`, value: formatEuro(pricing.vat) },
    { label: `${t.totaal}${pricing.pct ? ` ${t.inclBtw}` : ""}`, value: formatEuro(pricing.total) }
  ];
  if (pricing.tradeIn) rows.push({ label: t.overname, value: `– ${formatEuro(pricing.tradeIn)}`, muted: true });
  if (pricing.deposit) {
    rows.push({
      label: isOfferte ? t.voorschotBijBestelling : t.voorschot,
      value: `– ${formatEuro(pricing.deposit)}`,
      muted: true
    });
  }

  const rowFontSize = 12 * PX;
  const rowPadding = 6 * PX;

  for (const row of rows) {
    doc
      .font("Regular")
      .fontSize(rowFontSize)
      .fillColor(row.muted ? GREY : INK)
      .text(row.label, MARGIN_X, rowY + rowPadding, { continued: true, width: CONTENT_W });
    doc.text(row.value, { align: "right" });

    // Rijhoogte = boven-/onderpadding + de werkelijke teksthoogte, anders overlappen
    // de prijsregels elkaar (de vaste stap van vroeger was te klein voor dit lettertype).
    const lineH = doc.heightOfString(row.label, { width: CONTENT_W });
    rowY += rowPadding * 2 + lineH;
    divider(doc, rowY);
  }

  const barH = 10 * PX * 2 + 4 * PX;
  doc.rect(MARGIN_X, rowY, CONTENT_W, barH).fill(INK);
  doc
    .font("Regular")
    .fontSize(9.5 * PX)
    .fillColor(WHITE)
    .text(t.saldoBijLevering, MARGIN_X + 14 * PX, rowY + barH / 2 - 5 * PX, {
      characterSpacing: 9.5 * PX * 0.3,
      continued: true,
      width: CONTENT_W - 28 * PX
    });
  doc.font("Regular").fontSize(18 * PX).text(formatEuro(pricing.balance), { align: "right" });

  rowY += barH + 5 * PX;

  const note = !pricing.pct ? t.margeregelingNote : !isOfferte ? t.saldoNote : "";

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
}

function renderAcceptance(doc: PDFKit.PDFDocument, y: number, date: Date, language: QuoteLanguage): number {
  const text = ORDER_ACCEPTANCE_TEXT[language].replace("{datum}", formatDateBE(date));
  doc.font("Regular").fontSize(9 * PX).fillColor(GREY).text(text, MARGIN_X, y + 14 * PX, { width: CONTENT_W });
  const h = doc.heightOfString(text, { width: CONTENT_W });
  return y + 14 * PX + h + 12 * PX;
}

function renderSignatures(doc: PDFKit.PDFDocument, y: number, t: (typeof DOCUMENT_LABELS)[QuoteLanguage]) {
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
    .text(t.handtekeningVerkoper, MARGIN_X, lineY + 4 * PX, { characterSpacing: 8 * PX * 0.25, width: colW });
  doc.text(t.handtekeningKoper, MARGIN_X + colW + 34 * PX, lineY + 4 * PX, {
    characterSpacing: 8 * PX * 0.25,
    width: colW
  });
}

// Tekent één regel opgebouwd uit meerdere kleuren, gecentreerd als geheel.
// (pdfkit's combinatie van `continued: true` met `align: "center"` centreert elk
// tekstfragment apart in plaats van de hele regel als één geheel, waardoor de
// stukken over elkaar heen worden getekend — vandaar deze eigen implementatie.)
function centeredMultiColor(
  doc: PDFKit.PDFDocument,
  y: number,
  fontSize: number,
  parts: Array<{ text: string; color: string; characterSpacing?: number }>
) {
  doc.font("Regular").fontSize(fontSize);
  const widths = parts.map((part) =>
    doc.widthOfString(part.text, { characterSpacing: part.characterSpacing ?? 0 })
  );
  const totalWidth = widths.reduce((sum, w) => sum + w, 0);

  let x = MARGIN_X + Math.max(0, (CONTENT_W - totalWidth) / 2);
  parts.forEach((part, index) => {
    doc
      .fillColor(part.color)
      .text(part.text, x, y, { lineBreak: false, characterSpacing: part.characterSpacing ?? 0 });
    x += widths[index];
  });
}

function renderFooter(doc: PDFKit.PDFDocument) {
  // De voettekst wordt vanaf de onderkant van de pagina opgebouwd (net als
  // "bottom: 22px" in de referentie), zodat er altijd evenveel lucht onder
  // blijft staan — ongeacht hoe hoog de regels precies uitvallen.
  const bottomMargin = 22 * PX;
  const lineGap = 3 * PX;

  const companyText = "MARTENS EXCLUSIVE BV ";
  const addressText = "Assesteenweg 122/3, 1750 Sint-Kwintens-Lennik · BTW BE 0707.682.405 · RPR Brussel";
  const bankText =
    "KBC BE26 7340 7840 7129 (KREDBEBB) · Belfius BE78 0689 4014 9386 (GKCCBEBB) · info@martens-exclusive.be · +32 484 28 85 48 · martens-exclusive.be";

  doc.font("Regular").fontSize(7.3 * PX);
  const bankHeight = doc.heightOfString(bankText, { width: CONTENT_W });
  const addressLineHeight = doc.heightOfString(addressText, { width: CONTENT_W });

  const bankTop = PAGE_H - bottomMargin - bankHeight;
  const addressTop = bankTop - lineGap - addressLineHeight;
  const dividerY = addressTop - 7 * PX;

  divider(doc, dividerY);

  centeredMultiColor(doc, addressTop, 7.3 * PX, [
    { text: companyText, color: INK, characterSpacing: 7.3 * PX * 0.25 },
    { text: addressText, color: GREY }
  ]);

  doc
    .font("Regular")
    .fontSize(7.3 * PX)
    .fillColor(GREY)
    .text(bankText, MARGIN_X, bankTop, { width: CONTENT_W, align: "center" });
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
  equipment: Array<{ kind: "category" | "item"; label: string }>,
  t: (typeof DOCUMENT_LABELS)[QuoteLanguage]
) {
  const top = pageHeading(doc, t.uitrusting, quote.vehicleTitle);

  const colGap = 34 * PX;
  const colW = (CONTENT_W - colGap) / 2;
  const categoryGap = 12 * PX; // extra lucht boven een categorie, behalve de allereerste
  const itemGap = 4 * PX;

  // Elk item krijgt zijn globale positie mee, zodat de kolomsplitsing hieronder
  // en het tekenen verderop exact dezelfde hoogtes gebruiken.
  const tagged = equipment.map((entry, i) => ({ ...entry, i }));

  const heights = tagged.map((entry) =>
    entry.kind === "category"
      ? 20 * PX + (entry.i > 0 ? categoryGap : 0)
      : doc.heightOfString(entry.label, { width: colW - 12 * PX }) + itemGap
  );
  const total = heights.reduce((sum, h) => sum + h, 0);

  // Splits enkel vóór een categorie, nooit halverwege een categorie en zijn
  // eigen items: anders komt een kopje verweesd onderaan een kolom te staan
  // terwijl zijn items in de volgende kolom belanden.
  let running = 0;
  let splitAt = tagged.length;
  for (let i = 0; i < tagged.length; i++) {
    running += heights[i];
    const next = tagged[i + 1];
    if (running >= total / 2 && next && next.kind === "category") {
      splitAt = i + 1;
      break;
    }
  }

  const columns: Array<typeof tagged> = [tagged.slice(0, splitAt), tagged.slice(splitAt)];

  columns.forEach((entries, col) => {
    let y = top;
    const x = MARGIN_X + col * (colW + colGap);

    entries.forEach((entry) => {
      if (entry.kind === "category") {
        if (entry.i > 0) y += categoryGap;
        doc
          .font("SemiBold")
          .fontSize(9 * PX)
          .fillColor(INK)
          .text(entry.label, x, y, { characterSpacing: 9 * PX * 0.28, width: colW });
        y += 20 * PX;
      } else {
        doc.font("Regular").fontSize(10.5 * PX).fillColor(GREY).text("–", x, y, { width: 10 * PX, lineBreak: false });
        doc
          .font("Regular")
          .fontSize(10.5 * PX)
          .fillColor(INK)
          .text(entry.label, x + 12 * PX, y, { width: colW - 12 * PX });
        y += doc.heightOfString(entry.label, { width: colW - 12 * PX }) + itemGap;
      }
    });
  });

  renderFooter(doc);
}

function renderPhotosPage(doc: PDFKit.PDFDocument, quote: QuoteRecord, t: (typeof DOCUMENT_LABELS)[QuoteLanguage]) {
  const top = pageHeading(doc, t.fotos, quote.vehicleTitle);

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
