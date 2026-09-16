"use client";

import { useActionState, useEffect, useState } from "react";

import { updateLeadInterest, type UpdateLeadInterestState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type EditInterestFormProps = {
  leadId: string;
  interestedBrand: string;
  interestedModel: string;
  financeInterest: boolean;
  tradeInInterest: boolean;
  storageInterest: boolean;
};

const initialState: UpdateLeadInterestState = {};

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

export function EditInterestForm({
  leadId,
  interestedBrand,
  interestedModel,
  financeInterest,
  tradeInInterest,
  storageInterest
}: EditInterestFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateLeadInterest,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
    }
  }, [state.success]);

  const vehicleInterestValue =
    interestedBrand || interestedModel
      ? [interestedBrand, interestedModel].filter(Boolean).join(" ")
      : "-";

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-black">Interesse</h2>

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
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InfoRow label="Merk / model interesse" value={vehicleInterestValue} />
          <InfoRow label="Financiering" value={financeInterest ? "Ja" : "Nee"} />
          <InfoRow label="Overname" value={tradeInInterest ? "Ja" : "Nee"} />
          <InfoRow label="Car Storage" value={storageInterest ? "Ja" : "Nee"} />
        </div>
      ) : (
        <form
          action={formAction}
          className="mt-4 rounded-2xl border border-black/10 bg-[#efefef] p-6"
        >
          <input type="hidden" name="leadId" value={leadId} />

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Merk" hint="Bv. Porsche, ook als die nu niet in stock staat.">
              <Input name="interestedBrand" defaultValue={interestedBrand} />
            </Field>

            <Field label="Model">
              <Input name="interestedModel" defaultValue={interestedModel} />
            </Field>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black">
              <input
                name="financeInterest"
                type="checkbox"
                defaultChecked={financeInterest}
                className="h-4 w-4"
              />
              Interesse in financiering
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black">
              <input
                name="tradeInInterest"
                type="checkbox"
                defaultChecked={tradeInInterest}
                className="h-4 w-4"
              />
              Overname voertuig
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black">
              <input
                name="storageInterest"
                type="checkbox"
                defaultChecked={storageInterest}
                className="h-4 w-4"
              />
              Interesse in Car Storage
            </label>
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
