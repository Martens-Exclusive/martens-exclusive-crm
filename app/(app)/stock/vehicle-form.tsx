"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrencyFromCents } from "@/lib/utils";
import { saveVehicle, type SaveVehicleState } from "./actions";

type VehicleFormProps = {
  vehicle?: {
    id: string;
    stockNumber: string;
    purchaseDate: string | null;
    brand: string;
    model: string;
    vin: string | null;
    mileageKm: number | null;
    inventoryType?: string | null;
    commissionType?: string | null;
    commissionRate?: number | null;
    commissionFixedExclVatCents?: number | null;
    commissionMinimumExclVatCents?: number | null;
    purchaseVatType: string | null;
    saleVatType: string | null;
    purchaseVatRate: number | null;
    saleVatRate: number | null;
    purchasePriceExclVatCents: number | null;
    salePriceExclVatCents: number | null;
    costsExclVatCents: number | null;
    status: string;
  } | null;
  /** Som van de individuele kostenposten (zie 'Kosten per voertuig' onderaan de fiche). */
  totalCostCents?: number;
  backHref?: Route;
};

const initialState: SaveVehicleState = {};

const vatTypeOptions = [
  { value: "BTW_WAGEN", label: "Btw wagen" },
  { value: "MARGE_WAGEN", label: "Marge wagen" }
] as const;

const statusOptions = [
  { value: "AVAILABLE", label: "Beschikbaar" },
  { value: "RESERVED", label: "Gereserveerd" },
  { value: "SOLD", label: "Verkocht" }
] as const;

const inventoryTypeOptions = [
  { value: "STOCK", label: "Stock" },
  { value: "CONSIGNMENT", label: "Consignatie" },
  { value: "ON_ORDER", label: "In bestelling" }
] as const;

const commissionTypeOptions = [
  { value: "PERCENTAGE", label: "Percentage %" },
  { value: "FIXED", label: "Vast bedrag" }
] as const;

function centsToInputValue(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return (value / 100).toFixed(2);
}

