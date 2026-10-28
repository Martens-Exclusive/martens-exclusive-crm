"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
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
  const router = useRouter();

  // Zoekbalk bovenaan: Enter opent de leadlijst met de ingetypte zoekterm
  // (zelfde zoekfunctie als het zoekveld op de leadpagina).
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = String(new FormData(event.currentTarget).get("q") ?? "").trim();

    router.push(value ? `/leads?q=${encodeURIComponent(value)}` : "/leads");
  }

  return (
    <div className="min-h-screen bg-page text-black">
      <header className="z-50 border-b border-black/10 bg-header/95 backdrop-blur xl:sticky xl:top-0">
        <div className="mx-auto flex min-h-[64px] w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link href="/dashboard" className="flex shrink-0 items-center">
            <Image
              src="/logo-dark.svg"
              alt="Martens Exclusive"
              width={132}
              height={32}
              priority
              className="h-8 w-auto dark:hidden"
            />
            <Image
              src="/logo-white.png"
              alt="Martens Exclusive"
              width={132}
              height={32}
              priority
              className="hidden h-8 w-auto dark:block"
            />
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
            {mainNavigation.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-black text-white shadow-sm"
                      : "text-black/65 hover:bg-black/5 hover:text-black"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form onSubmit={handleSearch} className="relative hidden w-52 shrink-0 xl:block 2xl:w-64">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              name="q"
              aria-label="Zoek een lead"
              placeholder="Zoek een lead"
              className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-3 text-sm text-black outline-none transition placeholder:text-black/40 focus:border-black/25"
            />
          </form>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <UserMenu userName={userName} />
          </div>
        </div>

        <nav className="mx-auto flex w-full max-w-[1600px] gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-6 lg:px-10 xl:hidden [&::-webkit-scrollbar]:hidden">
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

        <form
          onSubmit={handleSearch}
          className="mx-auto w-full max-w-[1600px] px-4 pb-3 sm:px-6 lg:px-10 xl:hidden"
        >
          <input
            type="search"
            name="q"
            aria-label="Zoek een lead"
            placeholder="Zoek lead op naam, gsm, e-mail..."
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-black/25"
          />
        </form>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}