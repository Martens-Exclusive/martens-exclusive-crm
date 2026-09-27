"use client";

import Link from "next/link";
import { Josefin_Sans } from "next/font/google";
import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes
} from "react";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { addQuotePhoto, deleteQuote, moveQuotePhoto, removeQuotePhoto, saveQuote } from "../actions";
import { calcQuotePricing, formatDateBE, formatEuro, parseAmount } from "@/lib/quote-calc";
import {
  DOC_CHECKLIST,
  DOCUMENT_LABELS,
  FINANCING_CLAUSE,
  ORDER_ACCEPTANCE_TEXT,
  QUOTE_TYPE_LABELS,
  VEHICLE_SPECS
} from "@/lib/quote-content";
import { pairSpecRows, parseEquipment, parseRemarks, vehicleSpecRows } from "@/lib/quote-view";
import { TERMS } from "@/lib/quote-terms";

import styles from "./quote-document.module.css";

const josefin = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  display: "swap",
  variable: "--quote-font"
});

export type QuoteEditorInitial = {
  id: string;
  leadId: string;
  type: "OFFERTE" | "BESTELBON";
  language: "NL" | "FR" | "EN";
  date: string;
  validUntil: string;
  vehicleTitle: string;
  chassisNumber: string;
  mileage: string;
  firstRegistration: string;
  fuelType: string;
  transmission: string;
  displacement: string;
  power: string;
  co2: string;
  euroNorm: string;
  warranty: string;
  exterior: string;
  interior: string;
  docKeys: boolean;
  docMaintenanceBooklet: boolean;
  docCarPass: boolean;
  docRegistration: boolean;
  docCoc: boolean;
  docWarranty: boolean;
  remarks: string;
  vatType: number;
  priceIncludesVat: boolean;
  salePrice: string;
  tradeIn: string;
  deposit: string;
  biv: string;
  annualRoadTax: string;
  equipmentText: string;
  closingText: string;
  photoUrls: string[];
  buyer: {
    name: string;
    companyName: string;
    vatNumber: string;
    address: string;
    email: string;
    phone: string;
  };
};

type QuoteState = Omit<QuoteEditorInitial, "buyer">;

type BoolKey =
  | "docKeys"
  | "docMaintenanceBooklet"
  | "docCarPass"
  | "docRegistration"
  | "docCoc"
  | "docWarranty";

type StringKey = Exclude<keyof QuoteState, BoolKey | "vatType" | "photoUrls" | "priceIncludesVat">;

