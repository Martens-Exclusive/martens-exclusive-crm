import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/auth";
import { mainNavigation } from "@/lib/navigation";

export function AppShell({
  children,
  userName
}: {
  children: React.ReactNode;
  userName: string;
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 p-4 md:p-6">
        <aside className="hidden w-72 flex-col rounded-[28px] border border-white/10 bg-[#0f0f10] p-6 md:flex">
          {/* LOGO */}
          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Martens Exclusive" width={42} height={42} />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/45">
                  Martens Exclusive
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">CRM</h2>
              </div>
            </div>
          </div>

          {/* NAV */}
          <nav className="mt-10 flex flex-1 flex-col gap-2">
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

          {/* USER */}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="mt-8"
          >
            <div className="rounded-[24px] border border-white/10 bg-[#141414] p-4">
              <p className="text-sm font-semibold text-white">{userName}</p>
              <p className="mt-1 text-xs text-white/45">Aangemeld</p>

              <button
                type="submit"
                className="mt-4 w-full rounded-2xl border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#d8d8d8]"
              >
                Uitloggen
              </button>
            </div>
          </form>
        </aside>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}