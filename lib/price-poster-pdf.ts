import path from "path";

import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export type PricePosterData = {
  title: string; // "Mercedes-Benz C200d"
  subtitle: string; // "Business Line"
  priceEuro: number | null;
  firstRegistration: string; // "09/2022"
  mileage: string; // "65.658 km"
  fuel: string;
  power: string; // "120 kW (163pk)"
  displacement: string; // "1993 cc"
  transmission: string;
  warranty: string; // "12 Maanden"
  consumption: string; // "4,8 l/100km"
  consumptionNote: string; // "(Gecombineerd)"
  co2: string; // "125 g/km"
  euroNorm: string; // "Euro 6"
  options: string;
  adUrl: string; // big QR
  carPassUrl: string; // small QR
  adNumber: string;
};

// Lettertypes staan in /fonts (zelfde als de offerte-PDF), logo's in /assets.
// Beide mappen worden op Vercel meegepakt via outputFileTracingIncludes in next.config.ts.
const FONT_DIR = path.join(process.cwd(), "fonts");
const ASSET_DIR = path.join(process.cwd(), "assets");
const assets = {
  fontLight: path.join(FONT_DIR, "JosefinSans-Light.ttf"),
  fontRegular: path.join(FONT_DIR, "JosefinSans-Regular.ttf"),
  fontBold: path.join(FONT_DIR, "JosefinSans-SemiBold.ttf"),
  logoPng: path.join(ASSET_DIR, "poster-logo.png"),
  carPassPng: path.join(ASSET_DIR, "poster-carpass.png")
};

const SPEC = 11;
const FOOT = 10;
const INK = "#111111";
const GREY = "#9a9a9a";
const MARGIN = 28.2;
const PAGE_W = 595.28;

function ascent(doc: PDFKit.PDFDocument, size: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const font = (doc as any)._font;
  return ((font?.ascender ?? 900) / 1000) * size;
}

function formatPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Prijs op aanvraag";
  const rounded = Math.round(value);
  return `€${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")},-`;
}

function drawQr(doc: PDFKit.PDFDocument, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 2; // modules of white border (kept invisible on white paper)
  const cell = size / (n + quiet * 2);
  doc.save().fillColor("#000000");
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) {
        c++;
        continue;
      }
      let end = c;
      while (end + 1 < n && qr.modules.get(r, end + 1)) end++;
      doc.rect(x + (c + quiet) * cell, y + (r + quiet) * cell, (end - c + 1) * cell + 0.15, cell + 0.15);
      c = end + 1;
    }
  }
  doc.fill();
  doc.restore();
}

