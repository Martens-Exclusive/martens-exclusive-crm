"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type DrawerContextValue = {
  close: (message?: string) => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

const cardChrome =
  "rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]";

// Gebruikt door de formulieren van de leadfiche. In het zijpaneel krijgen ze geen eigen kaartrand
// en sluit het paneel zichzelf na een geslaagde opslag; los op een pagina blijft alles zoals het was.
export function useFormShell(state: { success?: boolean; message?: string }) {
  const drawer = useContext(DrawerContext);

  useEffect(() => {
    if (state.success && drawer) {
      drawer.close(state.message);
    }
    // Enkel reageren wanneer er een nieuw resultaat is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return drawer ? "" : cardChrome;
}

// Voor formulieren die zich anders moeten schikken in het smalle zijpaneel.
export function useInDrawer() {
  return useContext(DrawerContext) !== null;
}

export type FichePanel = {
  key: string;
  label: string;
  node: ReactNode;
  primary?: boolean;
};

// Knoppenrij bovenaan de leadfiche. Elke knop opent het bijhorende formulier in een zijpaneel,
// zodat je niet naar onder moet scrollen om iets in te vullen.
export function FicheActions({ panels, extra }: { panels: FichePanel[]; extra?: ReactNode }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback((message?: string) => {
    setOpenKey(null);

    if (message) {
      setToast(message);

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }

      toastTimer.current = setTimeout(() => setToast(null), 3500);
    }
  }, []);

  useEffect(() => {
    if (!openKey) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenKey(null);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    // Cursor meteen in het eerste invulveld.
    const timer = setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select")
        ?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, [openKey]);

  const active = panels.find((panel) => panel.key === openKey) ?? null;

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {panels.map((panel) => (
          <button
            key={panel.key}
            type="button"
            onClick={() => setOpenKey(panel.key)}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
              panel.primary
                ? "border-black bg-black text-white hover:bg-black/80"
                : "border-black/15 bg-white text-black hover:bg-hover"
            }`}
          >
            {panel.label}
          </button>
        ))}
        {extra}
      </div>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-semibold text-green-700 shadow-[0_12px_30px_rgba(0,0,0,0.2)]"
        >
          {toast}
        </div>
      ) : null}

      {active ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Sluiten"
            onClick={() => setOpenKey(null)}
            className="absolute inset-0 h-full w-full cursor-default bg-[rgb(0_0_0/0.5)]"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={active.label}
            className="absolute right-0 top-0 flex h-full w-full flex-col bg-card shadow-[-20px_0_60px_rgba(0,0,0,0.25)] sm:max-w-lg"
          >
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-black/45">
                {active.label}
              </p>

              <button
                type="button"
                onClick={() => setOpenKey(null)}
                className="rounded-xl border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-hover"
              >
                Sluiten
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <DrawerContext.Provider value={{ close }}>{active.node}</DrawerContext.Provider>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
