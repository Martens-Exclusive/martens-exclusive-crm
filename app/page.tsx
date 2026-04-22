export default function HomePage() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <section className="rounded-[32px] border border-brand-sand/70 bg-white/80 p-8 shadow-[0_30px_80px_rgba(33,32,29,0.08)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-brand-bronze">
            Martens Exclusive
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-brand-graphite md:text-6xl">
            Eenvoudig leadbeheer voor snelle dagelijkse opvolging.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-brand-graphite/75 md:text-lg">
            De basis van het CRM staat klaar. Volgende stap: database, login en de
            eerste leadschermen.
          </p>
        </section>
      </div>
    </main>
  );
}
