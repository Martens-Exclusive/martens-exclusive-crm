import { prisma } from "@/lib/prisma";
import { AddPlatformForm } from "./add-platform-form";
import { PlatformRow } from "./platform-row";

export default async function PlatformsPage() {
  const platforms = await prisma.platform.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
          Platformen
        </p>
        <h1 className="mt-4 text-3xl font-bold text-black">
          Al je platformen op één plek.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">
          Snel doorklikken naar je andere tools — elke tegel opent in een
          nieuw tabblad. Beheer de lijst onderaan.
        </p>
      </section>

      {platforms.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => (
            <a
              key={platform.id}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[28px] border border-black/10 bg-[#f5f5f5] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition hover:border-black/25 hover:bg-[#ececec]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-bold text-black">{platform.name}</p>

                <span className="text-black/30 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-black/60">
                  ↗
                </span>
              </div>

              <p className="mt-2 truncate text-sm text-black/50">
                {getHostname(platform.url)}
              </p>
            </a>
          ))}
        </section>
      ) : (
        <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 text-center text-sm text-black/55 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          Nog geen platformen toegevoegd. Voeg er hieronder een toe.
        </section>
      )}

      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#f5f5f5] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="border-b border-black/10 px-6 py-5">
          <h2 className="text-lg font-bold text-black">Platformen beheren</h2>
          <p className="mt-1 text-sm text-black/55">
            Wijzig, herschik of verwijder platformen.
          </p>
        </div>

        {platforms.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-black/55">
            Nog geen platformen toegevoegd.
          </p>
        ) : (
          platforms.map((platform, index) => (
            <PlatformRow
              key={platform.id}
              id={platform.id}
              name={platform.name}
              url={platform.url}
              isFirst={index === 0}
              isLast={index === platforms.length - 1}
            />
          ))
        )}
      </section>

      <AddPlatformForm />
    </main>
  );
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
