"use client";

import { useActionState, useRef, useEffect } from "react";

import { createPlatform, type PlatformFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: PlatformFormState = {};

export function AddPlatformForm() {
  const [state, formAction, isPending] = useActionState(
    createPlatform,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      <h2 className="text-xl font-bold text-black">Platform toevoegen</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        Voeg een link toe naar een ander platform dat je regelmatig gebruikt.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Naam">
          <Input name="name" placeholder="Bv. MyNorgay" />

          {state.errors?.name ? (
            <span className="text-xs font-medium text-red-700">
              {state.errors.name[0]}
            </span>
          ) : null}
        </Field>

        <Field label="Link">
          <Input name="url" placeholder="https://..." />

          {state.errors?.url ? (
            <span className="text-xs font-medium text-red-700">
              {state.errors.url[0]}
            </span>
          ) : null}
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

      <div className="mt-6">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Bezig met toevoegen..." : "Platform toevoegen"}
        </Button>
      </div>
    </form>
  );
}
