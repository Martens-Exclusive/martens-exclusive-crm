"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STORAGE_PLANS, getPlanPriceCents, hasBatteryCheck } from "@/lib/storage";
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
  vehicleLabel: string;
  chassisNumber: string;
  spot: string;
  startDate: string; // YYYY-MM-DD
  batteryCheckedAt: string; // YYYY-MM-DD
  tires: string;
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
  vehicleLabel: "",
  chassisNumber: "",
  spot: "",
  startDate: "",
  batteryCheckedAt: "",
  tires: "",
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
      className="flex flex-col gap-8 rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
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
      </div>

      <div>
        <h2 className="text-lg font-bold text-black">Wagen</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField label="Wagen">
            <Input name="vehicleLabel" defaultValue={values.vehicleLabel} placeholder="Bv. Porsche 911 GT3" />
          </FormField>
          <FormField label="Chassisnummer">
            <Input name="chassisNumber" defaultValue={values.chassisNumber} placeholder="Bv. WP0ZZZ99ZNS000000" />
          </FormField>
          {/* Blijft in het formulier staan (verborgen bij Basic) zodat een bestaande datum niet verdwijnt. */}
          <div className={hasBatteryCheck(plan) ? undefined : "hidden"}>
            <FormField label="Laatste batterij-check">
              <Input name="batteryCheckedAt" type="date" defaultValue={values.batteryCheckedAt} />
            </FormField>
          </div>
          <FormField label="Banden">
            <Input
              name="tires"
              defaultValue={values.tires}
              placeholder="Bv. Pirelli P Zero 20 inch zomer, 6 mm"
            />
          </FormField>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
        {!hasBatteryCheck(plan) ? (
          <p className="mt-3 text-xs text-black/50">
            Batterij-check zit niet in het Basic-pakket en wordt voor deze klant niet opgevolgd.
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
          className="rounded-2xl border border-black/15 bg-[#fafafa] px-6 py-3 text-sm font-semibold text-black/80 transition hover:bg-[#e7e7e7]"
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
