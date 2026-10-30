import { CustomerForm } from "../customer-form";

export default function NewCustomerPage() {
  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-black/10 bg-card p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-black/55">Klanten</p>
        <h1 className="mt-3 text-2xl font-bold text-black">Nieuwe klant</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-black/70">
          Voor klanten en contacten zonder lead. Wie via een lead of storage-contract binnenkomt, verschijnt
          automatisch in het klantenbestand en hoef je hier niet in te geven.
        </p>
      </section>

      <CustomerForm />
    </main>
  );
}
