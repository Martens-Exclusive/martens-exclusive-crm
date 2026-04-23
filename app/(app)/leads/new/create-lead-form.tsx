"use client";

import { useActionState } from "react";

import { createLead, type CreateLeadState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { LeadPriority, LeadStatus } from "@/lib/lead-status";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Option = {
  value: string;
  label: string;
};

type CreateLeadFormProps = {
  sources: Option[];
  users: Array<{ id: string; firstName: string; lastName: string }>;
  vehicles: Array<{
    id: string;
    brand: string;
    model: string;
    variant: string | null;
    stockNumber: string;
  }>;
  statuses: Array<{ value: LeadStatus; label: string }>;
  priorities: Array<{ value: LeadPriority; label: string }>;
};

const initialState: CreateLeadState = {};

export function CreateLeadForm({
  sources,
  users,
  vehicles,
  statuses,
  priorities
}: CreateLeadFormProps) {
  const [state, formAction, isPending] = useActionState(createLead, initialState);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <section className="rounded-[32px] border border-white/10 bg-white p-8 shadow-[0_20px_60px_rgba(33,32,29,0.08)]">
        <h2 className="text-lg font-semibold text-black">Klantgegevens</h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Voornaam">
            <Input name="firstName" required />
          </Field>
          <Field label="Achternaam">
            <Input name="lastName" required />
          </Field>
          <Field label="Telefoon" hint="Minstens telefoon of e-mail is verplicht.">
            <Input name="phone" />
          </Field>
          <Field label="E-mail" hint="Minstens telefoon of e-mail is verplicht.">
            <Input name="email" type="email" />
          </Field>
        </div>

        <div className="mt-6 grid gap-5">
          <Field label="Bericht van klant">
            <Textarea name="customerMessage" rows={4} />
          </Field>
          <Field label="Interne notities">
            <Textarea name="internalNotes" rows={4} />
          </Field>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white p-8 shadow-[0_20px_60px_rgba(33,32,29,0.08)]">
        <h2 className="text-lg font-semibold text-black">Leadinformatie</h2>

        <div className="mt-6 flex flex-col gap-5">
          <Field label="Bron">
            <Select name="sourceId" required defaultValue="">
              <option value="" disabled>
                Kies een bron
              </option>
              {sources.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Verkoper">
            <Select name="assignedUserId" required defaultValue="">
              <option value="" disabled>
                Kies een verkoper
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Geinteresseerde wagen">
            <Select name="primaryVehicleId" defaultValue="">
              <option value="">Nog niet gekozen</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand} {vehicle.model}
                  {vehicle.variant ? ` ${vehicle.variant}` : ""} ({vehicle.stockNumber})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status">
            <Select name="status" defaultValue="NEW">
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Prioriteit">
            <Select name="priority" defaultValue="NORMAL">
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Volgende opvolging">
            <Input name="nextFollowUpAt" type="datetime-local" required />
          </Field>

          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm text-black">
            <input name="financeInterest" type="checkbox" className="h-4 w-4" />
            Interesse in financiering
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm text-black">
            <input name="tradeInInterest" type="checkbox" className="h-4 w-4" />
            Overname voertuig
          </label>
        </div>

        {state.message ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Lead wordt opgeslagen..." : "Lead opslaan"}
          </Button>
        </div>
      </section>
    </form>
  );
}