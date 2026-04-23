"use client";

import Link from "next/link";
import type { Route } from "next";
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
    purchaseDate: string | null;
    brand: string;
    model: string;
    vin: string | null;
    mileageKm: number | null;
    inventoryType?: string | null;
    commissionRate?: number | null;
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

function centsToInputValue(value: number | null | undefined) {
  if (value === null || value === undefined) {
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

  const [inventoryType, setInventoryType] = useState(
    vehicle?.inventoryType ?? "STOCK"
  );

  const isConsignment = inventoryType === "CONSIGNMENT";
  const isOnOrder = inventoryType === "ON_ORDER";

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
            Beheer je stock, consignatie en bestellingen rechtstreeks in het CRM.
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

          <Field label="Type dossier">
            <Select
              name="inventoryType"
              defaultValue={vehicle?.inventoryType ?? "STOCK"}
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
              Deze wagen wordt in <strong>consignatie</strong> verkocht. De commissie
              wordt berekend op basis van het verkoopbedrag.
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

          {isConsignment ? (
            <>
              <Field label="Commissie % excl. btw">
                <Input
                  name="commissionRate"
                  inputMode="decimal"
                  defaultValue={vehicle?.commissionRate ?? "6"}
                />
              </Field>

              <Field label="Minimum commissie excl. btw">
                <Input
                  name="commissionMinimum"
                  inputMode="decimal"
                  defaultValue={centsToInputValue(
                    vehicle?.commissionMinimumExclVatCents ?? 250000
                  )}
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
                  defaultValue={centsToInputValue(vehicle?.costsExclVatCents ?? 0)}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Aankoopprijs excl. btw">
                <Input
                  name="purchasePriceExclVat"
                  inputMode="decimal"
                  required={!isConsignment}
                  defaultValue={centsToInputValue(
                    vehicle?.purchasePriceExclVatCents ?? null
                  )}
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
                  defaultValue={centsToInputValue(vehicle?.costsExclVatCents ?? 0)}
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