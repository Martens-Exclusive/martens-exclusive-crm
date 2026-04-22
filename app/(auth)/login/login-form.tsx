"use client";

import { useActionState } from "react";

import { authenticate } from "./actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <Field label="E-mailadres">
        <Input name="email" type="email" placeholder="naam@martensexclusive.be" required />
      </Field>

      <Field label="Wachtwoord">
        <Input name="password" type="password" placeholder="Minstens 8 tekens" required />
      </Field>

      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" className="mt-2" disabled={isPending}>
        {isPending ? "Bezig met inloggen..." : "Inloggen"}
      </Button>
    </form>
  );
}
