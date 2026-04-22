import { VehicleForm } from "../vehicle-form";

export default function NewStockVehiclePage() {
  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-white/10 bg-[#0f0f10] p-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/45">
          Stock
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white">Nieuwe stockwagen toevoegen</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
          Voeg een nieuwe stockwagen toe in een aparte bewerkpagina, zonder de stocklijst open te laten staan.
        </p>
      </section>

      <VehicleForm />
    </main>
  );
}
