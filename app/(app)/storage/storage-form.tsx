"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BILLING_PERIODS,
  STORAGE_PLANS,
  getInvoiceAmountCents,
  getPlanPriceCents,
  hasChecks
} from "@/lib/storage";
import { formatCurrencyFromCents } from "@/lib/utils";
import { saveStorageContract, type SaveStorageState } from "./actions";

export type StorageFormValues = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isPresent: boolean;
  plan: string;
  monthlyPrice: string; // in euro, bv. "200"
  billingPeriod: string; // MONTHLY | YEARLY
  nextInvoiceAt: string; // YYYY-MM-DD
  invoiceAmount: string; // eigen jaarbedrag in euro, leeg = automatisch
  vehicleLabel: string;
  chassisNumber: string;
  spot: string;
  startDate: string; // YYYY-MM-DD
  batteryCheckedAt: string; // YYYY-MM-DD
  tiresCheckedAt: string; // YYYY-MM-DD
  tirePressureFront: string; // bar, bv. "2,4"
  tirePressureRear: string;
  notes: string;
};

const emptyValues: StorageFormValues = {
  id: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  isPresent: true,
  plan: "PREMIUM",
  monthlyPrice: "200",
  billingPeriod: "MONTHLY",
  nextInvoiceAt: "",
  invoiceAmount: "",
  vehicleLabel: "",
  chassisNumber: "",
  spot: "",
  startDate: "",
  batteryCheckedAt: "",
  tiresCheckedAt: "",
  tirePressureFront: "",
  tirePressureRear: "",
  notes: ""
};

const initialState: SaveStorageState = {};

