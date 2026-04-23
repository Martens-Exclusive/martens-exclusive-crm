import { VehicleForm } from "../vehicle-form";

export default function NewStockVehiclePage() {
  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-[#f5f5f5] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">
          Stock
        </p>
        <h1 className="mt-3 text-2xl font-bold text-black">
          Nieuwe stockwagen toevoegen
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-black/70">
          Voeg een nieuwe stockwagen toe in een aparte bewerkpagina, zonder de
          stocklijst open te laten staan.
        </p>
      </section>

      <VehicleForm />
    </main>
  );
}