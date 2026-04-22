"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import { mainNavigation } from "@/lib/navigation";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-[#0b0d12] lg:w-[280px] lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-6 py-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/35">
                Martens Exclusive
              </p>
              <h1 className="mt-3 text-2xl font-bold text-white">CRM</h1>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Leads, afspraken, taken en stock in één overzichtelijke omgeving.
              </p>
            </div>

            <nav className="mt-10 flex flex-col gap-2">
              {mainNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/5 hover:text-white"
              >
                Afmelden
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}