export function buildPricePosterPdf(data: PricePosterData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: { Title: `Prijsaffiche ${data.title}`, Author: "Martens Exclusive" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("light", assets.fontLight);
    doc.registerFont("regular", assets.fontRegular);
    doc.registerFont("bold", assets.fontBold);

    // Header: wordmark + rule
    const logoW = 147.2;
    const logoH = logoW * (585 / 2400);
    doc.image(assets.logoPng, (PAGE_W - logoW) / 2, 31, { width: logoW, height: logoH });
    doc.save().lineWidth(0.5).strokeColor(GREY).moveTo(MARGIN, 86.5).lineTo(PAGE_W - MARGIN, 86.5).stroke().restore();

    // Title (brand + model bold, variant light), shrinks if too wide
    const maxTitleW = PAGE_W - MARGIN * 2;
    let titleSize = 25.5;
    const measureTitle = (s: number) => {
      doc.font("bold").fontSize(s);
      const a = doc.widthOfString(data.title);
      doc.font("light").fontSize(s * 0.72);
      const b = data.subtitle ? doc.widthOfString(` ${data.subtitle}`) : 0;
      return a + b;
    };
    while (titleSize > 12 && measureTitle(titleSize) > maxTitleW) titleSize -= 0.5;
    const titleY = 105.7;
    doc.font("bold").fontSize(titleSize).fillColor(INK);
    const titleW = doc.widthOfString(data.title);
    const titleAscent = ascent(doc, titleSize);
    doc.text(data.title, MARGIN, titleY, { lineBreak: false });
    if (data.subtitle) {
      const subSize = titleSize * 0.72;
      doc.font("light").fontSize(subSize);
      doc.text(` ${data.subtitle}`, MARGIN + titleW, titleY + titleAscent - ascent(doc, subSize) - 3.5, { lineBreak: false });
    }

    // Price
    const price = formatPrice(data.priceEuro);
    let priceSize = data.priceEuro === null ? 40 : 70;
    doc.font("regular");
    while (priceSize > 20 && (doc.fontSize(priceSize), doc.widthOfString(price)) > maxTitleW) priceSize -= 1;
    doc.font("regular").fontSize(priceSize).fillColor(INK).text(price, MARGIN, 146.7, { lineBreak: false });

    // Specs (left column)
    const labelX = 32.2;
    const valueX = 167.2;
    let y = 276.2;
    const pitch = 13;
    const row = (label: string, value: string, extra?: string) => {
      if (!value) return; // lege velden worden overgeslagen
      doc.font("light").fontSize(SPEC).fillColor(INK);
      doc.text(label, labelX, y, { lineBreak: false });
      doc.text(value, valueX, y, { lineBreak: false });
      y += pitch;
      if (extra) {
        doc.text(extra, valueX, y, { lineBreak: false });
        y += pitch;
      }
    };
    row("1e inschrijving:", data.firstRegistration);
    row("Kilometerstand:", data.mileage);
    row("Brandstof:", data.fuel);
    row("Vermogen:", data.power);
    row("Cilinderinhoud:", data.displacement);
    row("Transmissie:", data.transmission);
    row("Garantie:", data.warranty);
    if (data.consumption || data.co2 || data.euroNorm) {
      y += pitch; // blank line
      doc.font("light").fontSize(SPEC).text("Milieu & Verbruik:", labelX, y, { lineBreak: false });
      y += pitch;
    }
    row("Brandstofverbruik:", data.consumption, data.consumptionNote || undefined);
    row("CO2-emissie:", data.co2);
    row("Emissieklasse:", data.euroNorm);

    // Options (right column)
    const optX = 301.6;
    const optW = 279;
    const optTop = 276.7;
    const optBottom = 752;
    doc.font("bold").fontSize(12).fillColor(INK).text("Opties en accessoires:", optX, optTop, { lineBreak: false });
    const optText = data.options.replace(/\s*\n+\s*/g, ", ").replace(/\s+/g, " ").replace(/,\s*,/g, ",").trim();
    if (optText) {
      // Lijnafstand 14pt bij 11,5pt; bij veel opties schaalt alles proportioneel kleiner.
      const OPT_SIZE = 11.5;
      const OPT_PITCH = 14;
      const gapFor = (s: number) => (OPT_PITCH * s) / OPT_SIZE - doc.font("light").fontSize(s).currentLineHeight();
      const fits = (s: number) => {
        doc.font("light").fontSize(s);
        return doc.heightOfString(optText, { width: optW, lineGap: gapFor(s) }) <= optBottom - (optTop + 14);
      };
      let size = OPT_SIZE;
      while (size > 6 && !fits(size)) size -= 0.25;
      doc.font("light").fontSize(size).fillColor(INK).text(optText, optX, optTop + 14, { width: optW, lineGap: gapFor(size) });
    }

    // QR codes + Car-Pass
    if (data.adUrl) drawQr(doc, data.adUrl, 26, 455.6, 212);
    if (data.carPassUrl) {
      const cpW = 119.4;
      doc.image(assets.carPassPng, 31, 699, { width: cpW, height: cpW * (187 / 650) });
      drawQr(doc, data.carPassUrl, 169.4, 682, 68.7);
    }

    // Footer
    if (data.adNumber) {
      doc.font("light").fontSize(SPEC).fillColor(INK).text(`Advertentienr.:${data.adNumber}`, 30.2, 764.2, { lineBreak: false });
    }
    doc.save().lineWidth(0.5).strokeColor(GREY).moveTo(MARGIN, 784.5).lineTo(PAGE_W - MARGIN, 784.5).stroke().restore();
    doc.font("light").fontSize(FOOT).fillColor(INK);
    doc.text("Martens Exclusive BV", 0, 797.2, { width: PAGE_W, align: "center", lineBreak: false });
    doc.text("Sint-Kwintens-Lennik", 0, 810.2, { width: PAGE_W, align: "center", lineBreak: false });

    doc.end();
  });
}