export function StorageForm({ contract }: { contract?: StorageFormValues }) {
  const values = contract ?? emptyValues;
  const [state, formAction, isPending] = useActionState(saveStorageContract, initialState);
  const [plan, setPlan] = useState(values.plan);
  const [price, setPrice] = useState(values.monthlyPrice);
  const [billing, setBilling] = useState(values.billingPeriod);
  const monthlyNumber = Number(price.replace(",", "."));
  const [invoiceAmount, setInvoiceAmount] = useState(values.invoiceAmount);
  const autoAmount = Number.isFinite(monthlyNumber)
    ? formatCurrencyFromCents(getInvoiceAmountCents(Math.round(monthlyNumber * 100), billing))
    : "";
  const customNumber = Number(invoiceAmount.replace(",", "."));
  const shownAmount =
    billing === "YEARLY" && invoiceAmount.trim() !== "" && Number.isFinite(customNumber)
      ? formatCurrencyFromCents(Math.round(customNumber * 100))
      : autoAmount;

  // Wijzigt het pakket, dan volgt de maandprijs mee zolang je die niet zelf aanpaste.
  function handlePlanChange(nextPlan: string) {
    const oldDefault = String(getPlanPriceCents(plan) / 100);
    if (price === "" || price === oldDefault) {
      setPrice(String(getPlanPriceCents(nextPlan) / 100));
    }
    setPlan(nextPlan);
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-8 rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      <input type="hidden" name="contractId" value={values.id} />

      <div>
        <h2 className="text-lg font-bold text-black">Klant</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField label="Voornaam">
            <Input name="firstName" defaultValue={values.firstName} required />
          </FormField>
          <FormField label="Naam">
            <Input name="lastName" defaultValue={values.lastName} required />
          </FormField>
          <FormField label="Gsm">
            <Input name="phone" defaultValue={values.phone} placeholder="+32 4.. .. .. .." />
          </FormField>
          <FormField label="E-mail">
            <Input name="email" type="email" defaultValue={values.email} />
          </FormField>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-black">Contract</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <FormField label="Pakket">
            <select
              name="plan"
              value={plan}
              onChange={(event) => handlePlanChange(event.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black/20"
            >
              {STORAGE_PLANS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} (€{item.priceCents / 100} per maand)
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Bedrag per maand (€)">
            <Input
              name="monthlyPrice"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="200"
            />
          </FormField>
          <FormField label="Startdatum">
            <Input name="startDate" type="date" defaultValue={values.startDate} />
          </FormField>
          <FormField label="Plaats">
            <Input name="spot" defaultValue={values.spot} placeholder="Bv. 7" />
          </FormField>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <FormField label="Facturatie">
            <select
              name="billingPeriod"
              value={billing}
              onChange={(event) => setBilling(event.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black/20"
            >
              {BILLING_PERIODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </FormField>
          {billing === "YEARLY" ? (
            <FormField label="Bedrag per jaar (€)">
              <Input
                name="invoiceAmount"
                inputMode="decimal"
                value={invoiceAmount}
                onChange={(event) => setInvoiceAmount(event.target.value)}
                placeholder={autoAmount.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3})/g, "")}
              />
              <span className="text-xs text-black/50">
                Leeg = 11 × maandbedrag (1 maand gratis): {autoAmount}
              </span>
            </FormField>
          ) : (
            <FormField label="Bedrag per factuur">
              <div className="rounded-xl border border-black/10 bg-hover px-4 py-3 text-sm font-semibold text-black">
                {shownAmount || "-"}
              </div>
            </FormField>
          )}
          <FormField label="Volgende factuur op">
            <Input name="nextInvoiceAt" type="date" defaultValue={values.nextInvoiceAt} />
          </FormField>
          <p className="self-end pb-3 text-xs text-black/50">
            Leeg laten = eerste factuur op de startdatum. Met &quot;Gefactureerd&quot; in de lijst schuift
            de datum zelf een maand of jaar op.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-black">Wagen</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <FormField label="Wagen">
            <Input name="vehicleLabel" defaultValue={values.vehicleLabel} placeholder="Bv. Porsche 911 GT3" />
          </FormField>
          <FormField label="Chassisnummer">
            <Input name="chassisNumber" defaultValue={values.chassisNumber} placeholder="Bv. WP0ZZZ99ZNS000000" />
          </FormField>
          {/* Blijft in het formulier staan (verborgen bij Basic) zodat een bestaande datum niet verdwijnt. */}
          <div className={hasChecks(plan) ? undefined : "hidden"}>
            <FormField label="Laatste batterij-check">
              <Input name="batteryCheckedAt" type="date" defaultValue={values.batteryCheckedAt} />
            </FormField>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <FormField label="Bandenspanning voor (bar)">
            <Input
              name="tirePressureFront"
              inputMode="decimal"
              defaultValue={values.tirePressureFront}
              placeholder="Bv. 2,4"
            />
          </FormField>
          <FormField label="Bandenspanning achter (bar)">
            <Input
              name="tirePressureRear"
              inputMode="decimal"
              defaultValue={values.tirePressureRear}
              placeholder="Bv. 2,6"
            />
          </FormField>
          <div className={hasChecks(plan) ? undefined : "hidden"}>
            <FormField label="Laatste banden-check">
              <Input name="tiresCheckedAt" type="date" defaultValue={values.tiresCheckedAt} />
            </FormField>
          </div>
        </div>
        <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black">
          <input
            type="checkbox"
            name="isPresent"
            defaultChecked={values.isPresent}
            className="h-5 w-5 accent-black"
          />
          Wagen staat nu in de storage (aanwezig)
        </label>
        {!hasChecks(plan) ? (
          <p className="mt-3 text-xs text-black/50">
            Batterij-check en banden-check zitten niet in het Basic-pakket en worden voor deze klant niet opgevolgd.
          </p>
        ) : null}
        <div className="mt-4">
          <FormField label="Opmerkingen">
            <Textarea
              name="notes"
              rows={4}
              defaultValue={values.notes}
              placeholder="Bv. sleutel in kluis, wagen op laadpaal, ophaling in maart"
            />
          </FormField>
        </div>
      </div>

      {state.message ? <p className="text-sm font-semibold text-red-700">{state.message}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl border border-black/15 bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-60"
        >
          {isPending ? "Bezig met opslaan..." : contract ? "Wijzigingen opslaan" : "Storageklant toevoegen"}
        </button>
        <Link
          href={"/storage" as Route}
          className="rounded-2xl border border-black/15 bg-raised px-6 py-3 text-sm font-semibold text-black/80 transition hover:bg-hover2"
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-black/45">{label}</span>
      {children}
    </label>
  );
}
