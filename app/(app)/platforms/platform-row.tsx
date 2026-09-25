"use client";

import { useActionState, useState } from "react";

import {
  deletePlatform,
  movePlatform,
  updatePlatform,
  type PlatformFormState
} from "./actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type PlatformRowProps = {
  id: string;
  name: string;
  url: string;
  isFirst: boolean;
  isLast: boolean;
};

const initialState: PlatformFormState = {};

export function PlatformRow({ id, name, url, isFirst, isLast }: PlatformRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updatePlatform,
    initialState
  );

  if (isEditing) {
    return (
      <form
        action={formAction}
        className="flex flex-col gap-4 border-b border-black/10 px-6 py-5 last:border-b-0"
      >
        <input type="hidden" name="id" value={id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Naam">
            <Input name="name" defaultValue={name} />

            {state.errors?.name ? (
              <span className="text-xs font-medium text-red-700">
                {state.errors.name[0]}
              </span>
            ) : null}
          </Field>

          <Field label="Link">
            <Input name="url" defaultValue={url} />

            {state.errors?.url ? (
              <span className="text-xs font-medium text-red-700">
                {state.errors.url[0]}
              </span>
            ) : null}
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Bezig met opslaan..." : "Opslaan"}
          </Button>

          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/70 transition hover:bg-[#ececec] hover:text-black"
          >
            Annuleren
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 px-6 py-5 last:border-b-0">
      <div className="min-w-0">
        <p className="font-semibold text-black">{name}</p>
        <p className="mt-1 truncate text-sm text-black/50">{url}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action={movePlatform}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="direction" value="up" />
          <button
            type="submit"
            disabled={isFirst}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#ececec] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Naar boven verplaatsen"
          >
            ↑
          </button>
        </form>

        <form action={movePlatform}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="direction" value="down" />
          <button
            type="submit"
            disabled={isLast}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#ececec] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Naar beneden verplaatsen"
          >
            ↓
          </button>
        </form>

        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#ececec]"
        >
          Bewerken
        </button>

        <form
          action={deletePlatform}
          onSubmit={(event) => {
            if (!window.confirm(`"${name}" verwijderen?`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            Verwijderen
          </button>
        </form>
      </div>
    </div>
  );
}
