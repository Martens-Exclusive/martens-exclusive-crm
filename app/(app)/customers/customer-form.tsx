"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CUSTOMER_LANGUAGES, CUSTOMER_TYPES } from "@/lib/customers";
import { saveCustomer, type SaveCustomerState } from "./actions";

export type CustomerFormValues = {
  id: string;
  type: string;
  firstName: string;
  lastName: string;
  companyName: string;
  vatNumber: string;
  email: string;
  email2: string;
  phone: string;
  phone2: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  language: string;
  birthday: string; // YYYY-MM-DD
  mailingOptOut: boolean;
  notes: string;
};

const emptyValues: CustomerFormValues = {
  id: "",
  type: "CUSTOMER",
  firstName: "",
  lastName: "",
  companyName: "",
  vatNumber: "",
  email: "",
  email2: "",
  phone: "",
  phone2: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "België",
  language: "NL",
  birthday: "",
  mailingOptOut: false,
  notes: ""
};

const initialState: SaveCustomerState = {};

const selectClassName =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black/20";

export function CustomerForm({ customer }: { customer?: CustomerFormValues }) {
  const values = customer ?? emptyValues;
  const [state, formAction, isPending] = useActionState(saveCustomer, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-8 rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      <input type="hidden" name="customerId" value={values.id} />

      <div>
        <h2 className="text-lg font-bold text-black">Klant</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <FormField label="Type">
            <select name="type" defaultValue={values.type} className={selectClassName}>
              {CUSTOMER_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Voornaam">
            <Input name="firstName" defaultValue={values.firstName} />
          </FormField>
          <FormField label="Naam">
            <Input name="lastName" defaultValue={values.lastName} />
          </FormField>
          <FormField label="Taal">
            <select name="language" defaultValue={values.language} className={selectClassName}>
              {CUSTOMER_LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Bedrijf">
            <Input name="companyName" defaultValue={values.companyName} />
          </FormField>
          <FormField label="Btw-nummer">
            <Input name="vatNumber" defaultValue={values.vatNumber} placeholder="BE0123456789" />
          </FormField>
          <FormField label="Verjaardag">
            <Input name="birthday" type="date" defaultValue={values.birthday} />
          </FormField>
        </div>
        <p className="mt-3 text-xs text-black/50">
          Klant = heeft al zaken gedaan met Martens Exclusive · Prospect = nog geen aankoop · Relatie = zakelijk
          contact of partner.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-bold text-black">Contact</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField label="E-mail">
            <Input name="email" type="email" defaultValue={values.email} />
          </FormField>
          <FormField label="Tweede e-mail">
            <Input name="email2" type="email" defaultValue={values.email2} />
          </FormField>
          <FormField label="Gsm">
            <Input name="phone" defaultValue={values.phone} placeholder="0474 12 34 56" />
          </FormField>
          <FormField label="Tweede telefoon">
            <Input name="phone2" defaultValue={values.phone2} />
          </FormField>
        </div>
        <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black">
          <input type="checkbox" name="mailingOptOut" defaultChecked={values.mailingOptOut} className="h-5 w-5 accent-black" />
          Wil geen mailings meer ontvangen (uitgeschreven)
        </label>
      </div>

      <div>
        <h2 className="text-lg font-bold text-black">Adres</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr_1fr_2fr_1.5fr]">
          <FormField label="Straat">
            <Input name="street" defaultValue={values.street} />
          </FormField>
          <FormField label="Nr.">
            <Input name="houseNumber" defaultValue={values.houseNumber} />
          </FormField>
          <FormField label="Postcode">
            <Input name="postalCode" defaultValue={values.postalCode} />
          </FormField>
          <FormField label="Gemeente">
            <Input name="city" defaultValue={values.city} />
          </FormField>
          <FormField label="Land">
            <Input name="country" defaultValue={values.country} />
          </FormField>
        </div>
      </div>

      <FormField label="Notities">
        <Textarea
          name="notes"
          rows={4}
          defaultValue={values.notes}
          placeholder="Bv. rijdt een 911 Carrera S, interesse in de rally, partner van ..."
        />
      </FormField>

      {state.message ? (
        <p className="text-sm font-semibold text-red-700">
          {state.message}{" "}
          {state.duplicateId ? (
            <Link href={`/customers/${state.duplicateId}` as Route} className="underline underline-offset-4">
              Open die klantfiche
            </Link>
          ) : null}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl border border-black/15 bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-60"
        >
          {isPending ? "Bezig met opslaan..." : customer ? "Wijzigingen opslaan" : "Klant toevoegen"}
        </button>
        <Link
          href={(customer ? `/customers/${customer.id}` : "/customers") as Route}
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
