"use client";

import { useActionState, useEffect, useState } from "react";

import { updateLeadDetails, type UpdateLeadDetailsState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type EditContactDetailsFormProps = {
  leadId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
};

const initialState: UpdateLeadDetailsState = {};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-black/8 pb-3">
      <p className="text-xs uppercase tracking-[0.2em] text-black/45">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-black">{value}</p>
    </div>
  );
}

export function EditContactDetailsForm({
  leadId,
  firstName,
  lastName,
  phone,
  email,
  street,
  houseNumber,
  postalCode,
  city,
  country
}: EditContactDetailsFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateLeadDetails,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
    }
  }, [state.success]);

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-black">Klantgegevens</h2>

        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#ececec]"
          >
            Wijzig
          </button>
        ) : null}
      </div>

      {!isEditing ? (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <InfoRow label="Voornaam" value={firstName || "-"} />
            <InfoRow label="Achternaam" value={lastName || "-"} />
            <InfoRow label="Telefoon" value={phone || "-"} />
            <InfoRow label="E-mail" value={email || "-"} />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <InfoRow label="Straat" value={street || "-"} />
            <InfoRow label="Huisnummer" value={houseNumber || "-"} />
            <InfoRow label="Postcode" value={postalCode || "-"} />
            <InfoRow label="Gemeente" value={city || "-"} />
            <InfoRow label="Land" value={country || "-"} />
          </div>
        </>
      ) : (
        <form
          action={formAction}
          className="mt-4 rounded-2xl border border-black/10 bg-[#efefef] p-6"
        >
          <input type="hidden" name="leadId" value={leadId} />

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Voornaam">
              <Input name="firstName" defaultValue={firstName} required />
            </Field>

            <Field label="Achternaam">
              <Input name="lastName" defaultValue={lastName} required />
            </Field>

            <Field
              label="Telefoon"
              hint="Minstens telefoon of e-mail is verplicht."
            >
              <Input name="phone" defaultValue={phone} />
            </Field>

            <Field
              label="E-mail"
              hint="Minstens telefoon of e-mail is verplicht."
            >
              <Input name="email" type="email" defaultValue={email} />
            </Field>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-[1fr_0.45fr]">
            <Field label="Straat">
              <Input name="street" defaultValue={street} />
            </Field>

            <Field label="Huisnummer">
              <Input name="houseNumber" defaultValue={houseNumber} />
            </Field>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[0.45fr_1fr]">
            <Field label="Postcode">
              <Input name="postalCode" defaultValue={postalCode} />
            </Field>

            <Field label="Gemeente">
              <Input name="city" defaultValue={city} />
            </Field>
          </div>

          <div className="mt-5">
            <Field label="Land">
              <Input name="country" defaultValue={country} />
            </Field>
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

          <div className="mt-6 flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Opslaan..." : "Opslaan"}
            </Button>

            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-2xl border border-black/15 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ececec]"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
