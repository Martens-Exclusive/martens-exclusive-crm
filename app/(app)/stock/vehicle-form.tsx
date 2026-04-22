"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { saveVehicle, type SaveVehicleState } from "./actions";

type VehicleFormProps = {
  vehicle?: {
    id: string;
    stockNumber: string;
    purchaseDate: string;
    brand: string;
    model: string;
    vin: string;
    mileageKm: number | null;
    purchaseVatType: string | null;
    saleVatType: string | null;
    purchaseVatRate: number | null;
    saleVatRate: number | null;
    purchasePriceExclVatCents: number | null;
    salePriceExclVatCents: number | null;
    costsExclVatCents: number | null;
    status: string;
  } | null;
  backHref?: string;
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

function centsToInputValue(value: number | null) {
  if (value === null) {
    return "";
  }

  return (value / 100).toFixed(2);
}

export function VehicleForm({ vehicle, backHref = "/stock" }: VehicleFormProps) {
  const [state, formAction, isPending] = useActionState(saveVehicle, initialState);
  const isEditing = Boolean(vehicle);
  const [purchaseVatType, setPurchaseVatType] = useState(
    vehicle?.purchaseVatType ?? "BTW_WAGEN"
  );
  const [saleVatType, setSaleVatType] = useState(vehicle?.saleVatType ?? "BTW_WAGEN");
  const [purchaseVatRate, setPurchaseVatRate] = useState(
    vehicle?.purchaseVatType === "MARGE_WAGEN" ? "" : String(vehicle?.purchaseVatRate ?? 21)
  );
  const [saleVatRate, setSaleVatRate] = useState(
    vehicle?.saleVatType === "MARGE_WAGEN" ? "" : String(vehicle?.saleVatRate ?? 21)
  );

  return (
    <form
      action={formAction}
      className="rounded-[28px] border border-white/10 bg-[#0f0f10] p-8"
    >
      <input type="hidden" name="vehicleId" value={vehicle?.id ?? ""} />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/45">
            Stockformulier
          </p>
          <h2 className="mt-3 text-2xl font-bold text-white">
            {isEditing ? "Wagen bewerken" : "Nieuwe wagen toevoegen"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            Beheer je stock rechtstreeks in het CRM, inclusief aankoop, verkoop,
            kosten en automatische nettowinst.
          </p>
        </div>

        {isEditing ? (
          <Link
            href={backHref}
            className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5 hover:text-white"
          >
            Terug naar stock
          </Link>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <Field label="Referentienummer">
          <Input name="stockNumber" required defaultValue={vehicle?.stockNumber ?? ""} />
        </Field>

        <Field label="Aankoopdatum">
          <Input
            name="purchaseDate"
            type="date"
            required
            defaultValue={vehicle?.purchaseDate ?? ""}
          />
        </Field>

        <Field label="Merk">
          <Input name="brand" required defaultValue={vehicle?.brand ?? ""} />
        </Field>

        <Field label="Model">
          <Input name="model" required defaultValue={vehicle?.model ?? ""} />
        </Field>

        <Field label="Chassisnummer">
          <Input name="vin" required defaultValue={vehicle?.vin ?? ""} />
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

        <Field label="Aankoop btw-type">
          <Select
            name="purchaseVatType"
            value={purchaseVatType}
            onChange={(event) => {
              const nextValue = event.target.value;
              setPurchaseVatType(nextValue);

              if (nextValue === "MARGE_WAGEN") {
                setPurchaseVatRate("");
              } else if (purchaseVatRate === "") {
                setPurchaseVatRate("21");
              }
            }}
          >
            {vatTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Aankoop btw-percentage">
          <Input
            name="purchaseVatRate"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required={purchaseVatType === "BTW_WAGEN"}
            value={purchaseVatRate}
            onChange={(event) => setPurchaseVatRate(event.target.value)}
            placeholder={purchaseVatType === "MARGE_WAGEN" ? "Leeg laten voor margewagen" : "21"}
          />
        </Field>

        <Field label="Verkoop btw-type">
          <Select
            name="saleVatType"
            value={saleVatType}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSaleVatType(nextValue);

              if (nextValue === "MARGE_WAGEN") {
                setSaleVatRate("");
              } else if (saleVatRate === "") {
                setSaleVatRate("21");
              }
            }}
          >
            {vatTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Verkoop btw-percentage">
          <Input
            name="saleVatRate"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required={saleVatType === "BTW_WAGEN"}
            value={saleVatRate}
            onChange={(event) => setSaleVatRate(event.target.value)}
            placeholder={saleVatType === "MARGE_WAGEN" ? "Leeg laten voor margewagen" : "21"}
          />
        </Field>

        <Field label="Aankoopprijs excl. btw">
          <Input
            name="purchasePriceExclVat"
            inputMode="decimal"
            required
            defaultValue={centsToInputValue(vehicle?.purchasePriceExclVatCents ?? null)}
          />
        </Field>

        <Field label="Verkoopprijs excl. btw">
          <Input
            name="salePriceExclVat"
            inputMode="decimal"
            required
            defaultValue={centsToInputValue(vehicle?.salePriceExclVatCents ?? null)}
          />
        </Field>

        <Field label="Kosten excl. btw">
          <Input
            name="costsExclVat"
            inputMode="decimal"
            required
            defaultValue={centsToInputValue(vehicle?.costsExclVatCents ?? 0)}
          />
        </Field>

        <Field label="Status">
          <Select name="status" defaultValue={vehicle?.status ?? "AVAILABLE"}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {state.message ? (
        <div
          className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
            state.success
              ? "border border-white/15 bg-white/10 text-white"
              : "border border-white/12 bg-white/5 text-white/80"
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