const nlBeFormat = (value: number) =>
  value.toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function QuoteEditor({ initial }: { initial: QuoteEditorInitial }) {
  const { buyer } = initial;
  const [q, setQ] = useState<QuoteState>(() => {
    const { buyer: _buyer, ...rest } = initial;
    return rest;
  });
  const [savedLabel, setSavedLabel] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const isOfferte = q.type === "OFFERTE";

  const mounted = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    setSavedLabel("Wijzigingen opslaan…");

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      const result = await saveQuote(q.id, {
        language: q.language,
        date: q.date,
        validUntil: q.validUntil || null,
        vehicleTitle: q.vehicleTitle,
        chassisNumber: q.chassisNumber,
        mileage: q.mileage,
        firstRegistration: q.firstRegistration,
        fuelType: q.fuelType,
        transmission: q.transmission,
        displacement: q.displacement,
        power: q.power,
        co2: q.co2,
        euroNorm: q.euroNorm,
        warranty: q.warranty,
        exterior: q.exterior,
        interior: q.interior,
        docKeys: q.docKeys,
        docMaintenanceBooklet: q.docMaintenanceBooklet,
        docCarPass: q.docCarPass,
        docRegistration: q.docRegistration,
        docCoc: q.docCoc,
        docWarranty: q.docWarranty,
        remarks: q.remarks,
        vatType: q.vatType,
        priceIncludesVat: q.priceIncludesVat,
        salePrice: q.salePrice,
        tradeIn: q.tradeIn,
        deposit: q.deposit,
        biv: q.biv || null,
        annualRoadTax: q.annualRoadTax || null,
        equipmentText: q.equipmentText,
        closingText: q.closingText
      });
      setSavedLabel(result.ok ? "Opgeslagen" : "Niet opgeslagen");
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const pricing = useMemo(
    () =>
      calcQuotePricing({
        vatType: q.vatType,
        priceIncludesVat: q.priceIncludesVat,
        salePrice: parseAmount(q.salePrice),
        tradeIn: parseAmount(q.tradeIn),
        deposit: parseAmount(q.deposit)
      }),
    [q.vatType, q.priceIncludesVat, q.salePrice, q.tradeIn, q.deposit]
  );

  function field(key: StringKey) {
    return {
      value: q[key],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setQ((prev) => ({ ...prev, [key]: e.target.value }) as QuoteState)
    };
  }

  function toggleDoc(key: BoolKey) {
    setQ((prev) => ({ ...prev, [key]: !prev[key] }) as QuoteState);
  }

  function setVatType(vatType: number) {
    setQ((prev) => ({ ...prev, vatType }));
  }

  function setLanguage(language: "NL" | "FR" | "EN") {
    setQ((prev) => ({ ...prev, language }));
  }

  function setPriceIncludesVat(nextIncl: boolean) {
    setQ((prev) => {
      const current = calcQuotePricing({
        vatType: prev.vatType,
        priceIncludesVat: prev.priceIncludesVat,
        salePrice: parseAmount(prev.salePrice),
        tradeIn: parseAmount(prev.tradeIn),
        deposit: parseAmount(prev.deposit)
      });
      const nextValue = nextIncl ? current.total : current.excl;
      return {
        ...prev,
        priceIncludesVat: nextIncl,
        salePrice: nlBeFormat(nextValue)
      };
    });
  }

  function addFinancingClause() {
    setQ((prev) => {
      if (prev.remarks.includes("Financiering:") || prev.remarks.includes("Financement :")) return prev;
      return {
        ...prev,
        remarks: (prev.remarks ? prev.remarks.trim() + "\n" : "") + FINANCING_CLAUSE[prev.language]
      };
    });
  }

  async function shrinkImage(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Verkleinen mislukt"))),
        "image/jpeg",
        0.86
      );
    });
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || !files.length) return;

    const remaining = 8 - q.photoUrls.length;
    const selected = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining);

    if (!selected.length) return;

    setPhotoBusy(true);
    setPhotoError("");

    for (const file of selected) {
      try {
        const shrunk = await shrinkImage(file);
        const dataUrl = await blobToDataUrl(shrunk);
        const result = await addQuotePhoto(q.id, dataUrl);

        if (result.ok) {
          setQ((prev) => ({ ...prev, photoUrls: [...prev.photoUrls, dataUrl] }));
        } else {
          setPhotoError(result.error || "Upload mislukt.");
        }
      } catch {
        setPhotoError(`Upload mislukt: ${file.name}`);
      }
    }

    setPhotoBusy(false);
  }

  async function handleRemovePhoto(index: number) {
    const result = await removeQuotePhoto(q.id, index);
    if (result.ok) {
      setQ((prev) => ({ ...prev, photoUrls: prev.photoUrls.filter((_, i) => i !== index) }));
    }
  }

  async function handleMovePhoto(index: number, direction: -1 | 1) {
    const result = await moveQuotePhoto(q.id, index, direction);
    if (result.ok) {
      setQ((prev) => {
        const next = [...prev.photoUrls];
        const target = index + direction;
        if (target < 0 || target >= next.length) return prev;
        [next[index], next[target]] = [next[target], next[index]];
        return { ...prev, photoUrls: next };
      });
    }
  }

  const previewRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState<number>();

  useEffect(() => {
    function fit() {
      const preview = previewRef.current;
      if (!preview) return;
      setScale(Math.min(1, (preview.clientWidth - 40) / 794));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useLayoutEffect(() => {
    if (pagesRef.current) {
      setPreviewHeight(pagesRef.current.scrollHeight * scale);
    }
  });

  const remarkParagraphs = useMemo(() => parseRemarks(q.remarks), [q.remarks]);
  const equipmentEntries = useMemo(() => parseEquipment(q.equipmentText), [q.equipmentText]);
  const specRows = useMemo(
    () =>
      pairSpecRows(
        vehicleSpecRows({
          chassisNumber: q.chassisNumber,
          mileage: q.mileage,
          firstRegistration: q.firstRegistration,
          fuelType: q.fuelType,
          transmission: q.transmission,
          displacement: q.displacement,
          power: q.power,
          co2: q.co2,
          euroNorm: q.euroNorm,
          warranty: q.warranty,
          exterior: q.exterior,
          interior: q.interior
        }, q.language)
      ),
    [q]
  );

  const hasFiscal = isOfferte && (parseAmount(q.biv) > 0 || parseAmount(q.annualRoadTax) > 0);

  return (
    <div className={`${josefin.className} ${josefin.variable} grid gap-0 lg:grid-cols-[minmax(380px,460px)_1fr]`}>
      <section className="border-b border-black/10 bg-white lg:border-b-0 lg:border-r print:hidden">
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-black/10 bg-white px-6 py-4">
          <Link href={`/leads/${q.leadId}`} className="text-sm text-black/50 hover:text-black">
            ← Terug naar lead
          </Link>

          <h1 className="flex-1 text-lg font-bold text-black">
            {QUOTE_TYPE_LABELS[q.type] ?? q.type}
          </h1>

          <span className="text-xs text-black/45">{savedLabel}</span>

          <div className="flex w-full gap-2">
            <a
              href={`/api/quotes/${q.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-black/15 bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/80"
            >
              PDF downloaden
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#ececec]"
            >
              Afdrukken
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 px-6 py-6">
          <section className="flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">Algemeen</h4>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-black/55">Taal van het document</span>
              <Segmented
                options={[
                  { value: "NL", label: "Nederlands" },
                  { value: "FR", label: "Frans" },
                  { value: "EN", label: "Engels" }
                ]}
                value={q.language}
                onChange={setLanguage}
              />
              <span className="text-xs text-black/40">
                Op elk moment aanpasbaar — ook nadat de offerte/bestelbon al is aangemaakt.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LabeledInput label="Datum" type="date" {...field("date")} />
              {isOfferte ? <LabeledInput label="Geldig tot" type="date" {...field("validUntil")} /> : null}
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-black/8 pt-6">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">Wagen</h4>
            <LabeledInput label="Merk en model" placeholder="bv. Porsche 911 Turbo S Coupé" {...field("vehicleTitle")} />
            <div className="grid grid-cols-2 gap-3">
              {VEHICLE_SPECS.map((spec) => (
                <LabeledInput
                  key={spec.key}
                  label={spec.label.NL}
                  placeholder={spec.placeholder}
                  {...field(spec.key as StringKey)}
                />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-black/8 pt-6">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">Documenten</h4>
            <div className="grid grid-cols-2 gap-2">
              {DOC_CHECKLIST.map((doc) => (
                <label key={doc.key} className="flex items-center gap-2 text-sm text-black">
                  <input
                    type="checkbox"
                    checked={Boolean(q[doc.key as BoolKey])}
                    onChange={() => toggleDoc(doc.key as BoolKey)}
                    className="h-4 w-4 accent-black"
                  />
                  {doc.label.NL}
                </label>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-black/8 pt-6">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">Prijzen</h4>

            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                options={[
                  { value: 21, label: "Btw 21%" },
                  { value: 0, label: "Margeregeling" }
                ]}
                value={q.vatType}
                onChange={setVatType}
              />

              {q.vatType === 21 ? (
                <Segmented
                  options={[
                    { value: 1, label: "Incl. btw" },
                    { value: 0, label: "Excl. btw" }
                  ]}
                  value={q.priceIncludesVat ? 1 : 0}
                  onChange={(v) => setPriceIncludesVat(v === 1)}
                />
              ) : null}
            </div>

            <LabeledInput
              label={`Verkoopprijs${q.vatType === 21 ? (q.priceIncludesVat ? " (incl. btw)" : " (excl. btw)") : ""}`}
              placeholder="0,00"
              money
              {...field("salePrice")}
            />
            <div className="grid grid-cols-2 gap-3">
              <LabeledInput label="Overname" placeholder="0,00" money {...field("tradeIn")} />
              <LabeledInput label="Voorschot" placeholder="0,00" money {...field("deposit")} />
            </div>

            <div className="overflow-hidden rounded-xl border border-black/15">
              <OverviewRow label={`Verkoopprijs${pricing.pct ? " excl. btw" : ""}`} value={formatEuro(pricing.excl)} />
              <OverviewRow label={`Btw ${pricing.pct}%`} value={formatEuro(pricing.vat)} />
              <OverviewRow label={`Totaal${pricing.pct ? " incl. btw" : ""}`} value={formatEuro(pricing.total)} />
              <OverviewRow label="Overname" value={`– ${formatEuro(pricing.tradeIn)}`} muted />
              <OverviewRow label="Voorschot" value={`– ${formatEuro(pricing.deposit)}`} muted />
              <div className="flex items-center justify-between bg-black px-3.5 py-3 text-sm font-semibold text-white">
                <span>Saldo bij levering</span>
                <span>{formatEuro(pricing.balance)}</span>
              </div>
            </div>

            {isOfferte ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput label="Belasting op inverkeerstelling" placeholder="0,00" money {...field("biv")} />
                  <LabeledInput label="Jaarlijkse verkeersbelasting" placeholder="0,00" money {...field("annualRoadTax")} />
                </div>
                <p className="text-xs leading-5 text-black/50">
                  Enkel ter info op de offerte. Leeg laten om weg te laten.
                </p>
              </>
            ) : null}
          </section>

          <section className="flex flex-col gap-3 border-t border-black/8 pt-6">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">Opmerkingen</h4>
            <LabeledTextarea
              label='Eén opmerking per regel. Schrijf "Titel: tekst" voor een vetgedrukte titel.'
              rows={4}
              placeholder="Bij levering: Plaatsing langdurige coating via Carcleaniq."
              {...field("remarks")}
            />
            <button
              type="button"
              onClick={addFinancingClause}
              className="text-left text-xs font-semibold text-black underline underline-offset-2"
            >
              Financieringsclausule toevoegen
            </button>
          </section>

          {isOfferte ? (
            <>
              <section className="flex flex-col gap-3 border-t border-black/8 pt-6">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">
                  Foto&apos;s <span className="font-normal text-black/40">({q.photoUrls.length}/8)</span>
                </h4>

                <div className="grid grid-cols-4 gap-2">
                  {q.photoUrls.map((url, index) => (
                    <div key={index} className="relative aspect-[3/2] overflow-hidden rounded-lg bg-[#eeedea]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        aria-label="Foto verwijderen"
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-xs text-white"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-1 left-1 flex gap-1">
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleMovePhoto(index, -1)}
                            aria-label="Naar voor"
                            className="flex h-5 w-5 items-center justify-center rounded bg-white/90 text-xs"
                          >
                            ‹
                          </button>
                        ) : null}
                        {index < q.photoUrls.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => handleMovePhoto(index, 1)}
                            aria-label="Naar achter"
                            className="flex h-5 w-5 items-center justify-center rounded bg-white/90 text-xs"
                          >
                            ›
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {q.photoUrls.length < 8 ? (
                    <label
                      className={`flex aspect-[3/2] cursor-pointer items-center justify-center rounded-lg border border-dashed border-black/25 text-center text-[11px] text-black/50 hover:border-black hover:text-black ${
                        photoBusy ? "cursor-wait" : ""
                      }`}
                    >
                      {photoBusy ? "Uploaden…" : "Foto's toevoegen"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => {
                          handlePhotoUpload(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                </div>

                {photoError ? <p className="text-xs text-red-600">{photoError}</p> : null}
                <p className="text-xs leading-5 text-black/50">
                  Eerste foto komt bovenaan de fotopagina. Gebruik de pijltjes om de volgorde te wijzigen.
                </p>
              </section>

              <section className="flex flex-col gap-3 border-t border-black/8 pt-6">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">Uitrusting</h4>
                <LabeledTextarea
                  label="Eén optie per regel. Begin een regel met # voor een categorie."
                  rows={10}
                  placeholder={"# Comfort\nStoelverwarming voor\nElektrisch verstelbare voorstoelen met geheugen\n# Multimedia\nHiFi-luidsprekersysteem"}
                  {...field("equipmentText")}
                />
              </section>

              <section className="flex flex-col gap-3 border-t border-black/8 pt-6">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">Afsluitende tekst</h4>
                <LabeledTextarea label="Staat onder de prijzen op de offerte." rows={4} {...field("closingText")} />
              </section>
            </>
          ) : null}

          <section className="border-t border-black/8 pt-6">
            <form
              action={deleteQuote}
              onSubmit={(e) => {
                if (!window.confirm(`Deze ${isOfferte ? "offerte" : "bestelbon"} definitief verwijderen?`)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="quoteId" value={q.id} />
              <input type="hidden" name="leadId" value={q.leadId} />
              <button type="submit" className="text-xs font-semibold text-red-700 underline underline-offset-2">
                {QUOTE_TYPE_LABELS[q.type] ?? q.type} verwijderen
              </button>
            </form>
          </section>
        </div>
      </section>

      <section
        ref={previewRef}
        className="overflow-auto bg-[#eeedea] px-5 py-7"
        style={{ height: previewHeight ? previewHeight + 40 : undefined }}
      >
        <div
          ref={pagesRef}
          className={styles.pagesWrap}
          style={{ transform: `scale(${scale})`, width: 794 }}
        >
          <QuoteDocument q={q} pricing={pricing} buyer={buyer} remarkParagraphs={remarkParagraphs} equipmentEntries={equipmentEntries} specRows={specRows} hasFiscal={hasFiscal} />
        </div>
      </section>
    </div>
  );
}

function LabeledInput({
  label,
  money,
  ...props
}: { label: string; money?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-black/60">
      {label}
      <span className="relative block">
        {money ? (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 text-sm text-black/40">€</span>
        ) : null}
        <input
          {...props}
          className={`w-full rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm text-black outline-none focus:border-black ${
            money ? "pl-6 text-right" : ""
          }`}
        />
      </span>
    </label>
  );
}

function LabeledTextarea({
  label,
  rows = 4,
  ...props
}: { label: string; rows?: number } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-black/60">
      {label}
      <textarea
        rows={rows}
        {...props}
        className="w-full resize-y rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm text-black outline-none focus:border-black"
      />
    </label>
  );
}

function Segmented<T extends number | string>({
  options,
  value,
  onChange
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-black/15">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-3 py-2 text-xs font-medium ${
            value === option.value ? "bg-black text-white" : "bg-white text-black"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function OverviewRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-t border-[#eeedea] px-3.5 py-2.5 text-sm first:border-t-0 ${
        muted ? "text-black/50" : "text-black"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

type Pricing = ReturnType<typeof calcQuotePricing>;

function QuoteDocument({
  q,
  pricing,
  buyer,
  remarkParagraphs,
  equipmentEntries,
  specRows,
  hasFiscal
}: {
  q: QuoteState;
  pricing: Pricing;
  buyer: QuoteEditorInitial["buyer"];
  remarkParagraphs: ReturnType<typeof parseRemarks>;
  equipmentEntries: ReturnType<typeof parseEquipment>;
  specRows: Array<[string, string, string, string]>;
  hasFiscal: boolean;
}) {
  const isOfferte = q.type === "OFFERTE";
  const equipmentLines = equipmentEntries.length > 0;
  const photoLines = q.photoUrls.length > 0;
  const t = DOCUMENT_LABELS[q.language];
  const acceptanceText = ORDER_ACCEPTANCE_TEXT[q.language].replace("{datum}", formatDateBE(q.date) || "…");

  return (
    <>
      <div className={styles.pw}>
        <div className={styles.page}>
          <div className={styles.band}>
            <div className={styles.kindRow}>
              <div className={styles.kind}>{isOfferte ? t.kind.OFFERTE : t.kind.BESTELBON}</div>
            </div>
            <div className={styles.titleRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Martens Exclusive" />
              <h1>{q.vehicleTitle || " "}</h1>
            </div>
            <div className={styles.meta}>
              <span>
                <b>{t.datum}</b>
                {formatDateBE(q.date)}
              </span>
              {isOfferte && q.validUntil ? (
                <span>
                  <b>{t.geldigTot}</b>
                  {formatDateBE(q.validUntil)}
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ height: 10 }} />

          <KvBlock label={isOfferte ? t.voor : t.koper} noDivider>
            <KvGrid
              rows={[
                [t.naam, buyer.name, t.bedrijf, buyer.companyName || "–"],
                [t.adres, buyer.address, t.btwNummer, buyer.vatNumber || "–"],
                [t.email, buyer.email, t.telefoon, buyer.phone]
              ]}
            />
          </KvBlock>

          <KvBlock label={t.voertuig}>
            <KvGrid rows={specRows} />
          </KvBlock>

          <div className={styles.blk}>
            <div className={styles.lab}>{t.documenten}</div>
            <div className={styles.docs}>
              {DOC_CHECKLIST.map((doc) => {
                const checked = Boolean(q[doc.key as keyof QuoteState]);
                return (
                  <span key={doc.key} className={checked ? "" : styles.no}>
                    <i>{checked ? "✓" : ""}</i>
                    {doc.label[q.language]}
                  </span>
                );
              })}
            </div>
          </div>

          {hasFiscal ? (
            <div className={styles.blk}>
              <div className={styles.lab}>{t.fiscaal}</div>
              <div>
                <div className={styles.kv}>
                  {parseAmount(q.biv) > 0 ? (
                    <>
                      <span className={styles.k} style={{ gridColumn: "span 1" }}>
                        {t.biv}
                      </span>
                      <span className={styles.v}>{formatEuro(parseAmount(q.biv))}</span>
                    </>
                  ) : null}
                  {parseAmount(q.annualRoadTax) > 0 ? (
                    <>
                      <span className={styles.k}>{t.verkeersbelasting}</span>
                      <span className={styles.v}>
                        {formatEuro(parseAmount(q.annualRoadTax))} / {t.perJaar}
                      </span>
                    </>
                  ) : null}
                </div>
                <div className={styles.note}>{t.fiscaalNote}</div>
              </div>
            </div>
          ) : null}

          {remarkParagraphs.length > 0 ? (
            <KvBlock label={t.opmerkingen}>
              <div className={styles.opm}>
                {remarkParagraphs.map((p, i) => (
                  <p key={i}>
                    {p.title ? <b>{p.title}</b> : null}
                    {p.title ? "  " : ""}
                    {p.text}
                  </p>
                ))}
              </div>
            </KvBlock>
          ) : null}

          <div className={styles.prices}>
            <div className={styles.r}>
              <span>
                {t.verkoopprijs}
                {pricing.pct ? ` ${t.exclBtw}` : ""}
              </span>
              <span className={styles.a}>{formatEuro(pricing.excl)}</span>
            </div>
            <div className={styles.r}>
              <span>
                {t.btw} {pricing.pct}%
              </span>
              <span className={styles.a}>{formatEuro(pricing.vat)}</span>
            </div>
            <div className={styles.r}>
              <span>
                {t.totaal}
                {pricing.pct ? ` ${t.inclBtw}` : ""}
              </span>
              <span className={styles.a}>{formatEuro(pricing.total)}</span>
            </div>
            {pricing.tradeIn ? (
              <div className={`${styles.r} ${styles.g}`}>
                <span>{t.overname}</span>
                <span className={styles.a}>– {formatEuro(pricing.tradeIn)}</span>
              </div>
            ) : null}
            {pricing.deposit ? (
              <div className={`${styles.r} ${styles.g}`}>
                <span>{isOfferte ? t.voorschotBijBestelling : t.voorschot}</span>
                <span className={styles.a}>– {formatEuro(pricing.deposit)}</span>
              </div>
            ) : null}
            <div className={styles.t}>
              <span className={styles.l}>{t.saldoBijLevering}</span>
              <span className={styles.a}>{formatEuro(pricing.balance)}</span>
            </div>
            <div className={styles.note}>
              {!pricing.pct ? t.margeregelingNote : ""}
              {!isOfferte ? t.saldoNote : ""}
            </div>
          </div>

          {isOfferte ? (
            <div className={styles.slot}>
              {(q.closingText || "").split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
            </div>
          ) : (
            <>
              <div className={styles.accept}>{acceptanceText}</div>
              <div className={styles.sigs}>
                <div>{t.handtekeningVerkoper}</div>
                <div>{t.handtekeningKoper}</div>
              </div>
            </>
          )}

          <PageFoot />
        </div>
      </div>

      {isOfferte && equipmentLines ? (
        <div className={styles.pw}>
          <div className={styles.page}>
            <div className={styles.ph}>{t.uitrusting}</div>
            <small>{q.vehicleTitle}</small>
            <div className={`${styles.cols} ${styles.opt}`}>
              {equipmentEntries.map((entry, i) =>
                entry.kind === "category" ? <h5 key={i}>{entry.label}</h5> : <div key={i}>{entry.label}</div>
              )}
            </div>
            <PageFoot />
          </div>
        </div>
      ) : null}

      {isOfferte && photoLines ? (
        <div className={styles.pw}>
          <div className={styles.page}>
            <div className={styles.ph}>{t.fotos}</div>
            <small>{q.vehicleTitle}</small>
            <div className={styles.fgrid}>
              {q.photoUrls.map((url, i) => (
                <div key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" />
                </div>
              ))}
            </div>
            <PageFoot />
          </div>
        </div>
      ) : null}

      <TermsPage title={t.termsTitle} subtitle={t.termsSubtitle} sections={TERMS[q.language]} />
    </>
  );
}

function KvBlock({
  label,
  children,
  noDivider
}: {
  label: string;
  children: ReactNode;
  noDivider?: boolean;
}) {
  return (
    <div className={noDivider ? `${styles.blk} ${styles.first}` : styles.blk}>
      <div className={styles.lab}>{label}</div>
      {children}
    </div>
  );
}

function KvGrid({ rows }: { rows: Array<[string, string, string?, string?]> }) {
  return (
    <div className={styles.kv}>
      {rows.map(([labelA, valueA, labelB, valueB], i) => (
        <Fragment key={i}>
          <span className={styles.k}>{labelA}</span>
          <span className={styles.v}>{valueA || "–"}</span>
          <span className={styles.k}>{labelB || ""}</span>
          <span className={styles.v}>{labelB ? valueB || "–" : ""}</span>
        </Fragment>
      ))}
    </div>
  );
}

function TermsPage({
  title,
  subtitle,
  sections
}: {
  title: string;
  subtitle: string;
  sections: Array<[string, ...string[]]>;
}) {
  return (
    <div className={styles.pw}>
      <div className={styles.page}>
        <div className={styles.vwt}>{title}</div>
        <small>{subtitle}</small>
        <div className={styles.vw}>
          {sections.map(([heading, ...paragraphs], i) => (
            <div key={i}>
              <h6>{heading}</h6>
              {paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          ))}
        </div>
        <PageFoot />
      </div>
    </div>
  );
}

function PageFoot() {
  return (
    <div className={styles.foot}>
      <b>MARTENS EXCLUSIVE BV</b> Assesteenweg 122/3, 1750 Sint-Kwintens-Lennik &nbsp;·&nbsp; BTW BE 0707.682.405
      &nbsp;·&nbsp; RPR Brussel
      <br />
      KBC BE26 7340 7840 7129 (KREDBEBB) &nbsp;·&nbsp; Belfius BE78 0689 4014 9386 (GKCCBEBB) &nbsp;·&nbsp;
      info@martens-exclusive.be &nbsp;·&nbsp; +32 484 28 85 48 &nbsp;·&nbsp; martens-exclusive.be
    </div>
  );
}
