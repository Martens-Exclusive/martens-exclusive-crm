"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { mainNavigation } from "@/lib/navigation";

type AppShellProps = {
  children: React.ReactNode;
  userName?: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, userName }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f3f3f3] text-black">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f8f8f8]/95 backdrop-blur">
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1600px] items-center gap-5 px-4 sm:px-6 lg:px-10">
          <Link href="/dashboard" className="shrink-0">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-black/45">
              Martens Exclusive
            </p>
            <h1 className="mt-1 text-xl font-bold text-black">CRM</h1>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex">
            {mainNavigation.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-black text-white shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
                      : "text-black/65 hover:bg-black/5 hover:text-black"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden w-full max-w-sm lg:block">
            <input
              type="search"
              placeholder="Zoeken..."
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-black/25"
            />
          </div>

          <div className="hidden min-w-0 text-right xl:block">
            <p className="text-xs uppercase tracking-[0.18em] text-black/40">
              Aangemeld als
            </p>
            <p className="truncate text-sm font-semibold text-black">
              {userName || "Gebruiker"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/70 transition hover:bg-[#ececec] hover:text-black"
          >
            Afmelden
          </button>
        </div>

        <nav className="mx-auto flex w-full max-w-[1600px] gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden">
          {mainNavigation.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white text-black/70"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}