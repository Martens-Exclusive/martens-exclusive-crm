"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";

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

function centsToInputValue(value: number | null) {
  if (value === null) {
    return "";
  }

  return (value / 100).toFixed(2);
}

export function VehicleForm({
  vehicle,
  backHref = "/stock"
}: VehicleFormProps) {
  const [state, formAction, isPending] = useActionState(saveVehicle, initialState);
  const isEditing = Boolean(vehicle);

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
            Beheer je stock rechtstreeks in het CRM, inclusief aankoop, verkoop,
            kosten en automatische nettowinst.
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

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section className="flex flex-col gap-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-black/45">
            Basisgegevens
          </h3>

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
        </section>

        <section className="flex flex-col gap-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-black/45">
            Financieel
          </h3>

          <Field label="Aankoop btw-type">
            <Select name="purchaseVatType" defaultValue={vehicle?.purchaseVatType ?? "BTW_WAGEN"}>
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
              defaultValue={vehicle?.purchaseVatRate ?? ""}
            />
          </Field>

          <Field label="Verkoop btw-type">
            <Select name="saleVatType" defaultValue={vehicle?.saleVatType ?? "BTW_WAGEN"}>
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
              defaultValue={vehicle?.saleVatRate ?? ""}
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