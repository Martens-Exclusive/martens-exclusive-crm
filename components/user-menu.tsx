"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

type UserMenuProps = {
  userName?: string;
};

function getInitials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Ronde knop met initialen; onder de knop staat de naam en "Afmelden".
export function UserMenu({ userName }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        title={userName || "Account"}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-xs font-bold tracking-wide text-black transition hover:bg-hover"
      >
        {getInitials(userName)}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
        >
          <div className="border-b border-black/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/40">Aangemeld als</p>
            <p className="mt-1 truncate text-sm font-semibold text-black">{userName || "Gebruiker"}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="block w-full px-4 py-3 text-left text-sm font-semibold text-black/70 transition hover:bg-hover hover:text-black"
          >
            Afmelden
          </button>
        </div>
      ) : null}
    </div>
  );
}