export function VehicleForm({
  vehicle,
  totalCostCents,
  backHref = "/stock"
}: VehicleFormProps) {
  const [state, formAction, isPending] = useActionState(saveVehicle, initialState);
  const isEditing = Boolean(vehicle);

  const [inventoryType, setInventoryType] = useState(
    vehicle?.inventoryType ?? "STOCK"
  );
  const [commissionType, setCommissionType] = useState(
    vehicle?.commissionType ?? "PERCENTAGE"
  );
  const [purchaseVatType, setPurchaseVatType] = useState(
    vehicle?.purchaseVatType ?? "BTW_WAGEN"
  );
  const [saleVatType, setSaleVatType] = useState(
    vehicle?.saleVatType ?? "BTW_WAGEN"
  );

  const isConsignment = inventoryType === "CONSIGNMENT";
  const isOnOrder = inventoryType === "ON_ORDER";
  const isFixedCommission = commissionType === "FIXED";
  const isPurchaseBtw = purchaseVatType === "BTW_WAGEN";
  const isSaleBtw = saleVatType === "BTW_WAGEN";

  // Live waarden, enkel gebruikt om de marge-indicatie hieronder meteen mee te
  // berekenen. De echte, definitieve marge wordt bij het opslaan door de
  // server berekend.
  const [salePriceInput, setSalePriceInput] = useState(
    centsToInputValue(vehicle?.salePriceExclVatCents ?? null)
  );
  const [purchasePriceInput, setPurchasePriceInput] = useState(
    centsToInputValue(vehicle?.purchasePriceExclVatCents ?? null)
  );
  const [purchaseVatRateInput, setPurchaseVatRateInput] = useState(
    vehicle?.purchaseVatRate != null ? String(vehicle.purchaseVatRate) : ""
  );
  const [saleVatRateInput, setSaleVatRateInput] = useState(
    vehicle?.saleVatRate != null ? String(vehicle.saleVatRate) : ""
  );
  const [commissionRateInput, setCommissionRateInput] = useState(
    String(vehicle?.commissionRate ?? 6)
  );
  const [commissionFixedInput, setCommissionFixedInput] = useState(
    centsToInputValue(vehicle?.commissionFixedExclVatCents)
  );
  const [commissionMinimumInput, setCommissionMinimumInput] = useState(
    vehicle?.commissionMinimumExclVatCents
      ? centsToInputValue(vehicle.commissionMinimumExclVatCents)
      : "2500"
  );

  const parseAmount = (value: string) => {
    const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
  };

  const salePrice = parseAmount(salePriceInput);
  const purchasePrice = parseAmount(purchasePriceInput);
  const purchaseVatRateValue = parseAmount(purchaseVatRateInput);
  const saleVatRateValue = parseAmount(saleVatRateInput);
  const commissionRateValue = parseAmount(commissionRateInput);
  const commissionFixedValue = parseAmount(commissionFixedInput);
  const commissionMinimumValue = parseAmount(commissionMinimumInput);
  const totalCostsCents = totalCostCents ?? 0;

  const purchaseInclVatCents =
    isPurchaseBtw && purchasePriceInput
      ? Math.round(purchasePrice * (1 + purchaseVatRateValue / 100) * 100)
      : null;
  const saleInclVatCents =
    isSaleBtw && salePriceInput
      ? Math.round(salePrice * (1 + saleVatRateValue / 100) * 100)
      : null;

  let grossMarginCents: number | null = null;
  let grossExplanation = "";

  if (isConsignment) {
    if (isFixedCommission) {
      grossMarginCents = Math.round(commissionFixedValue * 100);
      grossExplanation = "Vast commissiebedrag excl. btw.";
    } else {
      const percentageCents = Math.round(
        salePrice * (commissionRateValue / 100) * 100
      );
      const minimumCents = Math.round(commissionMinimumValue * 100);
      grossMarginCents = Math.max(percentageCents, minimumCents);

      grossExplanation =
        percentageCents < minimumCents
          ? `${commissionRateValue || 0}% van de verkoopprijs komt uit op ${formatCurrencyFromCents(percentageCents)}, dat ligt onder het minimum van ${formatCurrencyFromCents(minimumCents)} — het minimum wordt toegepast.`
          : `${commissionRateValue || 0}% van de verkoopprijs excl. btw (minimum ${formatCurrencyFromCents(minimumCents)}).`;
    }
  } else if (!isOnOrder || salePriceInput) {
    grossMarginCents = Math.round((salePrice - purchasePrice) * 100);
    grossExplanation = "Verkoopprijs min aankoopprijs, excl. btw.";
  } else {
    grossExplanation = "Nog niet gekend zolang de verkoopprijs ontbreekt.";
  }

  const netMarginCents =
    grossMarginCents === null ? null : grossMarginCents - totalCostsCents;

  return (
    <form
      action={formAction}
      className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      <input type="hidden" name="vehicleId" value={vehicle?.id ?? ""} />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
            Stockformulier
          </p>
          <h2 className="mt-3 text-2xl font-bold text-black">
            {isEditing ? "Wagen bewerken" : "Nieuwe wagen toevoegen"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/70">
            Beheer stockwagens, consignatie en bestellingen rechtstreeks in het CRM.
          </p>
        </div>

        {isEditing ? (
          <Link
            href={backHref}
            className="rounded-2xl border border-black/15 bg-[#fafafa] px-4 py-3 text-sm font-semibold text-black/80 transition hover:bg-[#e7e7e7] hover:text-black"
          >
            Terug naar stock
          </Link>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-6 rounded-3xl border border-black/10 bg-black px-6 py-5 text-white shadow-sm md:flex-row md:items-stretch md:justify-between md:gap-8">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/55">
            {isConsignment ? "Bruto-commissie" : "Brutomarge"}
          </p>
          <p className="mt-2 text-3xl font-bold">
            {grossMarginCents === null ? "-" : formatCurrencyFromCents(grossMarginCents)}
          </p>
          {grossExplanation ? (
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/70">
              {grossExplanation}
            </p>
          ) : null}
        </div>

        <div className="hidden w-px bg-white/15 md:block" />

        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/55">
            {isConsignment ? "Netto na kosten" : "Nettomarge"}
          </p>
          <p className="mt-2 text-3xl font-bold">
            {netMarginCents === null ? "-" : formatCurrencyFromCents(netMarginCents)}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/70">
            {isEditing
              ? `Brutomarge min de kosten hieronder (${formatCurrencyFromCents(totalCostsCents)}).`
              : "Kosten voeg je toe nadat je de wagen hebt opgeslagen."}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section className="flex flex-col gap-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-black/45">
            Basisgegevens
          </h3>

          <Field label="Type dossier">
            <Select
              name="inventoryType"
              value={inventoryType}
              onChange={(event) => setInventoryType(event.target.value)}
            >
              {inventoryTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          {isOnOrder ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Deze wagen staat <strong>in bestelling</strong> en is nog niet fysiek in
              stock. Het chassisnummer is daarom niet verplicht.
            </div>
          ) : null}

          {isConsignment ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Deze wagen wordt in <strong>consignatie</strong> verkocht. Kies hieronder
              of je commissie een vast bedrag of een percentage is.
            </div>
          ) : null}

          <Field label="Referentienummer">
            <Input name="stockNumber" required defaultValue={vehicle?.stockNumber ?? ""} />
          </Field>

          <Field label="Aankoopdatum / besteldatum">
            <Input
              name="purchaseDate"
              type="date"
              defaultValue={vehicle?.purchaseDate ?? ""}
            />
          </Field>

          <Field label="Merk">
            <Input name="brand" required defaultValue={vehicle?.brand ?? ""} />
          </Field>

          <Field label="Model">
            <Input name="model" required defaultValue={vehicle?.model ?? ""} />
          </Field>

          <Field
            label="Chassisnummer"
            hint={isOnOrder ? "Niet verplicht voor wagens in bestelling." : undefined}
          >
            <Input name="vin" defaultValue={vehicle?.vin ?? ""} required={!isOnOrder} />
          </Field>

          <Field label="Kilometerstand">
            <Input
              name="mileageKm"
              type="number"
              min="0"
              required
              defaultValue={vehicle?.mileageKm ?? ""}
            />
          </Field>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-black/45">
            Financieel
          </h3>

          <Field label="Aankoop btw-type">
            <Select
              name="purchaseVatType"
              value={purchaseVatType}
              onChange={(event) => setPurchaseVatType(event.target.value)}
            >
              {vatTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          {isPurchaseBtw ? (
            <Field label="Aankoop btw-percentage">
              <Input
                name="purchaseVatRate"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={purchaseVatRateInput}
                onChange={(event) => setPurchaseVatRateInput(event.target.value)}
              />
            </Field>
          ) : null}

          <Field label="Verkoop btw-type">
            <Select
              name="saleVatType"
              value={saleVatType}
              onChange={(event) => setSaleVatType(event.target.value)}
            >
              {vatTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          {isSaleBtw ? (
            <Field label="Verkoop btw-percentage">
              <Input
                name="saleVatRate"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={saleVatRateInput}
                onChange={(event) => setSaleVatRateInput(event.target.value)}
              />
            </Field>
          ) : null}

          {isConsignment ? (
            <>
              <Field label="Commissietype">
                <Select
                  name="commissionType"
                  value={commissionType}
                  onChange={(event) => setCommissionType(event.target.value)}
                >
                  {commissionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {isFixedCommission ? (
                <Field label="Vast commissiebedrag excl. btw">
                  <Input
                    name="commissionFixed"
                    inputMode="decimal"
                    required
                    defaultValue={commissionFixedInput}
                    onChange={(event) => setCommissionFixedInput(event.target.value)}
                  />
                </Field>
              ) : (
                <>
                  <Field label="Commissie % excl. btw">
                    <Input
                      name="commissionRate"
                      inputMode="decimal"
                      required
                      defaultValue={commissionRateInput}
                      onChange={(event) => setCommissionRateInput(event.target.value)}
                    />
                  </Field>

                  <Field
                    label="Minimum commissie excl. btw"
                    hint="Wordt toegepast als het percentage lager uitkomt."
                  >
                    <Input
                      name="commissionMinimum"
                      inputMode="decimal"
                      required
                      defaultValue={commissionMinimumInput}
                      onChange={(event) => setCommissionMinimumInput(event.target.value)}
                    />
                  </Field>
                </>
              )}

              <Field
                label="Verkoopprijs excl. btw"
                hint={
                  saleInclVatCents !== null
                    ? `Incl. btw: ${formatCurrencyFromCents(saleInclVatCents)}`
                    : undefined
                }
              >
                <Input
                  name="salePriceExclVat"
                  inputMode="decimal"
                  required
                  defaultValue={salePriceInput}
                  onChange={(event) => setSalePriceInput(event.target.value)}
                />
              </Field>
            </>
          ) : (
            <>
              <Field
                label="Aankoopprijs excl. btw"
                hint={
                  purchaseInclVatCents !== null
                    ? `Incl. btw: ${formatCurrencyFromCents(purchaseInclVatCents)}`
                    : undefined
                }
              >
                <Input
                  name="purchasePriceExclVat"
                  inputMode="decimal"
                  required={!isOnOrder}
                  defaultValue={purchasePriceInput}
                  onChange={(event) => setPurchasePriceInput(event.target.value)}
                />
              </Field>

              <Field
                label="Verkoopprijs excl. btw"
                hint={
                  saleInclVatCents !== null
                    ? `Incl. btw: ${formatCurrencyFromCents(saleInclVatCents)}`
                    : undefined
                }
              >
                <Input
                  name="salePriceExclVat"
                  inputMode="decimal"
                  required={!isOnOrder}
                  defaultValue={salePriceInput}
                  onChange={(event) => setSalePriceInput(event.target.value)}
                />
              </Field>
            </>
          )}

          <Field label="Status">
            <Select name="status" defaultValue={vehicle?.status ?? "AVAILABLE"}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </section>
      </div>

      {state.message ? (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            state.success
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="mt-8">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Wagen wordt opgeslagen..."
            : isEditing
              ? "Wagen bijwerken"
              : "Wagen opslaan"}
        </Button>
      </div>
    </form>
  );
}