"use client";

import { useEffect, useState } from "react";

// Schakelaar dag/nacht. De keuze wordt bewaard in de browser; zonder keuze volgt de
// pagina de instelling van het toestel. Het uiterlijk van de schakelaar zelf wordt met
// CSS bepaald (klasse "dark" op <html>), zodat er niets flikkert bij het laden.
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");

    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);

    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Opslaan mislukt (bv. privé-modus): de keuze geldt dan enkel voor deze pagina.
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Nachtmodus"
      title="Dag / nacht"
      onClick={toggle}
      className="relative inline-flex h-11 w-[4.5rem] shrink-0 items-center rounded-2xl border border-black/10 bg-white px-1.5 transition hover:bg-hover"
    >
      <span className="pointer-events-none flex w-full items-center justify-between px-1.5 text-black/45">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </span>
      <span className="pointer-events-none absolute left-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white shadow transition-transform duration-200 dark:translate-x-[1.75rem]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 dark:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg viewBox="0 0 24 24" className="hidden h-4 w-4 dark:block" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </span>
    </button>
  );
}
